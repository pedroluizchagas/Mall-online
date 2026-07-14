// supabase/functions/onboard-tenant/index.test.ts
//
// Testes unitários para a Edge Function onboard-tenant (após migração para Pagar.me).
// Executa com: deno test --allow-env --allow-net supabase/functions/onboard-tenant/index.test.ts

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

const FUNCTION_URL = 'http://localhost:54321/functions/v1/onboard-tenant'

const FAKE_PLAN = {
  id: 'plan-uuid-456',
  stripe_price_id: 'price_test_abc',
}

const VALID_BODY_BASE = {
  nome_responsavel: 'João da Silva',
  cpf_cnpj: '123.456.789-00',
  telefone: '(37) 99999-0000',
  email: 'lojista@teste.com',
  senha: 's3nh@-segura',
  nome_loja: 'Loja Teste',
  categoria_id: 'cat-uuid-789',
  endereco: { rua: 'Rua X', numero: '100', cidade: 'Divinópolis', uf: 'MG' },
  plan_id: 'plan-uuid-456',
}

const VALID_BODY_PIX = {
  ...VALID_BODY_BASE,
  dados_bancarios: {
    tipo: 'pix',
    chave_pix: 'lojista@teste.com',
    tipo_chave: 'email',
  },
}

const VALID_BODY_CONTA = {
  ...VALID_BODY_BASE,
  dados_bancarios: {
    tipo: 'conta_bancaria',
    banco: '341',
    agencia: '0001',
    conta: '12345',
    digito: '6',
    tipo_conta: 'checking',
  },
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    selectPlanData: FAKE_PLAN,
    selectPlanError: null,
    insertTenantData: { id: 'tenant-uuid-001' },
    insertTenantError: null,
    insertSubscriptionData: { id: 'sub-uuid-001' },
    insertSubscriptionError: null,
    insertStoreData: { id: 'store-uuid-001' },
    insertStoreError: null,
    storesLikeData: [],
    createUserResult: {
      data: { user: { id: 'user-uuid-novo' } },
      error: null,
    },
    ...overrides,
  }

  // deno-lint-ignore no-explicit-any
  const captured: { inserts: Array<{ table: string; data: any }> } = { inserts: [] }

  const singleFn = (table: string, operation: string) => {
    if (table === 'plans' && operation === 'select') {
      return { data: defaults.selectPlanData, error: defaults.selectPlanError }
    }
    if (table === 'tenants' && operation === 'insert') {
      return { data: defaults.insertTenantData, error: defaults.insertTenantError }
    }
    if (table === 'tenant_subscriptions' && operation === 'insert') {
      return { data: defaults.insertSubscriptionData, error: defaults.insertSubscriptionError }
    }
    if (table === 'stores' && operation === 'insert') {
      return { data: defaults.insertStoreData, error: defaults.insertStoreError }
    }
    return { data: null, error: null }
  }

  function createChain(table: string) {
    let op = ''

    // deno-lint-ignore no-explicit-any
    const chain: Record<string, any> = {
      select: (_cols?: string) => {
        if (!op) op = 'select'
        return chain
      },
      eq: (_col: string, _val: unknown) => chain,
      like: (_col: string, _val: unknown) => {
        if (table === 'stores' && op === 'select') {
          return Promise.resolve({ data: defaults.storesLikeData })
        }
        return chain
      },
      single: () => singleFn(table, op),
      // deno-lint-ignore no-explicit-any
      insert: (row: any) => {
        op = 'insert'
        captured.inserts.push({ table, data: row })
        return chain
      },
    }
    return chain
  }

  const client = {
    from: (table: string) => createChain(table),
    auth: {
      admin: {
        createUser: async (_args: unknown) =>
          defaults.createUserResult as { data: { user: { id: string } }; error: unknown },
        deleteUser: async (_id: string) => ({ data: null, error: null }),
        updateUserById: async (_id: string, _args: unknown) => ({ data: null, error: null }),
      },
    },
    rpc: async (_fn: string, _args: unknown) => ({ data: null, error: null }),
    _captured: captured,
  }

  return client
}

function createMockStripe(overrides: Record<string, unknown> = {}) {
  return {
    customers: {
      create: async (_params: unknown) => ({
        id: (overrides.customerId as string) ?? 'cus_test_123',
      }),
    },
  }
}

// ---------------------------------------------------------------------------
// Handler com dependências injetáveis
// ---------------------------------------------------------------------------

function createHandler(deps: {
  stripe: ReturnType<typeof createMockStripe>
  // deno-lint-ignore no-explicit-any
  supabaseClient: any
  // deno-lint-ignore no-explicit-any
  fetchFn?: (url: string, init: any) => Promise<any>
}) {
  const { stripe, supabaseClient } = deps
  const fetchFn = deps.fetchFn ?? (async () => ({
    ok: true,
    json: async () => ({ id: 'rp_test_default', status: 'active' }),
  }))

  const corsHeaders = () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  })

  const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5'

  // Espelha a whitelist/normalização de theme da function real.
  const PRESETS_VALIDOS = new Set([
    'heritage', 'raw', 'editorial', 'noir', 'soft', 'artisan',
    'clinic', 'tech', 'market', 'utility', 'playful',
  ])
  function themeValido(t: unknown): { v: 2; preset: string } | null {
    if (!t || typeof t !== 'object') return null
    const preset = (t as Record<string, unknown>).preset
    if (typeof preset !== 'string' || !PRESETS_VALIDOS.has(preset)) return null
    return { v: 2, preset }
  }

  // deno-lint-ignore no-explicit-any
  function buildRecipientPayload(args: any) {
    const { nome_responsavel, email, cpf_cnpj, dados_bancarios } = args
    const documentDigits = String(cpf_cnpj).replace(/\D/g, '')
    const type = documentDigits.length <= 11 ? 'individual' : 'company'

    const base = { name: nome_responsavel, email, document: cpf_cnpj, type }

    if (dados_bancarios.tipo === 'pix') {
      return {
        ...base,
        payment_mode: 'pix',
        pix_key: dados_bancarios.chave_pix,
        pix_key_type: dados_bancarios.tipo_chave,
      }
    }

    return {
      ...base,
      default_bank_account: {
        holder_name: nome_responsavel,
        holder_document: cpf_cnpj,
        bank: dados_bancarios.banco,
        branch_number: dados_bancarios.agencia,
        account_number: dados_bancarios.conta,
        account_check_digit: dados_bancarios.digito,
        type: dados_bancarios.tipo_conta,
      },
    }
  }

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders() })
    }

    try {
      const body = await req.json()
      const {
        nome_responsavel,
        cpf_cnpj,
        telefone,
        email,
        senha,
        nome_loja,
        categoria_id,
        endereco,
        plan_id,
        dados_bancarios,
        theme,
      } = body

      if (!email || !senha) {
        return new Response(
          JSON.stringify({ error: 'Email e senha são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        )
      }

      const supabase = supabaseClient

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: nome_responsavel, role: 'tenant' },
      })

      if (authError) throw authError
      const userId = authData.user.id

      const { data: plano, error: planoError } = await supabase
        .from('plans')
        .select('id, stripe_price_id')
        .eq('id', plan_id)
        .eq('ativo', true)
        .single()

      if (planoError || !plano) throw new Error('Plano não encontrado ou inativo')

      const stripeCustomer = await stripe.customers.create({
        email,
        name: nome_responsavel,
        phone: telefone,
        metadata: { user_id: userId },
      })

      // Recipient Pagar.me só quando o payload traz dados bancários (espelha
      // a function real: dados_bancarios é opcional no onboarding).
      let pagarmeRecipientId: string | null = null
      let pagarmeRecipientStatus = 'pending'
      let pagarmeKycLink: string | null = null

      if (dados_bancarios && dados_bancarios.tipo) {
        const recipientPayload = buildRecipientPayload({
          nome_responsavel,
          email,
          cpf_cnpj,
          dados_bancarios,
        })

        const pagarmeRes = await fetchFn(`${PAGARME_BASE_URL}/recipients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipientPayload),
        })

        const pagarmeData = await pagarmeRes.json()
        if (!pagarmeRes.ok) {
          throw new Error(`Pagar.me recipient: ${JSON.stringify(pagarmeData)}`)
        }

        pagarmeRecipientId = pagarmeData.id
        pagarmeRecipientStatus = pagarmeData.status ?? 'pending'
        pagarmeKycLink = pagarmeData.kyc_link ?? null
      }

      const baseSlug = nome_loja
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          user_id: userId,
          nome_responsavel,
          cpf_cnpj,
          telefone,
          email,
          slug: `${baseSlug}-${Date.now()}`,
          stripe_customer_id: stripeCustomer.id,
          pagarme_recipient_id: pagarmeRecipientId,
          pagarme_onboarding_status: pagarmeRecipientStatus,
        })
        .select('id')
        .single()

      if (tenantError) throw tenantError

      const trialTerminaEm = new Date()
      trialTerminaEm.setDate(trialTerminaEm.getDate() + 15)

      await supabase.from('tenant_subscriptions').insert({
        tenant_id: tenant.id,
        plan_id: plano.id,
        billing_status: 'trial',
        trial_termina_em: trialTerminaEm.toISOString(),
        stripe_price_id: plano.stripe_price_id,
      })

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          tenant_id: tenant.id,
          nome: nome_loja,
          slug: baseSlug,
          endereco,
          categoria_id: categoria_id ?? null,
          theme: themeValido(theme),
        })
        .select('id')
        .single()

      if (storeError) throw storeError

      let createSubscriptionCalled = false
      if (pagarmeRecipientStatus === 'active') {
        await fetchFn('http://localhost/functions/v1/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: tenant.id }),
        })
        createSubscriptionCalled = true
      }

      return new Response(
        JSON.stringify({
          tenant_id: tenant.id,
          store_id: store.id,
          store_slug: baseSlug,
          pagarme_recipient_id: pagarmeRecipientId,
          pagarme_recipient_status: pagarmeRecipientStatus,
          kyc_link: pagarmeKycLink,
          create_subscription_called: createSubscriptionCalled,
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Helper to build a Request
// ---------------------------------------------------------------------------

function buildRequest(method: string, body?: unknown): Request {
  return new Request(FUNCTION_URL, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('onboard-tenant Edge Function (Pagar.me + Stripe Billing)', () => {
  describe('CORS preflight', () => {
    it('responde 200 com headers CORS para OPTIONS', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
      })

      const res = await handler(new Request(FUNCTION_URL, { method: 'OPTIONS' }))
      assertEquals(res.status, 200)
      assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
      assertStringIncludes(
        res.headers.get('Access-Control-Allow-Headers') ?? '',
        'authorization',
      )
    })
  })

  describe('validação de campos obrigatórios', () => {
    it('retorna 400 quando email faltando', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
      })

      const res = await handler(buildRequest('POST', {
        ...VALID_BODY_PIX,
        email: '',
      }))
      assertEquals(res.status, 400)
      const json = await res.json()
      assertStringIncludes(json.error, 'Email e senha')
    })

    it('sem dados_bancarios: onboarding SEGUE — recipient nulo, sem chamada Pagar.me', async () => {
      // O wizard atual não coleta dados bancários: o tenant nasce com
      // recipient pendente e configura recebimentos depois no dashboard.
      // deno-lint-ignore no-explicit-any
      const calls: Array<{ url: string; init: any }> = []
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: mockClient,
        fetchFn: async (url, init) => {
          calls.push({ url, init })
          return { ok: true, json: async () => ({}) }
        },
      })

      const { dados_bancarios: _omit, ...semDados } = VALID_BODY_PIX
      const res = await handler(buildRequest('POST', semDados))
      assertEquals(res.status, 200)

      const json = await res.json()
      assertEquals(json.pagarme_recipient_id, null)
      assertEquals(json.pagarme_recipient_status, 'pending')
      assertEquals(json.create_subscription_called, false)

      // Nenhuma chamada ao Pagar.me nem à create-subscription.
      assertEquals(calls.length, 0)

      const tenantInsert = mockClient._captured.inserts.find(
        // deno-lint-ignore no-explicit-any
        (i: any) => i.table === 'tenants'
      )
      assertExists(tenantInsert)
      assertEquals(tenantInsert!.data.pagarme_recipient_id, null)
      assertEquals(tenantInsert!.data.pagarme_onboarding_status, 'pending')
    })
  })

  describe('theme (StoreTheme v2) no INSERT da loja', () => {
    it('grava {v:2, preset} quando o preset é um dos 11 arquétipos', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: mockClient,
      })

      await handler(buildRequest('POST', {
        ...VALID_BODY_PIX,
        theme: { v: 2, preset: 'heritage', color: { accent: '#FF0000' } },
      }))

      const storeInsert = mockClient._captured.inserts.find(
        // deno-lint-ignore no-explicit-any
        (i: any) => i.table === 'stores'
      )
      assertExists(storeInsert)
      // Só {v, preset} passam — overrides não são aceitos na criação.
      assertEquals(storeInsert!.data.theme, { v: 2, preset: 'heritage' })
    })

    it('preset inválido ou theme ausente → null (aparência Mallevo default)', async () => {
      for (const theme of [{ v: 2, preset: 'xpto' }, 'hack', undefined]) {
        const mockClient = createMockSupabaseChain()
        const handler = createHandler({
          stripe: createMockStripe(),
          supabaseClient: mockClient,
        })

        await handler(buildRequest('POST', { ...VALID_BODY_PIX, theme }))

        const storeInsert = mockClient._captured.inserts.find(
          // deno-lint-ignore no-explicit-any
          (i: any) => i.table === 'stores'
        )
        assertExists(storeInsert)
        assertEquals(storeInsert!.data.theme, null)
      }
    })
  })

  describe('plano inválido', () => {
    it('retorna 500 quando plano não existe', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          selectPlanData: null,
          selectPlanError: { message: 'Row not found' },
        }),
      })

      const res = await handler(buildRequest('POST', VALID_BODY_PIX))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Plano não encontrado ou inativo')
    })
  })

  describe('happy path — recipient ativo (PJ)', () => {
    it('cria recipient Pagar.me + customer Stripe e dispara create-subscription', async () => {
      // deno-lint-ignore no-explicit-any
      const calls: Array<{ url: string; init: any }> = []
      const handler = createHandler({
        stripe: createMockStripe({ customerId: 'cus_happy_123' }),
        supabaseClient: createMockSupabaseChain(),
        fetchFn: async (url, init) => {
          calls.push({ url, init })
          if (url.includes('/recipients')) {
            return {
              ok: true,
              json: async () => ({ id: 'rp_active_001', status: 'active' }),
            }
          }
          return { ok: true, json: async () => ({}) }
        },
      })

      const res = await handler(buildRequest('POST', VALID_BODY_CONTA))
      assertEquals(res.status, 200)

      const json = await res.json()
      assertEquals(json.tenant_id, 'tenant-uuid-001')
      assertEquals(json.store_id, 'store-uuid-001')
      assertEquals(json.pagarme_recipient_id, 'rp_active_001')
      assertEquals(json.pagarme_recipient_status, 'active')
      assertEquals(json.create_subscription_called, true)

      // Confirma chamadas: 1) POST /recipients  2) create-subscription
      assertEquals(calls.length, 2)
      assertStringIncludes(calls[0].url, '/recipients')
      assertEquals(calls[0].init.method, 'POST')
      const recipientPayload = JSON.parse(calls[0].init.body)
      assertEquals(recipientPayload.default_bank_account.bank, '341')
      assertEquals(recipientPayload.default_bank_account.account_number, '12345')

      assertStringIncludes(calls[1].url, '/functions/v1/create-subscription')
    })
  })

  describe('happy path — recipient pending (PF aguardando KYC)', () => {
    it('persiste status pending e NÃO dispara create-subscription', async () => {
      // deno-lint-ignore no-explicit-any
      const calls: Array<{ url: string; init: any }> = []
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        fetchFn: async (url, init) => {
          calls.push({ url, init })
          if (url.includes('/recipients')) {
            return {
              ok: true,
              json: async () => ({
                id: 'rp_pending_001',
                status: 'pending',
                kyc_link: 'https://pagar.me/kyc/abc',
              }),
            }
          }
          return { ok: true, json: async () => ({}) }
        },
      })

      const res = await handler(buildRequest('POST', VALID_BODY_PIX))
      assertEquals(res.status, 200)

      const json = await res.json()
      assertEquals(json.pagarme_recipient_id, 'rp_pending_001')
      assertEquals(json.pagarme_recipient_status, 'pending')
      assertEquals(json.kyc_link, 'https://pagar.me/kyc/abc')
      assertEquals(json.create_subscription_called, false)

      // Apenas a chamada POST /recipients foi feita
      assertEquals(calls.length, 1)
      assertStringIncludes(calls[0].url, '/recipients')
    })

    it('envia payload Pix correto quando dados_bancarios.tipo === "pix"', async () => {
      // deno-lint-ignore no-explicit-any
      const calls: Array<{ url: string; init: any }> = []
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        fetchFn: async (url, init) => {
          calls.push({ url, init })
          return {
            ok: true,
            json: async () => ({ id: 'rp_pix_001', status: 'pending' }),
          }
        },
      })

      await handler(buildRequest('POST', VALID_BODY_PIX))

      const recipientCall = calls.find((c) => c.url.includes('/recipients'))
      assertExists(recipientCall)
      const payload = JSON.parse(recipientCall!.init.body)
      assertEquals(payload.payment_mode, 'pix')
      assertEquals(payload.pix_key, 'lojista@teste.com')
      assertEquals(payload.pix_key_type, 'email')
    })
  })

  describe('persistência em tenants', () => {
    it('salva pagarme_recipient_id e pagarme_onboarding_status', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: mockClient,
        fetchFn: async (url) => {
          if (url.includes('/recipients')) {
            return {
              ok: true,
              json: async () => ({ id: 'rp_persisted_001', status: 'pending' }),
            }
          }
          return { ok: true, json: async () => ({}) }
        },
      })

      await handler(buildRequest('POST', VALID_BODY_PIX))

      const tenantInsert = mockClient._captured.inserts.find(
        // deno-lint-ignore no-explicit-any
        (i: any) => i.table === 'tenants'
      )
      assertExists(tenantInsert)
      assertEquals(tenantInsert!.data.pagarme_recipient_id, 'rp_persisted_001')
      assertEquals(tenantInsert!.data.pagarme_onboarding_status, 'pending')
      assertEquals(tenantInsert!.data.stripe_customer_id, 'cus_test_123')
    })
  })

  describe('erros do Pagar.me', () => {
    it('retorna 500 quando POST /recipients falha', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        fetchFn: async () => ({
          ok: false,
          json: async () => ({ message: 'invalid document' }),
        }),
      })

      const res = await handler(buildRequest('POST', VALID_BODY_PIX))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Pagar.me recipient')
    })
  })

  describe('erros do Stripe', () => {
    it('retorna 500 quando Stripe customer create falha', async () => {
      const brokenStripe = createMockStripe()
      brokenStripe.customers.create = async () => {
        throw new Error('Stripe API error: card_declined')
      }

      const handler = createHandler({
        stripe: brokenStripe,
        supabaseClient: createMockSupabaseChain(),
      })

      const res = await handler(buildRequest('POST', VALID_BODY_PIX))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Stripe API error')
    })
  })

  describe('subscription com billing_status trial', () => {
    it('insere subscription com billing_status trial e trial de 15 dias', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: mockClient,
        fetchFn: async () => ({
          ok: true,
          json: async () => ({ id: 'rp_trial_001', status: 'pending' }),
        }),
      })

      await handler(buildRequest('POST', VALID_BODY_PIX))

      const subInsert = mockClient._captured.inserts.find(
        // deno-lint-ignore no-explicit-any
        (i: any) => i.table === 'tenant_subscriptions'
      )
      assertExists(subInsert)
      assertEquals(subInsert!.data.billing_status, 'trial')
      assertEquals(subInsert!.data.plan_id, FAKE_PLAN.id)
      assertEquals(subInsert!.data.stripe_price_id, FAKE_PLAN.stripe_price_id)
      assertExists(subInsert!.data.trial_termina_em)

      const trialDate = new Date(subInsert!.data.trial_termina_em as string)
      const now = new Date()
      const diffDays = Math.round((trialDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      assertEquals(diffDays, 15)
    })
  })

  describe('geração de slug', () => {
    it('gera slug correto para nome com acentos e espaços', () => {
      const nome = 'Café & Pães da Vovó'
      const slug = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      assertEquals(slug, 'cafe-paes-da-vovo')
    })
  })
})
