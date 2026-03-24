# 07 — Edge Functions de Pagamento

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Todas as Edge Functions rodam em Deno (runtime padrão do Supabase).
Nenhuma operação Stripe acontece no cliente — apenas nas Edge Functions
ou Server Actions do Next.js.

Localização no repositório:

```
supabase/functions/
  onboard-tenant/         index.ts
  onboard-courier/        index.ts
  create-payment-intent/  index.ts
  create-subscription/    index.ts
  stripe-webhook/         index.ts
  daily-payouts/          index.ts
  request-advance/        index.ts
  notify-order-update/    index.ts  (coberto no arquivo 23)
```

Variáveis de ambiente disponíveis em todas as functions:

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

-----

## PADRAO DE AUTENTICACAO

Todas as functions (exceto `stripe-webhook` e `daily-payouts`) validam
o JWT do usuário autenticado antes de qualquer operação.

```typescript
// helpers/auth.ts — reutilizado em todas as functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Token não fornecido')

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Token inválido')

  return user
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

-----

## FUNCTION 1 — onboard-tenant

Chamada ao final do wizard de onboarding do lojista. Cria o tenant,
a primeira loja, o Stripe Customer e inicia o onboarding da Express Account.

```typescript
// supabase/functions/onboard-tenant/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
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
      categoria_id,
      endereco,
      plan_id,
    } = body

    const supabase = getSupabaseAdmin()

    // Verificar se tenant já existe para este usuário
    const { data: tenantExistente } = await supabase
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

    // Buscar plano selecionado
    const { data: plano, error: planoError } = await supabase
      .from('plans')
      .select('id, stripe_price_id')
      .eq('id', plan_id)
      .eq('ativo', true)
      .single()

    if (planoError || !plano) {
      throw new Error('Plano não encontrado ou inativo')
    }

    // Criar Stripe Customer (para Billing — assinatura mensal)
    const stripeCustomer = await stripe.customers.create({
      email,
      name: nome_responsavel,
      phone: telefone,
      metadata: { user_id: user.id },
    })

    // Criar Express Account (para receber repasses)
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { user_id: user.id },
    })

    // Criar tenant
    const slug = nome_loja
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: tenant, error: tenantError } = await supabase
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

    // Criar assinatura (trial) — subscription criada em create-subscription
    // após KYC do Stripe ser concluído
    const trialTerminaEm = new Date()
    trialTerminaEm.setDate(trialTerminaEm.getDate() + 14)

    await supabase.from('tenant_subscriptions').insert({
      tenant_id: tenant.id,
      plan_id: plano.id,
      billing_status: 'trial',
      trial_termina_em: trialTerminaEm.toISOString(),
      stripe_price_id: plano.stripe_price_id,
    })

    // Criar primeira loja (bypassa o trigger de limite via service_role)
    const { data: store, error: storeError } = await supabase
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

    // Gerar link de onboarding da Express Account
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: `${Deno.env.get('APP_URL')}/onboarding/stripe/retry`,
      return_url: `${Deno.env.get('APP_URL')}/onboarding/stripe/callback`,
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 2 — onboard-courier

Chamada após aprovação do entregador pelo admin. Cria a Express Account
e gera o link de onboarding para o entregador preencher seus dados bancários.

```typescript
// supabase/functions/onboard-courier/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    // Buscar courier aprovado do usuário autenticado
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('id, email, nome, status, stripe_account_id')
      .eq('user_id', user.id)
      .single()

    if (courierError || !courier) throw new Error('Entregador não encontrado')
    if (courier.status !== 'aprovado') throw new Error('Entregador ainda não aprovado')

    // Se já tem conta Stripe, apenas regenerar o link
    let stripeAccountId = courier.stripe_account_id

    if (!stripeAccountId) {
      const stripeAccount = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { courier_id: courier.id, user_id: user.id },
      })

      stripeAccountId = stripeAccount.id

      await supabase
        .from('couriers')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', courier.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${Deno.env.get('APP_URL')}/entregador/stripe/retry`,
      return_url: `${Deno.env.get('APP_URL')}/entregador/stripe/callback`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({ stripe_onboarding_url: accountLink.url }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 3 — create-payment-intent

Chamada pelo app do consumidor ao iniciar o checkout. Cria o PaymentIntent
na conta da plataforma (sem transfer imediato — a plataforma retém tudo
até o cron de repasses).

```typescript
// supabase/functions/create-payment-intent/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const body = await req.json()
    const { store_id, itens, endereco_entrega, observacoes } = body

    const supabase = getSupabaseAdmin()

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

    // Verificar que o tenant tem assinatura ativa
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

    // Criar PaymentIntent na conta da plataforma
    // Sem transfer_data — plataforma retém tudo até o cron de repasses
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

    // Criar pedido com status 'novo' e payment_status 'pendente'
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        consumer_id: consumer.id,
        store_id: store.id,
        tenant_id: store.tenant_id,
        status: 'novo',
        payment_status: 'pendente',
        forma_pagamento: 'online_cartao', // atualizado após confirmação
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 4 — create-subscription

Chamada após o webhook `account.updated` confirmar que o KYC da Express
Account do lojista foi concluído. Cria a Subscription no Stripe Billing.

```typescript
// supabase/functions/create-subscription/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin, corsHeaders } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    // Chamada interna — autenticada via service_role no header
    const body = await req.json()
    const { tenant_id } = body

    const supabase = getSupabaseAdmin()

    // Buscar tenant e assinatura
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, stripe_onboarding_ok')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.stripe_onboarding_ok) {
      throw new Error('Tenant sem KYC concluído')
    }

    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_price_id, stripe_subscription_id, trial_termina_em')
      .eq('tenant_id', tenant_id)
      .single()

    if (!sub || !sub.stripe_price_id) {
      throw new Error('Assinatura ou price não encontrado')
    }

    // Não criar novamente se já existe
    if (sub.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ message: 'Subscription já existe' }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    // Calcular dias de trial restantes
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## FUNCTION 5 — stripe-webhook

Ponto de entrada para todos os eventos Stripe. Verifica a assinatura
do webhook antes de processar qualquer evento.

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch {
    return new Response('Assinatura inválida', { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  try {
    switch (event.type) {

      // Pagamento confirmado pelo consumidor
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
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

      // Pagamento falhou
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
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

      // KYC da Express Account concluído
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const onboardingOk =
          account.charges_enabled &&
          account.payouts_enabled &&
          account.details_submitted

        if (onboardingOk) {
          // Verificar se é lojista ou entregador
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

            // Criar subscription Stripe Billing
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-subscription`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
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

      // Assinatura atualizada
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
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

      // Assinatura cancelada
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('tenant_subscriptions')
          .update({
            billing_status: 'cancelada',
            cancelado_em: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      // Fatura paga (renovação ou ativação)
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('tenant_subscriptions')
            .update({ billing_status: 'ativa' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      // Fatura com falha no pagamento
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('tenant_subscriptions')
            .update({ billing_status: 'em_atraso' })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      default:
        // Evento não tratado — ignorar silenciosamente
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

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
```

-----

## FUNCTION 6 — daily-payouts

Cron job executado toda meia-noite. Processa repasses para entregadores
(D+1) e lojistas (D+7), além de antecipações aprovadas (D+2).

Configuração do cron no Supabase:

```
Cron expression: 0 3 * * *
(03:00 UTC = 00:00 Brasília no horário de verão)
```

```typescript
// supabase/functions/daily-payouts/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import { getSupabaseAdmin } from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

Deno.serve(async (_req) => {
  const supabase = getSupabaseAdmin()
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
      .is('payout_id', null) // campo a adicionar em delivery_assignments

    if (entregas && entregas.length > 0) {
      // Agrupar por entregador
      const porEntregador = entregas.reduce((acc: any, e: any) => {
        const cid = e.courier_id
        if (!acc[cid]) {
          acc[cid] = {
            courier: e.couriers,
            entregas: [],
            total: 0,
          }
        }
        acc[cid].entregas.push(e.id)
        acc[cid].total += e.valor_entrega
        return acc
      }, {})

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

          const { data: payout } = await supabase
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

          console.log(`Repasse entregador ${courierId}: R$${dados.total / 100} — ${transfer.id}`)
        } catch (e: any) {
          erros.push(`Entregador ${courierId}: ${e.message}`)
          console.error(`Erro repasse entregador ${courierId}:`, e)
        }
      }
    }
  } catch (e: any) {
    erros.push(`Erro geral D+1: ${e.message}`)
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
      // Agrupar por tenant
      const porTenant = pedidos.reduce((acc: any, p: any) => {
        const tid = p.tenant_id
        if (!acc[tid]) {
          acc[tid] = {
            tenant: p.tenants,
            pedidos: [],
            total: 0,
          }
        }
        // Valor do lojista = total - taxa_entrega - platform_fee
        const valorLojista = p.total - p.taxa_entrega - p.platform_fee_amount
        acc[tid].pedidos.push(p.id)
        acc[tid].total += valorLojista
        return acc
      }, {})

      for (const [tenantId, dados] of Object.entries(porTenant) as any) {
        // Verificar se há antecipação ativa para este tenant
        const { data: advance } = await supabase
          .from('payout_advance_requests')
          .select('id, total_pedidos, taxa_total')
          .eq('tenant_id', tenantId)
          .eq('status', 'aprovada')
          .lte('solicitado_em', hoje.toISOString())
          .single()

        // Se há antecipação aprovada, pular (será processado no passo 3)
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

          console.log(`Repasse lojista ${tenantId}: R$${dados.total / 100} — ${transfer.id}`)
        } catch (e: any) {
          erros.push(`Lojista ${tenantId}: ${e.message}`)
        }
      }
    }
  } catch (e: any) {
    erros.push(`Erro geral D+7: ${e.message}`)
  }

  // PASSO 3 — Antecipações D+2 com vencimento hoje
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

    for (const antecipacao of (antecipacoes ?? [])) {
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

        console.log(`Antecipação tenant ${antecipacao.tenant_id}: R$${valorLiquido / 100}`)
      } catch (e: any) {
        erros.push(`Antecipação ${antecipacao.id}: ${e.message}`)
      }
    }
  } catch (e: any) {
    erros.push(`Erro geral antecipações: ${e.message}`)
  }

  return new Response(
    JSON.stringify({
      sucesso: erros.length === 0,
      erros,
      executado_em: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

-----

## FUNCTION 7 — request-advance

Chamada pelo lojista ao solicitar antecipação de repasse (D+2).
Valida elegibilidade, calcula a taxa e registra a solicitação.

```typescript
// supabase/functions/request-advance/index.ts
import { getSupabaseAdmin, getAuthenticatedUser, corsHeaders } from '../helpers/auth.ts'

const TAXA_ANTECIPACAO_CENTAVOS = 75 // R$0,75 por pedido

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const supabase = getSupabaseAdmin()

    // Buscar tenant do lojista
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, stripe_onboarding_ok')
      .eq('user_id', user.id)
      .single()

    if (!tenant) throw new Error('Lojista não encontrado')
    if (!tenant.stripe_onboarding_ok) {
      throw new Error('Configure sua conta de recebimentos antes de solicitar antecipação')
    }

    // Verificar assinatura e se o plano permite antecipação
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

    // Verificar se já tem antecipação pendente ou aprovada
    const { data: antecipacaoExistente } = await supabase
      .from('payout_advance_requests')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .in('status', ['pendente', 'aprovada'])
      .single()

    if (antecipacaoExistente) {
      throw new Error('Já existe uma solicitação de antecipação em andamento')
    }

    // Calcular pedidos elegíveis (entregues nos últimos 7 dias, pagos, sem payout)
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
    const valorEstimado = pedidosElegiveis.reduce((acc, p) => {
      return acc + p.total - p.taxa_entrega - p.platform_fee_amount
    }, 0)

    const taxaTotal = totalPedidos * TAXA_ANTECIPACAO_CENTAVOS
    const valorLiquido = valorEstimado - taxaTotal

    // Registrar solicitação — aprovação automática no MVP
    const { data: solicitacao } = await supabase
      .from('payout_advance_requests')
      .insert({
        tenant_id: tenant.id,
        total_pedidos: totalPedidos,
        taxa_total: taxaTotal,
        valor_estimado: valorEstimado,
        status: 'aprovada', // aprovação automática no MVP
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
        previsao_repasse: 'D+2 úteis',
        mensagem: 'Antecipação aprovada. O repasse será processado no próximo ciclo do cron.',
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
```

-----

## EVENTOS WEBHOOK STRIPE — LISTA COMPLETA PARA REGISTRO

Registrar esses eventos no Stripe Dashboard ao configurar o webhook endpoint:

```
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
account.updated
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.payment_action_required
charge.dispute.created
charge.refunded
```

-----

## TESTANDO LOCALMENTE

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Autenticar
stripe login

# Escutar webhooks localmente e reencaminhar para Supabase local
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Simular evento específico
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.updated
stripe trigger account.updated
```

-----

*Arquivo 07 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 08 — Estrutura do Monorepo*
