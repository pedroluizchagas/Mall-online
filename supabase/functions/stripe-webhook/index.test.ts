// supabase/functions/stripe-webhook/index.test.ts
//
// Testes unitários para a Edge Function stripe-webhook.
// Após a migração para Pagar.me, este endpoint só responde a eventos de
// Stripe Billing. Eventos de pagamentos de pedidos / Connect / payouts são
// ignorados com log "evento não tratado".
//
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

function createMockSupabaseChain() {
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
      single: () => ({ data: null, error: null }),
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
// Handler com dependências injetáveis — replica fielmente a logica do index.ts
// ---------------------------------------------------------------------------

function createHandler(deps: {
  stripe: ReturnType<typeof createMockStripe>
  // deno-lint-ignore no-explicit-any
  supabaseClient: any
  logger?: (msg: string) => void
}) {
  const { stripe, supabaseClient } = deps
  const log = deps.logger ?? (() => {})

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
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object
          await supabase
            .from('tenant_subscriptions')
            .update({
              billing_status: mapSubscriptionStatus(sub.status),
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

        case 'invoice.payment_failed':
        case 'invoice.payment_action_required': {
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
          log(`stripe-webhook: evento não tratado (${event.type})`)
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

describe('stripe-webhook Edge Function (Billing-only)', () => {
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

  describe('customer.subscription.created', () => {
    it('atualiza billing_status quando subscription created', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'customer.subscription.created',
            data: {
              object: {
                id: 'sub_test_created',
                status: 'trialing',
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
      assertEquals(subUpdate!.data.billing_status, 'trial')
    })
  })

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

  describe('invoice.paid', () => {
    it('atualiza billing_status para ativa quando fatura paga', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'invoice.paid',
            data: { object: { subscription: 'sub_test_123' } },
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

  describe('invoice.payment_failed', () => {
    it('atualiza billing_status para em_atraso quando fatura falha', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'invoice.payment_failed',
            data: { object: { subscription: 'sub_test_123' } },
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

  describe('invoice.payment_action_required', () => {
    it('marca billing_status como em_atraso quando 3DS é exigido', async () => {
      const mockClient = createMockSupabaseChain()
      const handler = createHandler({
        stripe: createMockStripe({
          event: {
            type: 'invoice.payment_action_required',
            data: { object: { subscription: 'sub_test_3ds' } },
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
  // Eventos que pertenciam ao Stripe Connect / pagamentos de pedido — agora
  // tratados pelo `pagarme-webhook`. O endpoint stripe-webhook deve ignorá-los.
  // -----------------------------------------------------------------------
  describe('eventos não tratados (delegados ao pagarme-webhook)', () => {
    const eventosIgnorados = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'account.updated',
      'transfer.created',
      'transfer.failed',
      'charge.refunded',
    ]

    for (const tipo of eventosIgnorados) {
      it(`retorna 200 e loga evento não tratado para ${tipo}`, async () => {
        const mockClient = createMockSupabaseChain()
        const logs: string[] = []
        const handler = createHandler({
          stripe: createMockStripe({
            event: { type: tipo, data: { object: {} } },
          }),
          supabaseClient: mockClient,
          logger: (msg) => logs.push(msg),
        })

        const res = await handler(buildWebhookRequest())
        assertEquals(res.status, 200)
        const json = await res.json()
        assertEquals(json.received, true)

        // Nenhuma escrita no banco
        assertEquals(mockClient._captured.updates.length, 0)
        // Mensagem de log esperada
        assertEquals(logs.length, 1)
        assertStringIncludes(logs[0], 'evento não tratado')
        assertStringIncludes(logs[0], tipo)
      })
    }
  })

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
