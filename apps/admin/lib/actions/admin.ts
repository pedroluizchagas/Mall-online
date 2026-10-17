'use server'

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import { exigirAdmin } from '@/lib/acesso'
import { centavosDoTexto } from '@/lib/format'

/**
 * Mutações da administração. As leituras moram em lib/consultas.ts — aqui
 * só entra o que grava, porque todo export deste arquivo vira um endpoint
 * chamável pelo navegador. Por isso cada ação confere o papel e valida a
 * entrada antes de tocar no banco.
 */

type Resultado = { sucesso: true } | { erro: string }

/** Contadores da moldura (badges) e a Visão geral dependem do que muda aqui. */
function revalidarAdministracao() {
  revalidatePath('/admin', 'layout')
}

const schemaStatusLojista = z.object({
  tenantId: z.string().uuid('Lojista inválido'),
  ativo: z.boolean(),
})

export async function atualizarStatusTenant(tenantId: string, ativo: boolean): Promise<Resultado> {
  const entrada = schemaStatusLojista.safeParse({ tenantId, ativo })
  if (!entrada.success) return { erro: entrada.error.errors[0].message }

  const supabase = createSupabaseServer()
  await exigirAdmin()

  const { error } = await supabase.from('tenants').update({ ativo }).eq('id', entrada.data.tenantId)
  if (error) return { erro: error.message }

  if (!ativo) {
    await supabase.from('tenant_subscriptions').update({ billing_status: 'suspensa' }).eq('tenant_id', entrada.data.tenantId)
  }

  revalidarAdministracao()
  return { sucesso: true }
}

const schemaStatusEntregador = z.object({
  courierId: z.string().uuid('Entregador inválido'),
  status: z.enum(['aprovado', 'reprovado', 'suspenso'], { errorMap: () => ({ message: 'Status inválido' }) }),
})

export async function atualizarStatusEntregador(
  courierId: string,
  status: 'aprovado' | 'reprovado' | 'suspenso',
): Promise<Resultado> {
  const entrada = schemaStatusEntregador.safeParse({ courierId, status })
  if (!entrada.success) return { erro: entrada.error.errors[0].message }

  const supabase = createSupabaseServer()
  const user = await exigirAdmin()

  const atualizacao: { status: string; aprovado_em?: string; aprovado_por?: string } = { status: entrada.data.status }
  if (entrada.data.status === 'aprovado') {
    atualizacao.aprovado_em = new Date().toISOString()
    atualizacao.aprovado_por = user.id
  }

  const { error } = await supabase.from('couriers').update(atualizacao).eq('id', entrada.data.courierId)
  if (error) return { erro: error.message }

  revalidarAdministracao()
  return { sucesso: true }
}

const inteiro = (rotulo: string, minimo: number) =>
  z
    .number({ invalid_type_error: `${rotulo}: informe um número` })
    .int(`${rotulo}: use um número inteiro`)
    .min(minimo, `${rotulo}: o mínimo é ${minimo}`)

const schemaPlano = z.object({
  nome: z.string().trim().min(2, 'Dê um nome ao plano (2 letras ou mais)').max(60, 'Nome muito longo'),
  descricao: z.string().trim().max(200, 'Descrição muito longa').optional(),
  preco_mensal: inteiro('Preço mensal', 0),
  max_lojas: inteiro('Máximo de lojas', 1),
  max_produtos: inteiro('Máximo de produtos', 1),
  max_entregadores: inteiro('Máximo de entregadores', 1),
  tem_estoque: z.boolean(),
  tem_relatorios: z.boolean(),
  tem_antecipacao: z.boolean(),
  ativo: z.boolean(),
})

function numeroInteiro(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? '').trim()
  return texto ? Number(texto) : Number.NaN
}

export async function criarPlano(formData: FormData): Promise<Resultado> {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const dados = schemaPlano.safeParse({
    nome: formData.get('nome'),
    descricao: String(formData.get('descricao') ?? '').trim() || undefined,
    preco_mensal: centavosDoTexto(String(formData.get('preco_mensal') ?? '')),
    max_lojas: numeroInteiro(formData.get('max_lojas')),
    max_produtos: numeroInteiro(formData.get('max_produtos')),
    max_entregadores: numeroInteiro(formData.get('max_entregadores')),
    tem_estoque: formData.get('tem_estoque') === 'true',
    tem_relatorios: formData.get('tem_relatorios') === 'true',
    tem_antecipacao: formData.get('tem_antecipacao') === 'true',
    ativo: true,
  })
  if (!dados.success) return { erro: dados.error.errors[0].message }

  const chave = process.env.STRIPE_SECRET_KEY
  if (!chave) return { erro: 'Stripe não configurado neste ambiente (STRIPE_SECRET_KEY).' }

  // O plano nasce no Stripe primeiro: sem produto e preço lá, a assinatura
  // do lojista não teria o que cobrar.
  let stripeProductId: string
  let stripePriceId: string | null = null
  try {
    const stripe = new Stripe(chave, { apiVersion: '2024-04-10' })
    const produto = await stripe.products.create({
      name: dados.data.nome,
      description: dados.data.descricao,
      metadata: { plataforma: 'mallevo' },
    })
    stripeProductId = produto.id
    if (dados.data.preco_mensal > 0) {
      const preco = await stripe.prices.create({
        product: produto.id,
        unit_amount: dados.data.preco_mensal,
        currency: 'brl',
        recurring: { interval: 'month' },
      })
      stripePriceId = preco.id
    }
  } catch (e) {
    return { erro: `O Stripe recusou o plano: ${e instanceof Error ? e.message : 'erro desconhecido'}` }
  }

  const { error } = await supabase.from('plans').insert({
    ...dados.data,
    stripe_product_id: stripeProductId,
    stripe_price_id: stripePriceId,
  })
  if (error) return { erro: error.message }

  revalidatePath('/admin/planos')
  return { sucesso: true }
}
