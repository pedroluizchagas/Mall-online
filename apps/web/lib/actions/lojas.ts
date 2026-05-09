'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'
import type { HorariosFuncionamento } from '@mallora/types'

const schemaDadosGerais = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  telefone: z.string().min(10, 'Telefone inválido').optional(),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .max(60, 'Slug muito longo')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .optional(),
})

const schemaEntrega = z.object({
  taxa_entrega: z.number().int().min(0),
  tempo_entrega: z.number().int().min(1).max(180).optional(),
  raio_entrega_km: z.number().min(0).max(50).optional(),
  usa_entregadores_proprios: z.boolean(),
})

const schemaPagamentos = z.object({
  aceita_dinheiro: z.boolean(),
  aceita_pix: z.boolean(),
  aceita_cartao_maquininha: z.boolean(),
  aceita_cartao_online: z.boolean(),
})

// Buscar dados da loja
export async function getDadosLoja() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select(
      'id, nome_responsavel, email, telefone, cpf_cnpj, pagarme_recipient_id, pagarme_onboarding_status, pagarme_kyc_link'
    )
    .single()

  if (!tenant) return null

  const { data: loja } = await supabase
    .from('stores')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  return { tenant, loja }
}

// Atualizar dados gerais da loja (nome, descrição, telefone, slug, status)
export async function atualizarDadosGerais(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id')
    .eq('tenant_id', tenant.id)
    .single()
  if (!loja) return { erro: 'Loja não encontrada' }

  const slugRaw = formData.get('slug')

  const dados = schemaDadosGerais.safeParse({
    nome: formData.get('nome'),
    telefone: formData.get('telefone') || undefined,
    slug: slugRaw ? String(slugRaw).toLowerCase().trim() : undefined,
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await supabase
    .from('stores')
    .update(dados.data)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes')
  revalidatePath('/minha-loja')
  return { sucesso: true }
}

// Atualizar configurações de entrega
export async function atualizarConfigEntrega(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id')
    .eq('tenant_id', tenant.id)
    .single()
  if (!loja) return { erro: 'Loja não encontrada' }

  const taxa_raw = formData.get('taxa_entrega')
  const tempo_raw = formData.get('tempo_entrega')
  const raio_raw = formData.get('raio_entrega_km')

  const dados = schemaEntrega.safeParse({
    taxa_entrega: taxa_raw ? Math.round(parseFloat(String(taxa_raw)) * 100) : 0,
    tempo_entrega: tempo_raw ? parseInt(String(tempo_raw)) : undefined,
    raio_entrega_km: raio_raw ? parseFloat(String(raio_raw)) : undefined,
    usa_entregadores_proprios: formData.get('usa_entregadores_proprios') === 'true',
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await supabase
    .from('stores')
    .update(dados.data)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes')
  return { sucesso: true }
}

// Atualizar métodos de pagamento
export async function atualizarMetodosPagamento(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id')
    .eq('tenant_id', tenant.id)
    .single()
  if (!loja) return { erro: 'Loja não encontrada' }

  const dados = schemaPagamentos.safeParse({
    aceita_dinheiro: formData.get('aceita_dinheiro') === 'true',
    aceita_pix: formData.get('aceita_pix') === 'true',
    aceita_cartao_maquininha: formData.get('aceita_cartao_maquininha') === 'true',
    aceita_cartao_online: formData.get('aceita_cartao_online') === 'true',
  })

  if (!dados.success) return { erro: dados.error.errors[0].message }

  const { error } = await supabase
    .from('stores')
    .update(dados.data)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes')
  return { sucesso: true }
}

/**
 * @deprecated Use publicarVitrine() em loja-vitrine.ts. Esta action grava
 * em product-images; a vitrine usa o bucket store-assets.
 */
export async function atualizarImagensLoja(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id, logo_url, banner_url')
    .eq('tenant_id', tenant.id)
    .single()

  if (!loja) return { erro: 'Loja não encontrada' }

  const atualizacao: Record<string, string> = {}

  // Upload do logo
  const logo = formData.get('logo') as File | null
  if (logo && logo.size > 0) {
    const ext = logo.name.split('.').pop()
    const caminho = `${tenant.id}/logo.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(caminho, logo, {
        contentType: logo.type,
        upsert: true,
      })

    if (!error) {
      const { data: url } = supabase.storage
        .from('product-images')
        .getPublicUrl(caminho)
      atualizacao.logo_url = `${url.publicUrl}?t=${Date.now()}`
    }
  }

  // Upload do banner
  const banner = formData.get('banner') as File | null
  if (banner && banner.size > 0) {
    const ext = banner.name.split('.').pop()
    const caminho = `${tenant.id}/banner.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(caminho, banner, {
        contentType: banner.type,
        upsert: true,
      })

    if (!error) {
      const { data: url } = supabase.storage
        .from('product-images')
        .getPublicUrl(caminho)
      atualizacao.banner_url = `${url.publicUrl}?t=${Date.now()}`
    }
  }

  if (Object.keys(atualizacao).length === 0) {
    return { erro: 'Nenhuma imagem enviada' }
  }

  const { error } = await supabase
    .from('stores')
    .update(atualizacao)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes')
  return { sucesso: true }
}

// Atualizar horários de funcionamento
export async function atualizarHorarios(horarios: HorariosFuncionamento) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('stores')
    .update({ horarios })
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes')
  return { sucesso: true }
}

// Atualizar endereço da loja
export async function atualizarEndereco(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const endereco = {
    rua: formData.get('rua'),
    numero: formData.get('numero'),
    complemento: formData.get('complemento') || undefined,
    bairro: formData.get('bairro'),
    cidade: formData.get('cidade'),
    estado: formData.get('estado'),
    cep: formData.get('cep'),
  }

  const { error } = await supabase
    .from('stores')
    .update({ endereco })
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/configuracoes')
  return { sucesso: true }
}
