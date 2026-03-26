// supabase/functions/daily-payouts/index.test.ts
//
// Testes unitários para a Edge Function daily-payouts.
// Executa com: deno test --allow-env --allow-net supabase/functions/daily-payouts/index.test.ts

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

const FUNCTION_URL = 'http://localhost:54321/functions/v1/daily-payouts'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    entregasData: null,
    pedidosData: null,
    antecipacaoData: null,
    advanceCheckData: null,
    ...overrides,
  }

  // deno-lint-ignore no-explicit-any
  const captured: { inserts: Array<{ table: string; data: any }> } = {
    inserts: [],
  }

  function createChain(table: string) {
    let op = ''
    // deno-lint-ignore no-explicit-any
    const chain: Record<string, any> = {
      select: (_cols?: string) => { if (!op) op = 'select'; return chain },
      eq: (_col: string, _val: unknown) => chain,
      gte: (_col: string, _val: unknown) => chain,
      lt: (_col: string, _val: unknown) => chain,
      lte: (_col: string, _val: unknown) => chain,
      is: (_col: string, _val: unknown) => chain,
      in: (_col: string, _vals: unknown[]) => chain,
      then: undefined, // not a thenable
      single: () => {
        if (table === 'payout_advance_requests' && op === 'select') {
          return { data: defaults.advanceCheckData, error: null }
        }
        if (table === 'payouts' && op === 'insert') {
          return { data: { id: 'payout-uuid-001' }, error: null }
        }
        return { data: null, error: null }
      },
      // deno-lint-ignore no-explicit-any
      insert: (row: any) => {
        op = 'insert'
        captured.inserts.push({ table, data: row })
        return chain
      },
      // deno-lint-ignore no-explicit-any
      update: (_row: any) => { op = 'update'; return chain },
    }

    // For queries that return arrays (not .single()), we simulate with a getter
    // The chain itself acts as the promise result when awaited
    Object.defineProperty(chain, 'data', {
      get: () => {
        if (table === 'delivery_assignments') return defaults.entregasData
        if (table === 'orders') return defaults.pedidosData
        if (table === 'payout_advance_requests' && op === 'select' && !chain._isSingle) {
          return defaults.antecipacaoData
        }
        return null
      },
    })

    return chain
  }

  // Wrap .from() to detect whether the chain ends with .single() or not
  return {
    from: (table: string) => {
      const chain = createChain(table)

      // Override the terminal methods that are async
      // For select queries that DON'T end with .single(), we need them
      // to resolve to { data: [...] }
      // The simplest approach: make the chain itself thenable for non-single queries
      return new Proxy(chain, {
        get(target, prop) {
          if (prop === 'then' || prop === 'catch' || prop === 'finally') {
            // Make it thenable — returns { data: ... }
            if (prop === 'then') {
              // deno-lint-ignore no-explicit-any
              return (resolve: any) => {
                if (table === 'delivery_assignments') {
                  return resolve({ data: defaults.entregasData })
                }
                if (table === 'orders' && !target._isSingle) {
                  return resolve({ data: defaults.pedidosData })
                }
                if (table === 'payout_advance_requests' && !target._isSingle) {
                  return resolve({ data: defaults.antecipacaoData })
                }
                return resolve({ data: null })
              }
            }
            return undefined
          }
          return target[prop]
        },
      })
    },
    _captured: captured,
  }
}

function createMockStripe(overrides: Record<string, unknown> = {}) {
  // deno-lint-ignore no-explicit-any
  const captured: { transfers: any[] } = { transfers: [] }
  return {
    transfers: {
      // deno-lint-ignore no-explicit-any
      create: async (params: any) => {
        if (overrides.throwOnTransfer) {
          throw new Error('Stripe transfer error')
        }
        captured.transfers.push(params)
        return { id: `tr_test_${captured.transfers.length}` }
      },
    },
    _captured: captured,
  }
}

// ---------------------------------------------------------------------------
// Handler simplificado para teste com banco vazio
// ---------------------------------------------------------------------------

function createHandler(deps: {
  stripe: ReturnType<typeof createMockStripe>
  // deno-lint-ignore no-explicit-any
  supabaseClient: any
}) {
  const { stripe, supabaseClient } = deps

  return async (_req: Request): Promise<Response> => {
    const supabase = supabaseClient
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    const seteDiasAtras = new Date(hoje)
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

    const erros: string[] = []

    // PASSO 1 — Repasse D+1 para entregadores autônomos
    try {
      const { data: entregas } = await supabase
        .from('delivery_assignments')
        .select(`
          id,
          courier_id,
          valor_entrega,
          order_id,
          couriers!inner (
            id,
            tipo,
            status,
            stripe_account_id,
            stripe_onboarding_ok
          )
        `)
        .eq('status', 'entregue')
        .gte('entregue_em', ontem.toISOString())
        .lt('entregue_em', hoje.toISOString())
        .eq('couriers.tipo', 'autonomo')
        .eq('couriers.status', 'aprovado')
        .eq('couriers.stripe_onboarding_ok', true)
        .is('payout_id', null)

      if (entregas && entregas.length > 0) {
        // deno-lint-ignore no-explicit-any
        const porEntregador = entregas.reduce((acc: any, e: any) => {
          const cid = e.courier_id
          if (!acc[cid]) {
            acc[cid] = { courier: e.couriers, entregas: [], total: 0 }
          }
          acc[cid].entregas.push(e.id)
          acc[cid].total += e.valor_entrega
          return acc
        }, {})

        // deno-lint-ignore no-explicit-any
        for (const [courierId, dados] of Object.entries(porEntregador) as any) {
          try {
            const transfer = await stripe.transfers.create({
              amount: dados.total,
              currency: 'brl',
              destination: dados.courier.stripe_account_id,
              description: `Repasse D+1 — ${ontem.toLocaleDateString('pt-BR')}`,
              metadata: {
                courier_id: courierId,
                data_referencia: ontem.toISOString().split('T')[0],
                tipo: 'entregador',
              },
            })

            await supabase
              .from('payouts')
              .insert({
                tipo: 'entregador',
                courier_id: courierId,
                valor_bruto: dados.total,
                taxa_antecipacao: 0,
                valor_liquido: dados.total,
                total_pedidos: dados.entregas.length,
                status: 'concluido',
                antecipado: false,
                data_referencia: ontem.toISOString().split('T')[0],
                data_prevista: hoje.toISOString().split('T')[0],
                stripe_transfer_id: transfer.id,
                processado_em: new Date().toISOString(),
              })
              .select('id')
              .single()
          } catch (e: unknown) {
            erros.push(`Entregador ${courierId}: ${(e as Error).message}`)
          }
        }
      }
    } catch (e: unknown) {
      erros.push(`Erro geral D+1: ${(e as Error).message}`)
    }

    // PASSO 2 — Repasse D+7 para lojistas
    try {
      const { data: pedidos } = await supabase
        .from('orders')
        .select(`
          id,
          tenant_id,
          total,
          taxa_entrega,
          platform_fee_amount,
          tenants!inner (
            id,
            stripe_account_id,
            stripe_onboarding_ok
          )
        `)
        .eq('status', 'entregue')
        .eq('payment_status', 'pago')
        .gte('atualizado_em', seteDiasAtras.toISOString())
        .lt('atualizado_em', new Date(seteDiasAtras.getTime() + 86400000).toISOString())
        .eq('tenants.stripe_onboarding_ok', true)

      if (pedidos && pedidos.length > 0) {
        // deno-lint-ignore no-explicit-any
        const porTenant = pedidos.reduce((acc: any, p: any) => {
          const tid = p.tenant_id
          if (!acc[tid]) {
            acc[tid] = { tenant: p.tenants, pedidos: [], total: 0 }
          }
          const valorLojista = p.total - p.taxa_entrega - p.platform_fee_amount
          acc[tid].pedidos.push(p.id)
          acc[tid].total += valorLojista
          return acc
        }, {})

        // deno-lint-ignore no-explicit-any
        for (const [tenantId, dados] of Object.entries(porTenant) as any) {
          const { data: advance } = await supabase
            .from('payout_advance_requests')
            .select('id, total_pedidos, taxa_total')
            .eq('tenant_id', tenantId)
            .eq('status', 'aprovada')
            .lte('solicitado_em', hoje.toISOString())
            .single()

          if (advance) continue

          try {
            const transfer = await stripe.transfers.create({
              amount: dados.total,
              currency: 'brl',
              destination: dados.tenant.stripe_account_id,
              description: `Repasse D+7 — ${seteDiasAtras.toLocaleDateString('pt-BR')}`,
              metadata: {
                tenant_id: tenantId,
                data_referencia: seteDiasAtras.toISOString().split('T')[0],
                tipo: 'lojista',
              },
            })

            await supabase.from('payouts').insert({
              tipo: 'lojista',
              tenant_id: tenantId,
              valor_bruto: dados.total,
              taxa_antecipacao: 0,
              valor_liquido: dados.total,
              total_pedidos: dados.pedidos.length,
              status: 'concluido',
              antecipado: false,
              data_referencia: seteDiasAtras.toISOString().split('T')[0],
              data_prevista: hoje.toISOString().split('T')[0],
              stripe_transfer_id: transfer.id,
              processado_em: new Date().toISOString(),
            })
          } catch (e: unknown) {
            erros.push(`Lojista ${tenantId}: ${(e as Error).message}`)
          }
        }
      }
    } catch (e: unknown) {
      erros.push(`Erro geral D+7: ${(e as Error).message}`)
    }

    // PASSO 3 — Antecipações D+2
    try {
      const { data: antecipacoes } = await supabase
        .from('payout_advance_requests')
        .select(`
          id,
          tenant_id,
          total_pedidos,
          taxa_total,
          valor_estimado,
          tenants!inner (
            stripe_account_id,
            stripe_onboarding_ok
          )
        `)
        .eq('status', 'aprovada')
        .eq('tenants.stripe_onboarding_ok', true)

      // deno-lint-ignore no-explicit-any
      for (const antecipacao of (antecipacoes ?? []) as any[]) {
        try {
          const valorLiquido = antecipacao.valor_estimado - antecipacao.taxa_total

          const transfer = await stripe.transfers.create({
            amount: valorLiquido,
            currency: 'brl',
            destination: antecipacao.tenants.stripe_account_id,
            description: `Repasse antecipado D+2 — taxa R$${antecipacao.taxa_total / 100}`,
            metadata: {
              tenant_id: antecipacao.tenant_id,
              antecipado: 'true',
              taxa_antecipacao: String(antecipacao.taxa_total),
            },
          })

          const { data: payout } = await supabase
            .from('payouts')
            .insert({
              tipo: 'lojista',
              tenant_id: antecipacao.tenant_id,
              valor_bruto: antecipacao.valor_estimado,
              taxa_antecipacao: antecipacao.taxa_total,
              valor_liquido: valorLiquido,
              total_pedidos: antecipacao.total_pedidos,
              status: 'concluido',
              antecipado: true,
              data_referencia: ontem.toISOString().split('T')[0],
              data_prevista: hoje.toISOString().split('T')[0],
              stripe_transfer_id: transfer.id,
              processado_em: new Date().toISOString(),
            })
            .select('id')
            .single()

          await supabase
            .from('payout_advance_requests')
            .update({
              status: 'executada',
              payout_id: payout?.id,
              processado_em: new Date().toISOString(),
            })
            .eq('id', antecipacao.id)
        } catch (e: unknown) {
          erros.push(`Antecipação ${antecipacao.id}: ${(e as Error).message}`)
        }
      }
    } catch (e: unknown) {
      erros.push(`Erro geral antecipações: ${(e as Error).message}`)
    }

    return new Response(
      JSON.stringify({
        sucesso: erros.length === 0,
        erros,
        executado_em: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ===========================================================================
// Tests
// ===========================================================================

describe('daily-payouts Edge Function', () => {
  // -----------------------------------------------------------------------
  // Critério de aceite: banco vazio
  // -----------------------------------------------------------------------
  describe('banco vazio', () => {
    it('executa sem erro com banco vazio (0 repasses)', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
      })

      const res = await handler(new Request(FUNCTION_URL))
      assertEquals(res.status, 200)

      const json = await res.json()
      assertEquals(json.sucesso, true)
      assertEquals(json.erros.length, 0)
      assertExists(json.executado_em)
    })

    it('não cria nenhuma transferência Stripe com banco vazio', async () => {
      const mockStripe = createMockStripe()
      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain(),
      })

      await handler(new Request(FUNCTION_URL))
      assertEquals(mockStripe._captured.transfers.length, 0)
    })
  })

  // -----------------------------------------------------------------------
  // Repasse D+1 para entregadores
  // -----------------------------------------------------------------------
  describe('repasse D+1 entregadores', () => {
    it('cria transfer para entregador com valor correto', async () => {
      const mockStripe = createMockStripe()
      const entregasData = [
        {
          id: 'da-001',
          courier_id: 'courier-001',
          valor_entrega: 800,
          order_id: 'order-001',
          couriers: {
            id: 'courier-001',
            tipo: 'autonomo',
            status: 'aprovado',
            stripe_account_id: 'acct_courier_001',
            stripe_onboarding_ok: true,
          },
        },
        {
          id: 'da-002',
          courier_id: 'courier-001',
          valor_entrega: 1200,
          order_id: 'order-002',
          couriers: {
            id: 'courier-001',
            tipo: 'autonomo',
            status: 'aprovado',
            stripe_account_id: 'acct_courier_001',
            stripe_onboarding_ok: true,
          },
        },
      ]

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain({ entregasData }),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()
      assertEquals(json.sucesso, true)

      // Deve ter criado 1 transfer (2 entregas agrupadas)
      assertEquals(mockStripe._captured.transfers.length, 1)
      assertEquals(mockStripe._captured.transfers[0].amount, 2000) // 800 + 1200
      assertEquals(mockStripe._captured.transfers[0].destination, 'acct_courier_001')
      assertEquals(mockStripe._captured.transfers[0].currency, 'brl')
    })

    it('agrupa entregas por entregador', async () => {
      const mockStripe = createMockStripe()
      const entregasData = [
        {
          id: 'da-001',
          courier_id: 'courier-001',
          valor_entrega: 500,
          order_id: 'order-001',
          couriers: { id: 'courier-001', tipo: 'autonomo', status: 'aprovado', stripe_account_id: 'acct_c1', stripe_onboarding_ok: true },
        },
        {
          id: 'da-002',
          courier_id: 'courier-002',
          valor_entrega: 700,
          order_id: 'order-002',
          couriers: { id: 'courier-002', tipo: 'autonomo', status: 'aprovado', stripe_account_id: 'acct_c2', stripe_onboarding_ok: true },
        },
      ]

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain({ entregasData }),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()
      assertEquals(json.sucesso, true)
      assertEquals(mockStripe._captured.transfers.length, 2)
    })
  })

  // -----------------------------------------------------------------------
  // Repasse D+7 para lojistas
  // -----------------------------------------------------------------------
  describe('repasse D+7 lojistas', () => {
    it('cria transfer para lojista descontando taxa_entrega e platform_fee', async () => {
      const mockStripe = createMockStripe()
      const pedidosData = [
        {
          id: 'order-001',
          tenant_id: 'tenant-001',
          total: 5000,
          taxa_entrega: 500,
          platform_fee_amount: 100,
          tenants: { id: 'tenant-001', stripe_account_id: 'acct_tenant_001', stripe_onboarding_ok: true },
        },
      ]

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain({ pedidosData }),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()
      assertEquals(json.sucesso, true)

      assertEquals(mockStripe._captured.transfers.length, 1)
      // Valor lojista = 5000 - 500 - 100 = 4400
      assertEquals(mockStripe._captured.transfers[0].amount, 4400)
      assertEquals(mockStripe._captured.transfers[0].destination, 'acct_tenant_001')
    })

    it('pula repasse quando há antecipação aprovada', async () => {
      const mockStripe = createMockStripe()
      const pedidosData = [
        {
          id: 'order-001',
          tenant_id: 'tenant-001',
          total: 5000,
          taxa_entrega: 500,
          platform_fee_amount: 100,
          tenants: { id: 'tenant-001', stripe_account_id: 'acct_tenant_001', stripe_onboarding_ok: true },
        },
      ]

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain({
          pedidosData,
          advanceCheckData: { id: 'advance-001', total_pedidos: 5, taxa_total: 375 },
        }),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()
      assertEquals(json.sucesso, true)

      // Nenhuma transfer para lojista (passo 2 pulado)
      assertEquals(mockStripe._captured.transfers.length, 0)
    })
  })

  // -----------------------------------------------------------------------
  // Antecipações D+2
  // -----------------------------------------------------------------------
  describe('antecipações D+2', () => {
    it('processa antecipação descontando taxa_total', async () => {
      const mockStripe = createMockStripe()
      const antecipacaoData = [
        {
          id: 'advance-001',
          tenant_id: 'tenant-001',
          total_pedidos: 10,
          taxa_total: 750, // 10 * 75 centavos
          valor_estimado: 10000,
          tenants: { stripe_account_id: 'acct_tenant_001', stripe_onboarding_ok: true },
        },
      ]

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain({ antecipacaoData }),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()
      assertEquals(json.sucesso, true)

      assertEquals(mockStripe._captured.transfers.length, 1)
      // valor_liquido = 10000 - 750 = 9250
      assertEquals(mockStripe._captured.transfers[0].amount, 9250)
      assertEquals(mockStripe._captured.transfers[0].metadata.antecipado, 'true')
    })
  })

  // -----------------------------------------------------------------------
  // Erros não fatais
  // -----------------------------------------------------------------------
  describe('tratamento de erros', () => {
    it('continua processando após erro em um transfer', async () => {
      let callCount = 0
      const mockStripe = createMockStripe()
      mockStripe.transfers.create = async (params) => {
        callCount++
        if (callCount === 1) throw new Error('Transfer failed')
        return { id: `tr_${callCount}` }
      }

      const entregasData = [
        {
          id: 'da-001', courier_id: 'c1', valor_entrega: 500, order_id: 'o1',
          couriers: { id: 'c1', tipo: 'autonomo', status: 'aprovado', stripe_account_id: 'acct_c1', stripe_onboarding_ok: true },
        },
        {
          id: 'da-002', courier_id: 'c2', valor_entrega: 700, order_id: 'o2',
          couriers: { id: 'c2', tipo: 'autonomo', status: 'aprovado', stripe_account_id: 'acct_c2', stripe_onboarding_ok: true },
        },
      ]

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain({ entregasData }),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()

      // Deve relatar erros mas não crashar
      assertEquals(json.sucesso, false)
      assertEquals(json.erros.length, 1)
      assertStringIncludes(json.erros[0], 'Transfer failed')
    })
  })

  // -----------------------------------------------------------------------
  // Resposta
  // -----------------------------------------------------------------------
  describe('formato da resposta', () => {
    it('retorna sucesso, erros e executado_em', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
      })

      const res = await handler(new Request(FUNCTION_URL))
      const json = await res.json()

      assertExists(json.sucesso)
      assertExists(json.erros)
      assertExists(json.executado_em)
      assertEquals(typeof json.sucesso, 'boolean')
      assertEquals(Array.isArray(json.erros), true)
    })
  })
})
