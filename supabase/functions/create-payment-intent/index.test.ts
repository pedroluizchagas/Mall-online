// supabase/functions/create-payment-intent/index.test.ts
//
// Testes unitários para a Edge Function create-payment-intent.
// Executa com: deno test --allow-env --allow-net supabase/functions/create-payment-intent/index.test.ts

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

const FUNCTION_URL = 'http://localhost:54321/functions/v1/create-payment-intent'

const FAKE_USER = { id: 'user-uuid-123', email: 'consumidor@teste.com' }

const VALID_BODY = {
  store_id: 'store-uuid-001',
  itens: [
    { product_id: 'prod-001', nome: 'Hambúrguer', preco: 2500, quantidade: 2, observacoes: '' },
    { product_id: 'prod-002', nome: 'Refrigerante', preco: 800, quantidade: 1, observacoes: '' },
  ],
  endereco_entrega: { rua: 'Rua Y', numero: '200', cidade: 'Divinópolis', uf: 'MG' },
  observacoes: 'Sem cebola',
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockSupabaseChain(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    consumerData: { id: 'consumer-uuid-001' },
    storeData: { id: 'store-uuid-001', tenant_id: 'tenant-uuid-001', taxa_entrega: 500, ativo: true },
    subscriptionData: { billing_status: 'ativa' },
    productData: { preco: 2500, disponivel: true },
    insertOrderData: { id: 'order-uuid-001' },
    insertOrderError: null,
    insertItemsData: null,
    ...overrides,
  }

  // Track product lookups by index
  let productLookupIndex = 0

  function createChain(table: string) {
    let op = ''
    // deno-lint-ignore no-explicit-any
    const chain: Record<string, any> = {
      select: (_cols?: string) => { if (!op) op = 'select'; return chain },
      eq: (_col: string, _val: unknown) => chain,
      in: (_col: string, _vals: unknown[]) => chain,
      single: () => {
        if (table === 'consumers' && op === 'select') {
          return { data: defaults.consumerData, error: null }
        }
        if (table === 'stores' && op === 'select') {
          return { data: defaults.storeData, error: null }
        }
        if (table === 'tenant_subscriptions' && op === 'select') {
          return { data: defaults.subscriptionData, error: null }
        }
        if (table === 'products' && op === 'select') {
          const products = defaults.products as Array<Record<string, unknown>> | undefined
          if (products) {
            const product = products[productLookupIndex] ?? products[0]
            productLookupIndex++
            return { data: product, error: null }
          }
          return { data: defaults.productData, error: null }
        }
        if (table === 'orders' && op === 'insert') {
          return { data: defaults.insertOrderData, error: defaults.insertOrderError }
        }
        return { data: null, error: null }
      },
      insert: (_row: unknown) => { op = 'insert'; return chain },
    }
    return chain
  }

  return {
    from: (table: string) => createChain(table),
  }
}

function createMockStripe(overrides: Record<string, unknown> = {}) {
  return {
    paymentIntents: {
      // deno-lint-ignore no-explicit-any
      create: async (_params: any) => ({
        id: (overrides.paymentIntentId as string) ?? 'pi_test_123',
        client_secret: (overrides.clientSecret as string) ?? 'pi_test_123_secret_abc',
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
  getAuthenticatedUser: (req: Request) => Promise<typeof FAKE_USER>
}) {
  const { stripe, supabaseClient, getAuthenticatedUser } = deps

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
      const { store_id, itens, endereco_entrega, observacoes } = body

      const supabase = supabaseClient

      // Buscar consumidor
      const { data: consumer } = await supabase
        .from('consumers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!consumer) throw new Error('Consumidor não encontrado')

      // Buscar loja e tenant
      const { data: store } = await supabase
        .from('stores')
        .select('id, tenant_id, taxa_entrega, ativo')
        .eq('id', store_id)
        .single()

      if (!store || !store.ativo) throw new Error('Loja não encontrada ou inativa')

      // Verificar assinatura ativa
      const { data: subscription } = await supabase
        .from('tenant_subscriptions')
        .select('billing_status')
        .eq('tenant_id', store.tenant_id)
        .in('billing_status', ['trial', 'ativa'])
        .single()

      if (!subscription) throw new Error('Loja temporariamente indisponível')

      // Calcular total
      let subtotal = 0
      for (const item of itens) {
        const { data: produto } = await supabase
          .from('products')
          .select('preco, disponivel')
          .eq('id', item.product_id)
          .single()

        if (!produto || !produto.disponivel) {
          throw new Error(`Produto indisponível: ${item.product_id}`)
        }

        subtotal += produto.preco * item.quantidade
      }

      const taxa_entrega = store.taxa_entrega
      const total = subtotal + taxa_entrega

      // Criar PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: 'brl',
        automatic_payment_methods: { enabled: true },
        metadata: {
          consumer_id: consumer.id,
          store_id: store.id,
          tenant_id: store.tenant_id,
          subtotal: String(subtotal),
          taxa_entrega: String(taxa_entrega),
        },
      })

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          consumer_id: consumer.id,
          store_id: store.id,
          tenant_id: store.tenant_id,
          status: 'novo',
          payment_status: 'pendente',
          forma_pagamento: 'online_cartao',
          subtotal,
          taxa_entrega,
          total,
          platform_fee_amount: 100,
          endereco_entrega,
          observacoes,
          stripe_payment_intent_id: paymentIntent.id,
        })
        .select('id')
        .single()

      if (orderError) throw orderError

      // Criar itens do pedido
      // deno-lint-ignore no-explicit-any
      const orderItems = itens.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        nome: item.nome,
        preco_unit: item.preco,
        quantidade: item.quantidade,
        subtotal: item.preco * item.quantidade,
        observacoes: item.observacoes,
      }))

      await supabase.from('order_items').insert(orderItems)

      return new Response(
        JSON.stringify({
          client_secret: paymentIntent.client_secret,
          order_id: order.id,
          total,
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

function buildRequest(method: string, body?: unknown, token?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return new Request(FUNCTION_URL, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('create-payment-intent Edge Function', () => {
  // -----------------------------------------------------------------------
  // CORS
  // -----------------------------------------------------------------------
  describe('CORS preflight', () => {
    it('responde 200 com headers CORS para OPTIONS', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(new Request(FUNCTION_URL, { method: 'OPTIONS' }))
      assertEquals(res.status, 200)
      assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
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
        getAuthenticatedUser: async () => { throw new Error('Token não fornecido') },
      })
      const res = await handler(buildRequest('POST', VALID_BODY))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Token não fornecido')
    })
  })

  // -----------------------------------------------------------------------
  // Validações de negócio
  // -----------------------------------------------------------------------
  describe('validações', () => {
    it('retorna 500 quando consumidor não encontrado', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({ consumerData: null }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Consumidor não encontrado')
    })

    it('retorna 500 quando loja não encontrada', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({ storeData: null }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Loja não encontrada ou inativa')
    })

    it('retorna 500 quando loja está inativa', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          storeData: { id: 'store-uuid-001', tenant_id: 'tenant-uuid-001', taxa_entrega: 500, ativo: false },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Loja não encontrada ou inativa')
    })

    it('retorna 500 quando assinatura do tenant não está ativa', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({ subscriptionData: null }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Loja temporariamente indisponível')
    })

    it('retorna 500 quando produto está indisponível', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          productData: { preco: 2500, disponivel: false },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'Produto indisponível')
    })
  })

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------
  describe('happy path', () => {
    it('cria PaymentIntent e pedido, retorna client_secret e order_id', async () => {
      const handler = createHandler({
        stripe: createMockStripe({ clientSecret: 'pi_secret_happy' }),
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 200)
      const json = await res.json()
      assertEquals(json.client_secret, 'pi_secret_happy')
      assertEquals(json.order_id, 'order-uuid-001')
      assertExists(json.total)
    })

    it('calcula total corretamente: subtotal + taxa_entrega', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      const json = await res.json()
      // 2 itens com preco 2500 do mock * quantidade: 2500*2 + 2500*1 = 7500 + taxa_entrega 500
      // Mas o mock retorna preco: 2500 para todos os produtos
      // subtotal = 2500*2 + 2500*1 = 7500
      // total = 7500 + 500 = 8000
      assertEquals(json.total, 8000)
    })

    it('resposta contém headers CORS e Content-Type', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
      assertEquals(res.headers.get('Content-Type'), 'application/json')
    })
  })

  // -----------------------------------------------------------------------
  // Critérios de aceite
  // -----------------------------------------------------------------------
  describe('critérios de aceite', () => {
    it('PaymentIntent é criado com amount correto e currency brl', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedParams: any = null
      const mockStripe = createMockStripe()
      mockStripe.paymentIntents.create = async (params: unknown) => {
        capturedParams = params
        return { id: 'pi_captured', client_secret: 'pi_captured_secret' }
      }

      const handler = createHandler({
        stripe: mockStripe,
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      await handler(buildRequest('POST', VALID_BODY, 'token'))

      assertExists(capturedParams)
      assertEquals(capturedParams.amount, 8000) // 7500 + 500 taxa
      assertEquals(capturedParams.currency, 'brl')
      assertEquals(capturedParams.metadata.consumer_id, 'consumer-uuid-001')
      assertEquals(capturedParams.metadata.store_id, 'store-uuid-001')
    })

    it('pedido é criado com payment_status pendente e status novo', async () => {
      // deno-lint-ignore no-explicit-any
      let capturedOrder: any = null
      const mockClient = createMockSupabaseChain()
      const originalFrom = mockClient.from.bind(mockClient)

      const patchedClient = {
        from: (table: string) => {
          const chain = originalFrom(table)
          if (table === 'orders') {
            const originalInsert = chain.insert.bind(chain)
            chain.insert = (row: unknown) => {
              capturedOrder = row
              return originalInsert(row)
            }
          }
          return chain
        },
      }

      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: patchedClient,
        getAuthenticatedUser: async () => FAKE_USER,
      })
      await handler(buildRequest('POST', VALID_BODY, 'token'))

      assertExists(capturedOrder)
      assertEquals(capturedOrder.status, 'novo')
      assertEquals(capturedOrder.payment_status, 'pendente')
      assertEquals(capturedOrder.forma_pagamento, 'online_cartao')
      assertEquals(capturedOrder.platform_fee_amount, 100)
    })
  })

  // -----------------------------------------------------------------------
  // Erros do Stripe
  // -----------------------------------------------------------------------
  describe('erros do Stripe', () => {
    it('retorna 500 quando Stripe paymentIntents.create falha', async () => {
      const brokenStripe = createMockStripe()
      brokenStripe.paymentIntents.create = async () => {
        throw new Error('Stripe API error: insufficient_funds')
      }
      const handler = createHandler({
        stripe: brokenStripe,
        supabaseClient: createMockSupabaseChain(),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
      const json = await res.json()
      assertStringIncludes(json.error, 'insufficient_funds')
    })
  })

  // -----------------------------------------------------------------------
  // Erro ao inserir pedido
  // -----------------------------------------------------------------------
  describe('erros de inserção', () => {
    it('retorna 500 quando falha ao inserir pedido', async () => {
      const handler = createHandler({
        stripe: createMockStripe(),
        supabaseClient: createMockSupabaseChain({
          insertOrderData: null,
          insertOrderError: { message: 'duplicate key constraint' },
        }),
        getAuthenticatedUser: async () => FAKE_USER,
      })
      const res = await handler(buildRequest('POST', VALID_BODY, 'token'))
      assertEquals(res.status, 500)
    })
  })
})
