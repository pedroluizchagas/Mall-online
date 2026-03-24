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
