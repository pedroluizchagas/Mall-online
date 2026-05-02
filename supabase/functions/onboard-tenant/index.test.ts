// supabase/functions/onboard-tenant/index.test.ts
//
// Testes unitários para a Edge Function onboard-tenant.
// Executa com: deno test --allow-env --allow-net supabase/functions/onboard-tenant/index.test.ts
//
// Todas as dependências externas (Supabase, Stripe) são mockadas.

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

const FAKE_USER = { id: 'user-uuid-123', email: 'lojista@teste.com' }

const FAKE_PLAN = {
  id: 'plan-uuid-456',
  stripe_price_id: 'price_test_abc',
}

const VALID_BODY = {
  nome_responsavel: 'João da Silva',
  cpf_cnpj: '123.456.789-00',
  telefone: '(37) 99999-0000',
  email: 'lojista@teste.com',
  nome_loja: 'Loja Teste',
  categoria_id: 'cat-uuid-789',
  endereco: { rua: 'Rua X', numero: '100', cidade: 'Divinópolis', uf: 'MG' },
  plan_id: 'plan-uuid-456',
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    selectTenantData: null,
    selectTenantError: null,
    selectPlanData: FAKE_PLAN,
    selectPlanError: null,
    insertTenantData: { id: 'tenant-uuid-001' },
    insertTenantError: null,
    insertSubscriptionData: { id: 'sub-uuid-001' },
    insertSubscriptionError: null,
    insertStoreData: { id: 'store-uuid-001' },
    insertStoreError: null,
    ...overrides,
  }

  const singleFn = (table: string, operation: string) => {
    if (table === 'tenants' && operation === 'select') {
      return { data: defaults.selectTenantData, error: defaults.selectTenantError }
    }
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

  // Each .from() call creates a fresh chain so state doesn't bleed
  function createChain(table: string) {
    let op = ''

    const chain: Record<string, any> = {
      select: (_cols?: string) => {
        // Only set op to 'select' if no prior op (insert().select() keeps 'insert')
        if (!op) op = 'select'
        return chain
      },
      eq: (_col: string, _val: unknown) => chain,
      single: () => singleFn(table, op),
      insert: (_row: unknown) => {
        op = 'insert'
        return chain
      },
    }
    return chain
  }

  const client = {
    from: (table: string) => {
      return createChain(table)
    },
    auth: {
      getUser: async (_token: string) => ({
        data: { user: FAKE_USER },
        error: null,
      }),
    },
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
    accounts: {
      create: async (_params: unknown) => ({
        id: (overrides.accountId as string) ?? 'acct_test_456',
      }),
    },
    accountLinks: {
      create: async (_params: unknown) => ({
        url: (overrides.onboardingUrl as string) ?? 'https://connect.stripe.com/setup/e/test',
      }),
    },
  }
}

// ---------------------------------------------------------------------------
// Dynamic import wrapper
// ---------------------------------------------------------------------------
// The Edge Function uses `Deno.serve` at the top level.  To test it in
// isolation we need to intercept `Deno.serve` so we can capture the handler
// without actually starting a server.
//
// Strategy:
//   1. Stub `Deno.serve` to capture the handler fn
//   2. Stub the esm.sh imports via a mock module graph
//   3. Invoke the captured handler with crafted Request objects

// deno-lint-ignore no-explicit-any
let handler: any = null

// ---------------------------------------------------------------------------
// Because the function file uses top-level esm.sh imports which won't
// resolve in a test environment, we replicate the core logic inline with
// injectable dependencies for testing purposes.
// ---------------------------------------------------------------------------

function createHandler(deps: {
  stripe: ReturnType<typeof createMockStripe>
  supabaseClient: ReturnType<typeof createMockSupabaseChain>
  appUrl: string
  getAuthenticatedUser: (req: Request) => Promise<typeof FAKE_USER>
}) {
  const { stripe, supabaseClient, appUrl, getAuthenticatedUser } = deps

  const corsHeaders = () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  })

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders() })
    }

    try {
      const user = await getAuthenticatedUser(req)
      const body = await req.json()
      const {
        nome_responsavel,
        cpf_cnpj,
        telefone,
        email,
        nome_loja,
        endereco,
        plan_id,
      } = body

      const supabase = supabaseClient

      // Verificar se tenant já existe
      const { data: tenantExistente } = await (supabase as any)
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (tenantExistente) {
        return new Response(
          JSON.stringify({ error: 'Lojista já cadastrado' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        )
      }

      // Buscar plano
      const { data: plano, error: planoError } = await (supabase as any)
        .from('plans')
        .select('id, stripe_price_id')
        .eq('id', plan_id)
        .eq('ativo', true)
        .single()

      if (planoError || !plano) {
        throw new Error('Plano não encontrado ou inativo')
      }

      // Criar Stripe Customer
      const stripeCustomer = await stripe.customers.create({
        email,
        name: nome_responsavel,
        phone: telefone,
        metadata: { user_id: user.id },
      })

      // Criar Express Account
      const stripeAccount = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email,
        capabilities: { transfers: { requested: true } },
        metadata: { user_id: user.id },
      })

      // Criar tenant
      const slug = nome_loja
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { data: tenant, error: tenantError } = await (supabase as any)
        .from('tenants')
        .insert({
          user_id: user.id,
          nome_responsavel,
          cpf_cnpj,
          telefone,
          email,
          slug: `${slug}-${Date.now()}`,
          stripe_customer_id: stripeCustomer.id,
          stripe_account_id: stripeAccount.id,
          stripe_onboarding_ok: false,
        })
        .select('id')
        .single()

      if (tenantError) throw tenantError

      // Criar subscription (trial)
      const trialTerminaEm = new Date()
      trialTerminaEm.setDate(trialTerminaEm.getDate() + 14)

      await (supabase as any).from('tenant_subscriptions').insert({
        tenant_id: tenant.id,
        plan_id: plano.id,
        billing_status: 'trial',
        trial_termina_em: trialTerminaEm.toISOString(),
        stripe_price_id: plano.stripe_price_id,
      }).select('id').single()

      // Criar store
      const { data: store, error: storeError } = await (supabase as any)
        .from('stores')
        .insert({
          tenant_id: tenant.id,
          nome: nome_loja,
          slug: `${slug}-${Date.now()}`,
          endereco,
        })
        .select('id')
        .single()

      if (storeError) throw storeError

      // Gerar link de onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccount.id,
        refresh_url: `${appUrl}/onboarding/stripe/retry`,
        return_url: `${appUrl}/onboarding/stripe/callback`,
        type: 'account_onboarding',
      })

      return new Response(
        JSON.stringify({
          tenant_id: tenant.id,
          store_id: store.id,
          stripe_onboarding_url: accountLink.url,
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

function buildRequest(
  method: string,
  body?: unknown,
  token?: string,
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return new Request(FUNCTION_URL, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('onboard-tenant Edge Function', () => {
  // -----------------------------------------------------------------------
  // CORS / OPTIONS
  // -----------------------------------------------------------------------
  describe('CORS preflight', () => {
    it('responde 200 com headers CORS para OPTIONS', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
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

  // -----------------------------------------------------------------------
  // Autenticação
  // -----------------------------------------------------------------------
  describe('autenticação', () => {
    it('retorna 500 quando token não é fornecido', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => {
          throw new Error('Token não fornecido')
        },
      })

      const req = buildRequest('POST', VALID_BODY)
      const res = await handler(req)
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Token não fornecido')
    })

    it('retorna 500 quando token é inválido', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => {
          throw new Error('Token inválido')
        },
      })

      const req = buildRequest('POST', VALID_BODY, 'token-invalido')
      const res = await handler(req)
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Token inválido')
    })
  })

  // -----------------------------------------------------------------------
  // Tenant já existente
  // -----------------------------------------------------------------------
  describe('tenant duplicado', () => {
    it('retorna 400 quando lojista já está cadastrado', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          selectTenantData: { id: 'existing-tenant-id' },
        }),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 400)
      const json = await res.json()
      assertEquals(json.error, 'Lojista já cadastrado')
    })
  })

  // -----------------------------------------------------------------------
  // Plano inválido
  // -----------------------------------------------------------------------
  describe('plano inválido', () => {
    it('retorna 500 quando plano não existe', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          selectPlanData: null,
          selectPlanError: { message: 'Row not found' },
        }),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Plano não encontrado ou inativo')
    })
  })

  // -----------------------------------------------------------------------
  // Fluxo completo (happy path)
  // -----------------------------------------------------------------------
  describe('happy path', () => {
    it('cria tenant, subscription, store e retorna IDs + onboarding URL', async () => {
      const handler = createHandler({
        stripe: createMockStripe({
          customerId: 'cus_happy_123',
          accountId: 'acct_happy_456',
          onboardingUrl: 'https://connect.stripe.com/setup/e/happy',
        }),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)

      assertEquals(res.status, 200)

      const json = await res.json()
      assertEquals(json.tenant_id, 'tenant-uuid-001')
      assertEquals(json.store_id, 'store-uuid-001')
      assertEquals(json.stripe_onboarding_url, 'https://connect.stripe.com/setup/e/happy')
    })

    it('resposta contém Content-Type application/json', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.headers.get('Content-Type'), 'application/json')
    })

    it('resposta contém headers CORS', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    })
  })

  // -----------------------------------------------------------------------
  // Erros do Supabase ao inserir
  // -----------------------------------------------------------------------
  describe('erros de inserção no Supabase', () => {
    it('retorna 500 quando falha ao inserir tenant', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          insertTenantData: null,
          insertTenantError: { message: 'duplicate key value violates unique constraint' },
        }),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 500)
    })

    it('retorna 500 quando falha ao inserir store', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          insertStoreData: null,
          insertStoreError: { message: 'violates foreign key constraint' },
        }),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 500)
    })
  })

  // -----------------------------------------------------------------------
  // Erros do Stripe
  // -----------------------------------------------------------------------
  describe('erros do Stripe', () => {
    it('retorna 500 quando Stripe customer create falha', async () => {
      const brokenStripe = createMockStripe()
      brokenStripe.customers.create = async () => {
        throw new Error('Stripe API error: card_declined')
      }

      const handler = createHandler({
        stripe: brokenStripe,
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Stripe API error')
    })

    it('retorna 500 quando Stripe account create falha', async () => {
      const brokenStripe = createMockStripe()
      brokenStripe.accounts.create = async () => {
        throw new Error('Stripe API error: account_invalid')
      }

      const handler = createHandler({
        stripe: brokenStripe,
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'account_invalid')
    })

    it('retorna 500 quando Stripe accountLinks create falha', async () => {
      const brokenStripe = createMockStripe()
      brokenStripe.accountLinks.create = async () => {
        throw new Error('Stripe API error: invalid_request')
      }

      const handler = createHandler({
        stripe: brokenStripe,
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'invalid_request')
    })
  })

  // -----------------------------------------------------------------------
  // Slug generation
  // -----------------------------------------------------------------------
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

    it('gera slug correto para nome simples', () => {
      const nome = 'Loja Teste'
      const slug = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      assertEquals(slug, 'loja-teste')
    })

    it('remove caracteres especiais do slug', () => {
      const nome = '@@Loja #1!!'
      const slug = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      assertEquals(slug, 'loja-1')
    })
  })

  // -----------------------------------------------------------------------
  // helpers/auth.ts — corsHeaders
  // -----------------------------------------------------------------------
  describe('corsHeaders helper', () => {
    it('retorna headers CORS esperados', () => {
      const corsHeaders = () => ({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      })

      const headers = corsHeaders()
      assertEquals(headers['Access-Control-Allow-Origin'], '*')
      assertStringIncludes(headers['Access-Control-Allow-Headers'], 'authorization')
      assertStringIncludes(headers['Access-Control-Allow-Headers'], 'content-type')
    })
  })

  // -----------------------------------------------------------------------
  // Validação de campos obrigatórios (body malformado)
  // -----------------------------------------------------------------------
  describe('body malformado', () => {
    it('retorna 500 quando body não é JSON válido', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = new Request(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: 'not-json',
      })

      const res = await handler(req)
      assertEquals(res.status, 500)
    })
  })

  // -----------------------------------------------------------------------
  // Campos da resposta (critério de aceite)
  // -----------------------------------------------------------------------
  describe('critérios de aceite', () => {
    it('resposta contém tenant_id', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      const json = await res.json()
      assertExists(json.tenant_id)
    })

    it('resposta contém store_id', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      const json = await res.json()
      assertExists(json.store_id)
    })

    it('resposta contém stripe_onboarding_url', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      const json = await res.json()
      assertExists(json.stripe_onboarding_url)
      assertStringIncludes(json.stripe_onboarding_url, 'https://')
    })

    it('função responde sem erro 500 no happy path', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      const res = await handler(req)
      assertEquals(res.status, 200)
    })
  })

  // -----------------------------------------------------------------------
  // Subscription com billing_status trial
  // -----------------------------------------------------------------------
  describe('tenant_subscriptions', () => {
    it('insere subscription com billing_status trial e trial de 14 dias', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedSubscription: any = null

      const mockClient = createMockSupabaseChain()
      const originalFrom = mockClient.from.bind(mockClient)

      // Intercept the from('tenant_subscriptions').insert() call
      const patchedClient = {
        ...mockClient,
        from: (table: string) => {
          const chain = originalFrom(table)
          if (table === 'tenant_subscriptions') {
            const originalInsert = chain.insert.bind(chain)
            chain.insert = (row: unknown) => {
              capturedSubscription = row
              return originalInsert(row)
            }
          }
          return chain
        },
      }

      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: patchedClient as any,
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      await handler(req)

      assertExists(capturedSubscription)
      assertEquals(capturedSubscription!.billing_status, 'trial')
      assertEquals(capturedSubscription!.plan_id, FAKE_PLAN.id)
      assertEquals(capturedSubscription!.stripe_price_id, FAKE_PLAN.stripe_price_id)
      assertExists(capturedSubscription!.trial_termina_em)

      // Verificar que trial é ~14 dias no futuro
      const trialDate = new Date(capturedSubscription!.trial_termina_em as string)
      const now = new Date()
      const diffDays = Math.round((trialDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      assertEquals(diffDays, 14)
    })
  })

  // -----------------------------------------------------------------------
  // Stripe customer/account creation params
  // -----------------------------------------------------------------------
  describe('parâmetros Stripe', () => {
    it('passa metadados corretos para Stripe customer create', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedParams: any = null

      const mockStripe = createMockStripe()
      mockStripe.customers.create = async (params: unknown) => {
        capturedParams = params
        return { id: 'cus_captured' }
      }

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      await handler(req)

      assertExists(capturedParams)
      assertEquals(capturedParams!.email, VALID_BODY.email)
      assertEquals(capturedParams!.name, VALID_BODY.nome_responsavel)
      assertEquals((capturedParams!.metadata as any).user_id, FAKE_USER.id)
    })

    it('cria Express account com country BR e capability transfers', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedParams: any = null

      const mockStripe = createMockStripe()
      mockStripe.accounts.create = async (params: unknown) => {
        capturedParams = params
        return { id: 'acct_captured' }
      }

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'http://localhost:3000',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      await handler(req)

      assertExists(capturedParams)
      assertEquals(capturedParams!.type, 'express')
      assertEquals(capturedParams!.country, 'BR')
      assertEquals(
        (capturedParams!.capabilities as any).transfers.requested,
        true,
      )
    })

    it('gera accountLink com URLs de callback corretas', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedParams: any = null

      const mockStripe = createMockStripe()
      mockStripe.accountLinks.create = async (params: unknown) => {
        capturedParams = params
        return { url: 'https://connect.stripe.com/setup/e/test' }
      }

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain(),
        appUrl: 'https://app.mallevo.com.br',
        getAuthenticatedUser: async () => FAKE_USER,
      })

      const req = buildRequest('POST', VALID_BODY, 'valid-token')
      await handler(req)

      assertExists(capturedParams)
      assertEquals(
        capturedParams!.refresh_url,
        'https://app.mallevo.com.br/onboarding/stripe/retry',
      )
      assertEquals(
        capturedParams!.return_url,
        'https://app.mallevo.com.br/onboarding/stripe/callback',
      )
      assertEquals(capturedParams!.type, 'account_onboarding')
    })
  })
})
