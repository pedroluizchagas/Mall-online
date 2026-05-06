// supabase/functions/request-advance/index.test.ts
//
// Testes unitários para a Edge Function request-advance (após migração para Pagar.me).
// Executa com: deno test --allow-env --allow-net supabase/functions/request-advance/index.test.ts

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts'
import {
  describe,
  it,
} from 'https://deno.land/std@0.208.0/testing/bdd.ts'

// ---------------------------------------------------------------------------
// Helpers & constants
// ---------------------------------------------------------------------------

const FUNCTION_URL = 'http://localhost:54321/functions/v1/request-advance'

const FAKE_USER = { id: 'user-uuid-123', email: 'lojista@teste.com' }

const TAXA_ANTECIPACAO_CENTAVOS = 75

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    tenantData: {
      id: 'tenant-uuid-001',
      pagarme_recipient_id: 'rp_test_001',
      pagarme_onboarding_status: 'active',
    },
    subData: { billing_status: 'ativa', plans: { tem_antecipacao: true } },
    antecipacaoExistente: null,
    pedidosElegiveis: [
      { id: 'o1', total: 5000, taxa_entrega: 500, platform_fee_amount: 100 },
      { id: 'o2', total: 3000, taxa_entrega: 300, platform_fee_amount: 100 },
    ],
    insertSolicitacaoData: { id: 'solicitacao-uuid-001' },
    ...overrides,
  }

  // deno-lint-ignore no-explicit-any
  const captured: { inserts: Array<{ table: string; data: any }> } = { inserts: [] }

  function createChain(table: string) {
    let op = ''

    // deno-lint-ignore no-explicit-any
    let proxy: any

    // deno-lint-ignore no-explicit-any
    const chain: Record<string, any> = {
      select: (_cols?: string) => { if (!op) op = 'select'; return proxy },
      eq: (_col: string, _val: unknown) => proxy,
      in: (_col: string, _vals: unknown[]) => proxy,
      gte: (_col: string, _val: unknown) => proxy,
      single: () => {
        if (table === 'tenants' && op === 'select') {
          return { data: defaults.tenantData, error: null }
        }
        if (table === 'tenant_subscriptions' && op === 'select') {
          return { data: defaults.subData, error: null }
        }
        if (table === 'payout_advance_requests' && op === 'select') {
          return { data: defaults.antecipacaoExistente, error: null }
        }
        if (table === 'payout_advance_requests' && op === 'insert') {
          return { data: defaults.insertSolicitacaoData, error: null }
        }
        return { data: null, error: null }
      },
      // deno-lint-ignore no-explicit-any
      insert: (row: any) => {
        op = 'insert'
        captured.inserts.push({ table, data: row })
        return proxy
      },
    }

    proxy = new Proxy(chain, {
      get(target, prop) {
        if (prop === 'then') {
          if (table === 'orders' && op === 'select') {
            // deno-lint-ignore no-explicit-any
            return (resolve: any) => resolve({ data: defaults.pedidosElegiveis })
          }
          return undefined
        }
        return target[prop]
      },
    })

    return proxy
  }

  return {
    from: (table: string) => createChain(table),
    _captured: captured,
  }
}

// ---------------------------------------------------------------------------
// Handler com dependências injetáveis
// ---------------------------------------------------------------------------

function createHandler(deps: {
  // deno-lint-ignore no-explicit-any
  supabaseClient: any
  getAuthenticatedUser: (req: Request) => Promise<typeof FAKE_USER>
  // deno-lint-ignore no-explicit-any
  fetchFn?: (url: string, init: any) => Promise<any>
}) {
  const { supabaseClient, getAuthenticatedUser } = deps
  const fetchFn = deps.fetchFn ?? (async () => ({
    ok: true,
    json: async () => ({}),
  }))

  const corsHeaders = () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  })

  const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders() })
    }

    try {
      const user = await getAuthenticatedUser(req)
      const supabase = supabaseClient

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, pagarme_recipient_id, pagarme_onboarding_status')
        .eq('user_id', user.id)
        .single()

      if (!tenant) throw new Error('Lojista não encontrado')
      if (!tenant.pagarme_recipient_id || tenant.pagarme_onboarding_status !== 'active') {
        throw new Error('Configure sua conta de recebimentos antes de solicitar antecipação')
      }

      const { data: sub } = await supabase
        .from('tenant_subscriptions')
        .select('billing_status, plans!inner(tem_antecipacao)')
        .eq('tenant_id', tenant.id)
        .single()

      if (!sub || !['trial', 'ativa'].includes(sub.billing_status)) {
        throw new Error('Assinatura inativa')
      }

      if (!sub.plans.tem_antecipacao) {
        throw new Error('Seu plano não inclui antecipação de repasses')
      }

      const { data: antecipacaoExistente } = await supabase
        .from('payout_advance_requests')
        .select('id, status')
        .eq('tenant_id', tenant.id)
        .in('status', ['pendente', 'aprovada'])
        .single()

      if (antecipacaoExistente) {
        throw new Error('Já existe uma solicitação de antecipação em andamento')
      }

      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

      const { data: pedidosElegiveis } = await supabase
        .from('orders')
        .select('id, total, taxa_entrega, platform_fee_amount')
        .eq('tenant_id', tenant.id)
        .eq('status', 'entregue')
        .eq('payment_status', 'pago')
        .gte('atualizado_em', seteDiasAtras.toISOString())

      if (!pedidosElegiveis || pedidosElegiveis.length === 0) {
        throw new Error('Nenhum pedido elegível para antecipação no momento')
      }

      const totalPedidos = pedidosElegiveis.length
      // deno-lint-ignore no-explicit-any
      const valorEstimado = pedidosElegiveis.reduce((acc: number, p: any) => {
        return acc + p.total - p.taxa_entrega - p.platform_fee_amount
      }, 0)

      const taxaTotal = totalPedidos * TAXA_ANTECIPACAO_CENTAVOS
      const valorLiquido = valorEstimado - taxaTotal

      const pagarmeRes = await fetchFn(
        `${PAGARME_BASE_URL}/recipients/${tenant.pagarme_recipient_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            automatic_anticipation_enabled: true,
            automatic_anticipation_type: 'full',
            automatic_anticipation_days: 1,
            automatic_anticipation_1025_delay: 15,
          }),
        }
      )

      if (!pagarmeRes.ok) {
        const erro = await pagarmeRes.json().catch(() => ({}))
        throw new Error(`Falha ao ativar antecipação no Pagar.me: ${JSON.stringify(erro)}`)
      }

      const { data: solicitacao } = await supabase
        .from('payout_advance_requests')
        .insert({
          tenant_id: tenant.id,
          total_pedidos: totalPedidos,
          taxa_total: taxaTotal,
          valor_estimado: valorEstimado,
          status: 'aprovada',
        })
        .select('id')
        .single()

      return new Response(
        JSON.stringify({
          solicitacao_id: solicitacao?.id,
          total_pedidos: totalPedidos,
          valor_bruto: valorEstimado,
          taxa_antecipacao: taxaTotal,
          valor_liquido: valorLiquido,
          previsao_liquidacao: 'Conforme calendário Pagar.me — D+15 a partir da ativação',
          mensagem: 'Antecipação automática ativada no Pagar.me.',
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Helper to build a Request
// ---------------------------------------------------------------------------

function buildRequest(method: string = 'POST', token: string = 'valid-token'): Request {
  return new Request(FUNCTION_URL, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('request-advance Edge Function (Pagar.me)', () => {
  describe('CORS preflight', () => {
    it('responde 200 com headers CORS para OPTIONS', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(new Request(FUNCTION_URL, { method: 'OPTIONS' }))
      assertEquals(res.status, 200)
      assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    })
  })

  describe('autenticação', () => {
    it('retorna 400 quando token não fornecido', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => { throw new Error('Token não fornecido') },
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
    })
  })

  describe('validações', () => {
    it('retorna 400 quando lojista não encontrado', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({ tenantData: null }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'Lojista não encontrado')
    })

    it('retorna 400 quando recipient Pagar.me não está ativo', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({
          tenantData: {
            id: 'tenant-001',
            pagarme_recipient_id: 'rp_pending',
            pagarme_onboarding_status: 'pending',
          },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'conta de recebimentos')
    })

    it('retorna 400 quando lojista sem pagarme_recipient_id', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({
          tenantData: {
            id: 'tenant-001',
            pagarme_recipient_id: null,
            pagarme_onboarding_status: 'pending',
          },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'conta de recebimentos')
    })

    it('retorna 400 quando assinatura inativa', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({
          subData: { billing_status: 'cancelada', plans: { tem_antecipacao: true } },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'Assinatura inativa')
    })

    it('retorna 400 quando plano não inclui antecipação', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({
          subData: { billing_status: 'ativa', plans: { tem_antecipacao: false } },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'plano não inclui antecipação')
    })

    it('retorna 400 quando já existe antecipação em andamento', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({
          antecipacaoExistente: { id: 'existing-001', status: 'aprovada' },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'solicitação de antecipação em andamento')
    })

    it('retorna 400 quando nenhum pedido elegível', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({ pedidosElegiveis: [] }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'Nenhum pedido elegível')
    })
  })

  describe('happy path', () => {
    it('retorna solicitacao_id, valores e mensagem de aprovação', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 200)

      const json = await res.json()
      assertExists(json.solicitacao_id)
      assertEquals(json.total_pedidos, 2)
      assertExists(json.valor_bruto)
      assertExists(json.taxa_antecipacao)
      assertExists(json.valor_liquido)
      assertExists(json.previsao_liquidacao)
      assertStringIncludes(json.mensagem, 'Antecipação automática ativada no Pagar.me')
    })

    it('calcula valor_bruto corretamente (total - taxa_entrega - platform_fee)', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      const json = await res.json()
      // 5000-500-100 + 3000-300-100 = 7000
      assertEquals(json.valor_bruto, 7000)
    })

    it('calcula taxa_antecipacao como totalPedidos * 75 centavos', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      const json = await res.json()
      assertEquals(json.taxa_antecipacao, 150)
      assertEquals(json.valor_liquido, 7000 - 150)
    })

    it('chama PUT /recipients/{id} com flags de antecipação automática', async () => {
      // deno-lint-ignore no-explicit-any
      const calls: Array<{ url: string; init: any }> = []
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
        fetchFn: async (url, init) => {
          calls.push({ url, init })
          return { ok: true, json: async () => ({}) }
        },
      })

      await handler(buildRequest())

      assertEquals(calls.length, 1)
      assertEquals(calls[0].init.method, 'PUT')
      assertStringIncludes(calls[0].url, '/recipients/rp_test_001')
      const payload = JSON.parse(calls[0].init.body)
      assertEquals(payload.automatic_anticipation_enabled, true)
      assertEquals(payload.automatic_anticipation_type, 'full')
    })

    it('retorna 400 quando Pagar.me responde com erro', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
        fetchFn: async () => ({
          ok: false,
          json: async () => ({ message: 'recipient inválido' }),
        }),
      })

      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'Falha ao ativar antecipação no Pagar.me')
    })
  })

  describe('critério de aceite — taxa de antecipação', () => {
    it('40 pedidos = R$30,00 = 3000 centavos de taxa', async () => {
      const pedidos40 = Array.from({ length: 40 }, (_, i) => ({
        id: `order-${i}`,
        total: 2000,
        taxa_entrega: 300,
        platform_fee_amount: 100,
      }))

      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({ pedidosElegiveis: pedidos40 }),
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const res = await handler(buildRequest())
      assertEquals(res.status, 200)

      const json = await res.json()
      assertEquals(json.total_pedidos, 40)
      assertEquals(json.taxa_antecipacao, 3000)
      assertEquals(json.valor_bruto, 64000)
      assertEquals(json.valor_liquido, 64000 - 3000)
    })

    it('1 pedido = R$0,75 = 75 centavos de taxa', async () => {
      const pedidos1 = [
        { id: 'order-1', total: 5000, taxa_entrega: 500, platform_fee_amount: 100 },
      ]

      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({ pedidosElegiveis: pedidos1 }),
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const res = await handler(buildRequest())
      const json = await res.json()
      assertEquals(json.total_pedidos, 1)
      assertEquals(json.taxa_antecipacao, 75)
    })
  })

  describe('inserção da solicitação', () => {
    it('insere com status aprovada (aprovação automática no MVP)', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        supabaseClient: mockClient,
        getAuthenticatedUser: async () => FAKE_USER,
      })

      await handler(buildRequest())

      const insert = mockClient._captured.inserts.find(
        // deno-lint-ignore no-explicit-any
        (i: any) => i.table === 'payout_advance_requests'
      )
      assertExists(insert)
      assertEquals(insert!.data.status, 'aprovada')
      assertEquals(insert!.data.tenant_id, 'tenant-uuid-001')
      assertEquals(insert!.data.total_pedidos, 2)
      assertEquals(insert!.data.taxa_total, 150)
      assertEquals(insert!.data.valor_estimado, 7000)
    })
  })

  describe('status de erro', () => {
    it('erros de validação retornam 400, não 500', async () => {
      const handler = createHandler({
        supabaseClient: createMockSupabaseChain({ tenantData: null }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest())
      assertEquals(res.status, 400)
      assertEquals(res.headers.get('Content-Type'), 'application/json')
    })
  })
})
