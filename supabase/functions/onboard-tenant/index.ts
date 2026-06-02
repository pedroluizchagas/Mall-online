// supabase/functions/onboard-tenant/index.ts
import Stripe from 'https://esm.sh/stripe@14'
import {
  getSupabaseAdmin,
  corsHeaders,
  pagarmeHeaders,
  PAGARME_BASE_URL,
} from '../helpers/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

type DadosBancariosPix = {
  tipo: 'pix'
  chave_pix: string
  tipo_chave: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
}

type DadosBancariosConta = {
  tipo: 'conta_bancaria'
  banco: string
  agencia: string
  conta: string
  digito: string
  tipo_conta: 'checking' | 'savings'
}

type DadosBancarios = DadosBancariosPix | DadosBancariosConta

function buildRecipientPayload(args: {
  nome_responsavel: string
  email: string
  cpf_cnpj: string
  dados_bancarios: DadosBancarios
}) {
  const { nome_responsavel, email, cpf_cnpj, dados_bancarios } = args
  const documentDigits = cpf_cnpj.replace(/\D/g, '')
  const type = documentDigits.length <= 11 ? 'individual' : 'company'

  const base = {
    name: nome_responsavel,
    email,
    document: cpf_cnpj,
    type,
  }

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

Deno.serve(async (req) => {
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
    } = body as {
      nome_responsavel: string
      cpf_cnpj: string
      telefone: string
      email: string
      senha: string
      nome_loja: string
      categoria_id?: string
      endereco: unknown
      plan_id: string
      dados_bancarios: DadosBancarios
    }

    if (!email || !senha) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    if (!dados_bancarios || !dados_bancarios.tipo) {
      return new Response(
        JSON.stringify({ error: 'Dados bancários são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getSupabaseAdmin()

    let userId: string
    let isNewUser = false

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome_responsavel, role: 'tenant' },
    })

    if (authError) {
      if (
        authError.message.includes('already been registered') ||
        authError.message.includes('already registered')
      ) {
        const { data: existingUserId, error: rpcError } = await supabase.rpc(
          'get_user_id_by_email',
          { p_email: email }
        )

        if (rpcError || !existingUserId) {
          return new Response(
            JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login na plataforma.' }),
            { status: 409, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          )
        }

        const { data: tenantExistente } = await supabase
          .from('tenants')
          .select('id')
          .eq('user_id', existingUserId)
          .single()

        if (tenantExistente) {
          return new Response(
            JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login na plataforma.' }),
            { status: 409, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          )
        }

        await supabase.auth.admin.updateUserById(existingUserId, {
          password: senha,
          user_metadata: { nome: nome_responsavel, role: 'tenant' },
        })
        userId = existingUserId
        isNewUser = false
      } else {
        throw authError
      }
    } else {
      userId = authData.user.id
      isNewUser = true
    }

    const { data: plano, error: planoError } = await supabase
      .from('plans')
      .select('id, stripe_price_id')
      .eq('id', plan_id)
      .eq('ativo', true)
      .single()

    if (planoError || !plano) {
      if (isNewUser) await supabase.auth.admin.deleteUser(userId)
      throw new Error('Plano não encontrado ou inativo')
    }

    let stripeCustomerId: string
    let pagarmeRecipientId: string
    let pagarmeRecipientStatus: string
    let pagarmeKycLink: string | null = null

    try {
      const stripeCustomer = await stripe.customers.create({
        email,
        name: nome_responsavel,
        phone: telefone,
        metadata: { user_id: userId },
      })
      stripeCustomerId = stripeCustomer.id

      const recipientPayload = buildRecipientPayload({
        nome_responsavel,
        email,
        cpf_cnpj,
        dados_bancarios,
      })

      const pagarmeRes = await fetch(`${PAGARME_BASE_URL}/recipients`, {
        method: 'POST',
        headers: pagarmeHeaders(),
        body: JSON.stringify(recipientPayload),
      })

      const pagarmeData = await pagarmeRes.json()
      if (!pagarmeRes.ok) {
        throw new Error(`Pagar.me recipient: ${JSON.stringify(pagarmeData)}`)
      }

      pagarmeRecipientId = pagarmeData.id
      pagarmeRecipientStatus = pagarmeData.status ?? 'pending'
      pagarmeKycLink = pagarmeData.kyc_link ?? null
    } catch (err) {
      if (isNewUser) await supabase.auth.admin.deleteUser(userId)
      throw err
    }

    const baseSlug = nome_loja
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    async function resolverSlugDisponivel(base: string): Promise<string> {
      const { data: existing } = await supabase
        .from('stores')
        .select('slug')
        .like('slug', `${base}%`)

      const slugsExistentes = new Set((existing ?? []).map((r: { slug: string }) => r.slug))
      if (!slugsExistentes.has(base)) return base

      let i = 2
      while (slugsExistentes.has(`${base}-${i}`)) i++
      return `${base}-${i}`
    }

    const storeSlug = await resolverSlugDisponivel(baseSlug)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        user_id: userId,
        nome_responsavel,
        cpf_cnpj,
        telefone,
        email,
        slug: `${baseSlug}-${Date.now()}`,
        stripe_customer_id: stripeCustomerId,
        pagarme_recipient_id: pagarmeRecipientId,
        pagarme_onboarding_status: pagarmeRecipientStatus,
      })
      .select('id')
      .single()

    if (tenantError) {
      if (isNewUser) await supabase.auth.admin.deleteUser(userId)
      throw tenantError
    }

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
        slug: storeSlug,
        endereco,
        categoria_id: categoria_id ?? null,
      })
      .select('id')
      .single()

    if (storeError) throw storeError

    // Registra o subdomínio da loja no projeto storefront da Vercel.
    // O wildcard CNAME (*.mallevo.com.br → cname.vercel-dns.com) já roteia o
    // tráfego; aqui a Vercel passa a reconhecer o host e emite o cert via
    // HTTP-01 (não precisa de cert wildcard / DNS-01). Best-effort: falha aqui
    // NÃO reverte o onboarding (Stripe/Pagar.me já concluídos). 409 = já existe.
    try {
      const vercelToken = Deno.env.get('VERCEL_TOKEN')
      const vercelProjectId = Deno.env.get('VERCEL_STOREFRONT_PROJECT_ID')
      if (vercelToken && vercelProjectId) {
        const res = await fetch(
          `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: `${storeSlug}.mallevo.com.br` }),
          }
        )
        if (!res.ok && res.status !== 409) {
          console.error('Vercel addDomain falhou:', storeSlug, await res.text())
        }
      } else {
        console.warn('VERCEL_TOKEN/VERCEL_STOREFRONT_PROJECT_ID ausentes — domínio da loja não registrado:', storeSlug)
      }
    } catch (err) {
      console.error('Vercel addDomain exception:', storeSlug, err)
    }

    // Recipient já ativo (PJ verificada automaticamente) → cria a Subscription
    // Stripe Billing imediatamente. Caso contrário, o webhook
    // recipient.status.changed dispara create-subscription quando status='active'.
    if (pagarmeRecipientStatus === 'active') {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ tenant_id: tenant.id }),
      })
    }

    return new Response(
      JSON.stringify({
        tenant_id: tenant.id,
        store_id: store.id,
        store_slug: storeSlug,
        pagarme_recipient_id: pagarmeRecipientId,
        pagarme_recipient_status: pagarmeRecipientStatus,
        kyc_link: pagarmeKycLink,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )
  }
})
