// supabase/functions/create-subscription/index.test.ts
//
// Testes unitários para a Edge Function create-subscription.
// Executa com: deno test --allow-env --allow-net supabase/functions/create-subscription/index.test.ts

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

const FUNCTION_URL = 'http://localhost:54321/functions/v1/create-subscription'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    tenantData: { stripe_customer_id: 'cus_test_123', pagarme_onboarding_status: 'active' },
    subData: {
      stripe_price_id: 'price_test_abc',
      stripe_subscription_id: null,
      trial_termina_em: new Date(Date.now() + 14 * 86400000).toISOString(),
    },
    updateResult: { error: null },
    ...overrides,
  }

  function createChain(table: string) {
    let op = ''
    // deno-lint-ignore no-explicit-any
    const chain: Record<string, any> = {
      select: (_cols?: string) => { if (!op) op = 'select'; return chain },
      eq: (_col: string, _val: unknown) => chain,
      single: () => {
        if (table === 'tenants' && op === 'select') {
          return { data: defaults.tenantData, error: null }
        }
        if (table === 'tenant_subscriptions' && op === 'select') {
          return { data: defaults.subData, error: null }
        }
        return { data: null, error: null }
      },
      update: (_row: unknown) => { op = 'update'; return chain },
    }
    return chain
  }

  return {
    from: (table: string) => createChain(table),
  }
}

function createMockStripe(overrides: Record<string, unknown> = {}) {
  const trialStart = Math.floor(Date.now() / 1000)
  const trialEnd = trialStart + 30 * 86400

  return {
    subscriptions: {
      // deno-lint-ignore no-explicit-any
      create: async (_params: any) => ({
        id: (overrides.subscriptionId as string) ?? 'sub_test_123',
        status: (overrides.subscriptionStatus as string) ?? 'trialing',
        current_period_start: trialStart,
        current_period_end: trialEnd,
        latest_invoice: {
          payment_intent: { client_secret: 'pi_secret' },
        },
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
}) {
  const { stripe, supabaseClient } = deps

  const corsHeaders = () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  })

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders() })
    }

    try {
      const body = await req.json()
      const { tenant_id } = body

      const supabase = supabaseClient

      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id, pagarme_onboarding_status')
        .eq('id', tenant_id)
        .single()

      if (!tenant || tenant.pagarme_onboarding_status !== 'active') {
        throw new Error('Onboarding Pagar.me incompleto — finalize o KYC antes de assinar')
      }

      const { data: sub } = await supabase
        .from('tenant_subscriptions')
        .select('stripe_price_id, stripe_subscription_id, trial_termina_em')
        .eq('tenant_id', tenant_id)
        .single()

      if (!sub || !sub.stripe_price_id) {
        throw new Error('Assinatura ou price não encontrado')
      }

      if (sub.stripe_subscription_id) {
        return new Response(
          JSON.stringify({ message: 'Subscription já existe' }),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        )
      }

      const trialEnd = sub.trial_termina_em
        ? Math.floor(new Date(sub.trial_termina_em).getTime() / 1000)
        : undefined

      const subscription = await stripe.subscriptions.create({
        customer: tenant.stripe_customer_id,
        items: [{ price: sub.stripe_price_id }],
        trial_end: trialEnd,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      })

      await supabase
        .from('tenant_subscriptions')
        .update({
          stripe_subscription_id: subscription.id,
          billing_status: subscription.status === 'trialing' ? 'trial' : 'ativa',
          periodo_inicio: new Date(subscription.current_period_start * 1000).toISOString(),
          periodo_fim: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('tenant_id', tenant_id)

      return new Response(
        JSON.stringify({ subscription_id: subscription.id }),
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

function buildRequest(body?: unknown): Request {
  return new Request(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer service-role-key',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('create-subscription Edge Function', () => {
  // -----------------------------------------------------------------------
  // CORS
  // -----------------------------------------------------------------------
  describe('CORS preflight', () => {
    it('responde 200 com headers CORS para OPTIONS', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
      })
      const res = await handler(new Request(FUNCTION_URL, { method: 'OPTIONS' }))
      assertEquals(res.status, 200)
      assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    })
  })

  // -----------------------------------------------------------------------
  // Validações
  // -----------------------------------------------------------------------
  describe('validações', () => {
    it('retorna 500 quando tenant não encontrado', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({ tenantData: null }),
      })
      const res = await handler(buildRequest({ tenant_id: 'invalid' }))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Onboarding Pagar.me incompleto')
    })

    it('retorna 500 quando onboarding Pagar.me está em registration', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          tenantData: { stripe_customer_id: 'cus_test', pagarme_onboarding_status: 'registration' },
        }),
      })
      const res = await handler(buildRequest({ tenant_id: 'tenant-001' }))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Onboarding Pagar.me incompleto')
    })

    it('retorna 500 quando onboarding Pagar.me está em affiliation (não-active)', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          tenantData: { stripe_customer_id: 'cus_test', pagarme_onboarding_status: 'affiliation' },
        }),
      })
      const res = await handler(buildRequest({ tenant_id: 'tenant-001' }))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'finalize o KYC')
    })

    it('retorna 500 quando stripe_price_id não encontrado', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          subData: { stripe_price_id: null, stripe_subscription_id: null, trial_termina_em: null },
        }),
      })
      const res = await handler(buildRequest({ tenant_id: 'tenant-001' }))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Assinatura ou price não encontrado')
    })

    it('retorna 200 com mensagem quando subscription já existe', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          subData: {
            stripe_price_id: 'price_test',
            stripe_subscription_id: 'sub_existing_123',
            trial_termina_em: null,
          },
        }),
      })
      const res = await handler(buildRequest({ tenant_id: 'tenant-001' }))
      assertEquals(res.status, 200)
      const json = await res.json()
      assertEquals(json.message, 'Subscription já existe')
    })
  })

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------
  describe('happy path', () => {
    it('cria subscription no Stripe e retorna subscription_id', async () => {
      const handler = createHandler({
        stripe: createMockStripe({ subscriptionId: 'sub_happy_123' }),
        supabaseClient: createMockSupabaseChain(),
      })
      const res = await handler(buildRequest({ tenant_id: 'tenant-001' }))
      assertEquals(res.status, 200)
      const json = await res.json()
      assertEquals(json.subscription_id, 'sub_happy_123')
    })

    it('passa customer e price_id corretos para Stripe', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedParams: any = null
      const mockStripe = createMockStripe()
      // deno-lint-ignore no-explicit-any
      mockStripe.subscriptions.create = async (params: any) => {
        capturedParams = params
        return {
          id: 'sub_captured',
          status: 'trialing',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        }
      }

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain(),
      })
      await handler(buildRequest({ tenant_id: 'tenant-001' }))

      assertExists(capturedParams)
      assertEquals(capturedParams.customer, 'cus_test_123')
      assertEquals(capturedParams.items[0].price, 'price_test_abc')
      assertEquals(capturedParams.payment_behavior, 'default_incomplete')
    })

    it('atualiza billing_status para trial quando subscription está trialing', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedUpdate: any = null
      const mockClient = createMockSupabaseChain()
      const originalFrom = mockClient.from.bind(mockClient)

      const patchedClient = {
        from: (table: string) => {
          const chain = originalFrom(table)
          if (table === 'tenant_subscriptions') {
            const originalUpdate = chain.update.bind(chain)
            chain.update = (row: unknown) => {
              capturedUpdate = row
              return originalUpdate(row)
            }
          }
          return chain
        },
      }

      const handler = createHandler({
        stripe: createMockStripe({ subscriptionStatus: 'trialing' }),
        supabaseClient: patchedClient,
      })
      await handler(buildRequest({ tenant_id: 'tenant-001' }))

      assertExists(capturedUpdate)
      assertEquals(capturedUpdate.billing_status, 'trial')
      assertExists(capturedUpdate.periodo_inicio)
      assertExists(capturedUpdate.periodo_fim)
    })

    it('atualiza billing_status para ativa quando subscription está active', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedUpdate: any = null
      const mockClient = createMockSupabaseChain()
      const originalFrom = mockClient.from.bind(mockClient)

      const patchedClient = {
        from: (table: string) => {
          const chain = originalFrom(table)
          if (table === 'tenant_subscriptions') {
            const originalUpdate = chain.update.bind(chain)
            chain.update = (row: unknown) => {
              capturedUpdate = row
              return originalUpdate(row)
            }
          }
          return chain
        },
      }

      const handler = createHandler({
        stripe: createMockStripe({ subscriptionStatus: 'active' }),
        supabaseClient: patchedClient,
      })
      await handler(buildRequest({ tenant_id: 'tenant-001' }))

      assertExists(capturedUpdate)
      assertEquals(capturedUpdate.billing_status, 'ativa')
    })
  })

  // -----------------------------------------------------------------------
  // Erros do Stripe
  // -----------------------------------------------------------------------
  describe('erros do Stripe', () => {
    it('retorna 500 quando Stripe subscriptions.create falha', async () => {
      const brokenStripe = createMockStripe()
      brokenStripe.subscriptions.create = async () => {
        throw new Error('Stripe API error: card_declined')
      }
      const handler = createHandler({
        stripe: brokenStripe,
        supabaseClient: createMockSupabaseChain(),
      })
      const res = await handler(buildRequest({ tenant_id: 'tenant-001' }))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'card_declined')
    })
  })
})
