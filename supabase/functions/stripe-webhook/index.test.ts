// supabase/functions/stripe-webhook/index.test.ts
//
// Testes unitários para a Edge Function stripe-webhook.
// Executa com: deno test --allow-env --allow-net supabase/functions/stripe-webhook/index.test.ts

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

const FUNCTION_URL = 'http://localhost:54321/functions/v1/stripe-webhook'

// ---------------------------------------------------------------------------
// mapSubscriptionStatus — réplica para testes
// ---------------------------------------------------------------------------

function mapSubscriptionStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'ativa',
    trialing: 'trial',
    past_due: 'em_atraso',
    canceled: 'cancelada',
    unpaid: 'em_atraso',
    incomplete: 'trial',
    incomplete_expired: 'cancelada',
  }
  return map[status] ?? 'em_atraso'
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    tenantData: { id: 'tenant-uuid-001' },
    courierData: null,
    ...overrides,
  }

  // deno-lint-ignore no-explicit-any
  const captured: { updates: Array<{ table: string; data: any; filter: any }> } = {
    updates: [],
  }

  function createChain(table: string) {
    let op = ''
    // deno-lint-ignore no-explicit-any
    let pendingUpdate: any = null
    // deno-lint-ignore no-explicit-any
    const chain: Record<string, any> = {
      select: (_cols?: string) => { if (!op) op = 'select'; return chain },
      eq: (_col: string, _val: unknown) => {
        if (op === 'update') {
          captured.updates.push({ table, data: pendingUpdate, filter: { [_col]: _val } })
        }
        return chain
      },
      single: () => {
        if (table === 'tenants' && op === 'select') {
          return { data: defaults.tenantData, error: null }
        }
        if (table === 'couriers' && op === 'select') {
          return { data: defaults.courierData, error: null }
        }
        return { data: null, error: null }
      },
      // deno-lint-ignore no-explicit-any
      update: (row: any) => {
        op = 'update'
        pendingUpdate = row
        return chain
      },
    }
    return chain
  }

  return {
    from: (table: string) => createChain(table),
    _captured: captured,
  }
}

// deno-lint-ignore no-explicit-any
type StripeEvent = { type: string; data: { object: any } }

function createMockStripe(overrides: Record<string, unknown> = {}) {
  return {
    webhooks: {
      constructEvent: (_body: string, _sig: string, _secret: string): StripeEvent => {
        if (overrides.throwOnConstruct) {
          throw new Error('Invalid signature')
        }
        return overrides.event as StripeEvent
      },
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
  supabaseUrl?: string
  serviceRoleKey?: string
  // deno-lint-ignore no-explicit-any
  fetchFn?: (url: string, init: any) => Promise<any>
}) {
  const { stripe, supabaseClient } = deps
  const supabaseUrl = deps.supabaseUrl ?? 'http://localhost:54321'
  const serviceRoleKey = deps.serviceRoleKey ?? 'fake-service-role-key'
  const fetchFn = deps.fetchFn ?? (async () => ({ ok: true }))

  return async (req: Request): Promise<Response> => {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    let event: StripeEvent

    try {
      event = stripe.webhooks.constructEvent(body, signature!, 'whsec_test')
    } catch {
      return new Response('Assinatura inválida', { status: 400 })
    }

    const supabase = supabaseClient

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object
          await supabase
            .from('orders')
            .update({
              payment_status: 'pago',
              forma_pagamento: pi.payment_method_types[0] === 'pix'
                ? 'online_pix'
                : 'online_cartao',
            })
            .eq('stripe_payment_intent_id', pi.id)
          break
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object
          await supabase
            .from('orders')
            .update({
              status: 'cancelado',
              payment_status: 'pendente',
              motivo_cancelamento: 'Falha no pagamento',
              cancelado_em: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', pi.id)
          break
        }

        case 'account.updated': {
          const account = event.data.object
          const onboardingOk =
            account.charges_enabled &&
            account.payouts_enabled &&
            account.details_submitted

          if (onboardingOk) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id')
              .eq('stripe_account_id', account.id)
              .single()

            if (tenant) {
              await supabase
                .from('tenants')
                .update({ stripe_onboarding_ok: true })
                .eq('id', tenant.id)

              await fetchFn(`${supabaseUrl}/functions/v1/create-subscription`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({ tenant_id: tenant.id }),
              })
            }

            const { data: courier } = await supabase
              .from('couriers')
              .select('id')
              .eq('stripe_account_id', account.id)
              .single()

            if (courier) {
              await supabase
                .from('couriers')
                .update({ stripe_onboarding_ok: true })
                .eq('id', courier.id)
            }
          }
          break
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object
          const billingStatus = mapSubscriptionStatus(sub.status)

          await supabase
            .from('tenant_subscriptions')
            .update({
              billing_status: billingStatus,
              periodo_inicio: new Date(sub.current_period_start * 1000).toISOString(),
              periodo_fim: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', sub.id)
          break
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object
          await supabase
            .from('tenant_subscriptions')
            .update({
              billing_status: 'cancelada',
              cancelado_em: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', sub.id)
          break
        }

        case 'invoice.paid': {
          const invoice = event.data.object
          if (invoice.subscription) {
            await supabase
              .from('tenant_subscriptions')
              .update({ billing_status: 'ativa' })
              .eq('stripe_subscription_id', invoice.subscription)
          }
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object
          if (invoice.subscription) {
            await supabase
              .from('tenant_subscriptions')
              .update({ billing_status: 'em_atraso' })
              .eq('stripe_subscription_id', invoice.subscription)
          }
          break
        }

        default:
          break
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Erro ao processar webhook:', error)
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500 }
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Helper to build a webhook Request
// ---------------------------------------------------------------------------

function buildWebhookRequest(body: string = '{}'): Request {
  return new Request(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test_sig_123',
    },
    body,
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('stripe-webhook Edge Function', () => {
  // -----------------------------------------------------------------------
  // Assinatura inválida
  // -----------------------------------------------------------------------
  describe('verificação de assinatura', () => {
    it('retorna 400 quando assinatura do webhook é inválida', async () => {
      const handler = createHandler({
        stripe: createMockStripe({ throwOnConstruct: true }),
        supabaseClient: createMockSupabaseChain(),
      })
      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 400)
      const text = await res.text()
      assertStringIncludes(text, 'Assinatura inválida')
    })
  })

  // -----------------------------------------------------------------------
  // payment_intent.succeeded
  // -----------------------------------------------------------------------
  describe('payment_intent.succeeded', () => {
    it('atualiza payment_status para pago com cartão', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_123',
                payment_method_types: ['card'],
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)
      const json = await res.json()
      assertEquals(json.received, true)

      // Verificar que update foi chamado
      const updates = mockClient._captured.updates
      const orderUpdate = updates.find((u) => u.table === 'orders')
      assertExists(orderUpdate)
      assertEquals(orderUpdate!.data.payment_status, 'pago')
      assertEquals(orderUpdate!.data.forma_pagamento, 'online_cartao')
    })

    it('atualiza forma_pagamento para online_pix quando pix', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_pix',
                payment_method_types: ['pix'],
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      await handler(buildWebhookRequest())
      const updates = mockClient._captured.updates
      const orderUpdate = updates.find((u) => u.table === 'orders')
      assertExists(orderUpdate)
      assertEquals(orderUpdate!.data.forma_pagamento, 'online_pix')
    })
  })

  // -----------------------------------------------------------------------
  // payment_intent.payment_failed
  // -----------------------------------------------------------------------
  describe('payment_intent.payment_failed', () => {
    it('cancela pedido e mantém payment_status pendente', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'payment_intent.payment_failed',
            data: {
              object: {
                id: 'pi_failed_123',
                payment_method_types: ['card'],
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)

      const updates = mockClient._captured.updates
      const orderUpdate = updates.find((u) => u.table === 'orders')
      assertExists(orderUpdate)
      assertEquals(orderUpdate!.data.status, 'cancelado')
      assertEquals(orderUpdate!.data.payment_status, 'pendente')
      assertEquals(orderUpdate!.data.motivo_cancelamento, 'Falha no pagamento')
      assertExists(orderUpdate!.data.cancelado_em)
    })
  })

  // -----------------------------------------------------------------------
  // account.updated (KYC tenant)
  // -----------------------------------------------------------------------
  describe('account.updated', () => {
    it('atualiza stripe_onboarding_ok do tenant e chama create-subscription', async () => {
      let fetchCalled = false
      // deno-lint-ignore no-explicit-any
      let fetchBody: any = null

      const mockClient = createMockSupabaseChain({ tenantData: { id: 'tenant-001' } })
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'account.updated',
            data: {
              object: {
                id: 'acct_test_123',
                charges_enabled: true,
                payouts_enabled: true,
                details_submitted: true,
              },
            },
          },
        }),
        supabaseClient: mockClient,
        fetchFn: async (_url, init) => {
          fetchCalled = true
          fetchBody = JSON.parse(init.body)
          return { ok: true }
        },
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)
      assertEquals(fetchCalled, true)
      assertEquals(fetchBody.tenant_id, 'tenant-001')

      // Verificar que tenant foi atualizado
      const tenantUpdate = mockClient._captured.updates.find((u) => u.table === 'tenants')
      assertExists(tenantUpdate)
      assertEquals(tenantUpdate!.data.stripe_onboarding_ok, true)
    })

    it('atualiza stripe_onboarding_ok do courier quando é entregador', async () => {
      const mockClient = createMockSupabaseChain({
        tenantData: null,
        courierData: { id: 'courier-001' },
      })
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'account.updated',
            data: {
              object: {
                id: 'acct_courier_123',
                charges_enabled: true,
                payouts_enabled: true,
                details_submitted: true,
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)

      const courierUpdate = mockClient._captured.updates.find((u) => u.table === 'couriers')
      assertExists(courierUpdate)
      assertEquals(courierUpdate!.data.stripe_onboarding_ok, true)
    })

    it('ignora quando onboarding não está completo', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'account.updated',
            data: {
              object: {
                id: 'acct_test_123',
                charges_enabled: true,
                payouts_enabled: false, // não completo
                details_submitted: true,
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)
      assertEquals(mockClient._captured.updates.length, 0)
    })
  })

  // -----------------------------------------------------------------------
  // customer.subscription.updated
  // -----------------------------------------------------------------------
  describe('customer.subscription.updated', () => {
    it('atualiza billing_status ao receber subscription updated', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_test_123',
                status: 'active',
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)

      const subUpdate = mockClient._captured.updates.find((u) => u.table === 'tenant_subscriptions')
      assertExists(subUpdate)
      assertEquals(subUpdate!.data.billing_status, 'ativa')
      assertExists(subUpdate!.data.periodo_inicio)
      assertExists(subUpdate!.data.periodo_fim)
    })

    it('mapeia status past_due para em_atraso', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_test_123',
                status: 'past_due',
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
              },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      await handler(buildWebhookRequest())
      const subUpdate = mockClient._captured.updates.find((u) => u.table === 'tenant_subscriptions')
      assertEquals(subUpdate!.data.billing_status, 'em_atraso')
    })
  })

  // -----------------------------------------------------------------------
  // customer.subscription.deleted
  // -----------------------------------------------------------------------
  describe('customer.subscription.deleted', () => {
    it('atualiza billing_status para cancelada', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'customer.subscription.deleted',
            data: {
              object: { id: 'sub_test_123' },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)

      const subUpdate = mockClient._captured.updates.find((u) => u.table === 'tenant_subscriptions')
      assertExists(subUpdate)
      assertEquals(subUpdate!.data.billing_status, 'cancelada')
      assertExists(subUpdate!.data.cancelado_em)
    })
  })

  // -----------------------------------------------------------------------
  // invoice.paid
  // -----------------------------------------------------------------------
  describe('invoice.paid', () => {
    it('atualiza billing_status para ativa quando fatura paga', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'invoice.paid',
            data: {
              object: { subscription: 'sub_test_123' },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)

      const subUpdate = mockClient._captured.updates.find((u) => u.table === 'tenant_subscriptions')
      assertExists(subUpdate)
      assertEquals(subUpdate!.data.billing_status, 'ativa')
    })
  })

  // -----------------------------------------------------------------------
  // invoice.payment_failed
  // -----------------------------------------------------------------------
  describe('invoice.payment_failed', () => {
    it('atualiza billing_status para em_atraso quando fatura falha', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'invoice.payment_failed',
            data: {
              object: { subscription: 'sub_test_123' },
            },
          },
        }),
        supabaseClient: mockClient,
      })

      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)

      const subUpdate = mockClient._captured.updates.find((u) => u.table === 'tenant_subscriptions')
      assertExists(subUpdate)
      assertEquals(subUpdate!.data.billing_status, 'em_atraso')
    })
  })

  // -----------------------------------------------------------------------
  // Evento desconhecido
  // -----------------------------------------------------------------------
  describe('evento desconhecido', () => {
    it('retorna 200 received para evento não tratado', async () => {
      const handler = createHandler({
        stripe: createMockStripe({
          event: { type: 'charge.refunded', data: { object: {} } },
        }),
        supabaseClient: createMockSupabaseChain(),
      })
      const res = await handler(buildWebhookRequest())
      assertEquals(res.status, 200)
      const json = await res.json()
      assertEquals(json.received, true)
    })
  })

  // -----------------------------------------------------------------------
  // mapSubscriptionStatus
  // -----------------------------------------------------------------------
  describe('mapSubscriptionStatus', () => {
    it('mapeia active → ativa', () => assertEquals(mapSubscriptionStatus('active'), 'ativa'))
    it('mapeia trialing → trial', () => assertEquals(mapSubscriptionStatus('trialing'), 'trial'))
    it('mapeia past_due → em_atraso', () => assertEquals(mapSubscriptionStatus('past_due'), 'em_atraso'))
    it('mapeia canceled → cancelada', () => assertEquals(mapSubscriptionStatus('canceled'), 'cancelada'))
    it('mapeia unpaid → em_atraso', () => assertEquals(mapSubscriptionStatus('unpaid'), 'em_atraso'))
    it('mapeia incomplete → trial', () => assertEquals(mapSubscriptionStatus('incomplete'), 'trial'))
    it('mapeia incomplete_expired → cancelada', () => assertEquals(mapSubscriptionStatus('incomplete_expired'), 'cancelada'))
    it('mapeia status desconhecido → em_atraso', () => assertEquals(mapSubscriptionStatus('unknown'), 'em_atraso'))
  })
})
