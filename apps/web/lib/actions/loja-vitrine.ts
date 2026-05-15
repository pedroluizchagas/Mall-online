'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import type {
  PaletaVitrine,
  StoreTheme,
  TemplateVitrine,
} from '@mallevo/types'

const BUCKET = 'store-assets'
const TAMANHO_MAX_BYTES = 5 * 1024 * 1024
const MIME_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const

const TEMPLATES = ['market', 'boutique', 'artesanal', 'neon'] as const
const PALETAS = ['midnight', 'ocean', 'berry', 'ember', 'slate', 'matcha'] as const

type ResultadoAcao = { sucesso: true } | { erro: string }

const schemaPublicar = z.object({
  template: z.enum(TEMPLATES),
  paleta: z.enum(PALETAS).nullable(),
  nome: z.string().min(2, 'Nome obrigatório').max(60, 'Nome muito longo'),
  tagline: z.string().max(140, 'Tagline muito longa').optional(),
})

function extensaoSegura(mime: string, fallback: string): string {
  switch (mime) {
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
    case 'image/svg+xml': return 'svg'
    default: return fallback
  }
}

function validarArquivo(arquivo: File, rotulo: string): string | null {
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return `${rotulo} excede o tamanho máximo de 5MB`
  }
  if (!MIME_PERMITIDOS.includes(arquivo.type as (typeof MIME_PERMITIDOS)[number])) {
    return `${rotulo} deve ser PNG, JPEG, WebP ou SVG`
  }
  return null
}

async function uploadAsset(
  supabase: ReturnType<typeof createSupabaseServer>,
  tenantId: string,
  arquivo: File,
  nomeBase: 'logo' | 'banner'
): Promise<{ url: string } | { erro: string }> {
  const ext = extensaoSegura(arquivo.type, nomeBase === 'logo' ? 'png' : 'jpg')
  const id = crypto.randomUUID()
  const caminho = `${tenantId}/${nomeBase}-${id}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: false,
    })

  if (error) return { erro: `Falha ao enviar ${nomeBase}: ${error.message}` }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
  return { url: data.publicUrl }
}

export async function publicarVitrine(formData: FormData): Promise<ResultadoAcao> {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id, slug')
    .eq('tenant_id', tenant.id)
    .single()
  if (!loja) return { erro: 'Loja não encontrada' }

  const paletaRaw = formData.get('paleta')
  const taglineRaw = formData.get('tagline')

  const parsed = schemaPublicar.safeParse({
    template: formData.get('template'),
    paleta: paletaRaw === null || paletaRaw === '' ? null : paletaRaw,
    nome: formData.get('nome'),
    tagline: taglineRaw && String(taglineRaw).length > 0 ? String(taglineRaw) : undefined,
  })
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  const theme: StoreTheme = {
    template: parsed.data.template as TemplateVitrine,
    paleta: parsed.data.paleta as PaletaVitrine | null,
  }

  const atualizacao: Record<string, unknown> = {
    nome: parsed.data.nome,
    descricao: parsed.data.tagline ?? null,
    theme,
  }

  const logo = formData.get('logo')
  if (logo instanceof File && logo.size > 0) {
    const erroValidacao = validarArquivo(logo, 'Logo')
    if (erroValidacao) return { erro: erroValidacao }
    const resultado = await uploadAsset(supabase, tenant.id, logo, 'logo')
    if ('erro' in resultado) return { erro: resultado.erro }
    atualizacao.logo_url = resultado.url
  }

  const banner = formData.get('banner')
  if (banner instanceof File && banner.size > 0) {
    const erroValidacao = validarArquivo(banner, 'Banner')
    if (erroValidacao) return { erro: erroValidacao }
    const resultado = await uploadAsset(supabase, tenant.id, banner, 'banner')
    if ('erro' in resultado) return { erro: resultado.erro }
    atualizacao.banner_url = resultado.url
  }

  const { error } = await supabase
    .from('stores')
    .update(atualizacao)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/minha-loja')
  if (loja.slug) revalidatePath(`/loja/${loja.slug}`)

  return { sucesso: true }
}

export async function alternarStatusLoja(ativo: boolean): Promise<ResultadoAcao> {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id, slug')
    .eq('tenant_id', tenant.id)
    .single()
  if (!loja) return { erro: 'Loja não encontrada' }

  const { error } = await supabase
    .from('stores')
    .update({ ativo })
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/minha-loja')
  if (loja.slug) revalidatePath(`/loja/${loja.slug}`)

  return { sucesso: true }
}
