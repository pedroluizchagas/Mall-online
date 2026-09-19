'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  ARQUETIPOS,
  CONTEUDO_LIMITES,
  getPaleta,
  hasConteudo,
  storeConteudoSchema,
  type ArquetipoCodigo,
  type StoreConteudo,
} from '@mallevo/lib'

const BUCKET = 'store-assets'
const TAMANHO_MAX_BYTES = 5 * 1024 * 1024
const MIME_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const

// Os 21 arquétipos (presets v2). Fonte da verdade: @mallevo/lib.
const PRESETS = Object.keys(ARQUETIPOS) as [ArquetipoCodigo, ...ArquetipoCodigo[]]
const HEX = /^#[0-9a-fA-F]{6}$/

type ResultadoAcao = { sucesso: true } | { erro: string }

const schemaPublicar = z.object({
  preset: z.enum(PRESETS),
  // Paleta curada do arquétipo (código em PALETAS, @mallevo/lib). Validada
  // contra o preset abaixo — desconhecida → descartada (original).
  palette: z.string().max(40).optional().nullable(),
  // Override opcional da cor de destaque (hex). accentInk é derivado no
  // resolveTheme (contraste WCAG garantido) na hora de renderizar.
  accent: z
    .string()
    .regex(HEX, 'Cor inválida')
    .optional()
    .nullable(),
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
  nomeBase: 'logo' | 'banner' | 'casa'
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

  const accentRaw = formData.get('accent')
  const paletteRaw = formData.get('palette')
  const taglineRaw = formData.get('tagline')

  const parsed = schemaPublicar.safeParse({
    preset: formData.get('preset'),
    palette: paletteRaw === null || paletteRaw === '' ? null : paletteRaw,
    accent: accentRaw === null || accentRaw === '' ? null : accentRaw,
    nome: formData.get('nome'),
    tagline: taglineRaw && String(taglineRaw).length > 0 ? String(taglineRaw) : undefined,
  })
  if (!parsed.success) return { erro: parsed.error.errors[0].message }

  // Paleta só persiste se existir no catálogo do preset (fonte: @mallevo/lib).
  const paletteValida =
    parsed.data.palette && getPaleta(parsed.data.preset, parsed.data.palette)
      ? parsed.data.palette
      : null

  // StoreThemeConfig v2: preset + paleta + override opcional de cor. JSON
  // enxuto — accentInk e o resto da pele são derivados pelo resolveTheme.
  const theme: Record<string, unknown> = {
    v: 2,
    preset: parsed.data.preset,
    ...(paletteValida ? { palette: paletteValida } : {}),
    ...(parsed.data.accent ? { color: { accent: parsed.data.accent } } : {}),
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

  // Conteúdo editorial (StoreConteudo v1): texto validado pelo schema da lib;
  // fotos da casa = mantidas + novas (bucket store-assets, `casa-*`);
  // destaques filtrados para produtos DESTA loja.
  const conteudoResultado = await montarConteudo(supabase, tenant.id, loja.id, formData)
  if ('erro' in conteudoResultado) return { erro: conteudoResultado.erro }
  atualizacao.conteudo = conteudoResultado.conteudo

  const { error } = await supabase
    .from('stores')
    .update(atualizacao)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/minha-loja')

  return { sucesso: true }
}

async function montarConteudo(
  supabase: ReturnType<typeof createSupabaseServer>,
  tenantId: string,
  storeId: string,
  formData: FormData,
): Promise<{ conteudo: StoreConteudo | null } | { erro: string }> {
  const bruto = formData.get('conteudo')
  if (typeof bruto !== 'string' || !bruto) return { conteudo: null }

  let texto: unknown
  try {
    texto = JSON.parse(bruto)
  } catch {
    return { erro: 'Falha ao ler o conteúdo da vitrine' }
  }

  // Fotos da casa: mantidas (URLs já publicadas) + novas (upload).
  let mantidas: string[] = []
  const brutoMantidas = formData.get('galeria_casa_mantida')
  if (typeof brutoMantidas === 'string' && brutoMantidas) {
    try {
      const lista = JSON.parse(brutoMantidas)
      if (Array.isArray(lista)) {
        mantidas = lista.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
      }
    } catch {
      return { erro: 'Falha ao ler as fotos da casa' }
    }
  }
  const novas = formData.getAll('galeria_casa').filter((f): f is File => f instanceof File && f.size > 0)
  const urls: string[] = []
  for (const foto of novas) {
    const erroValidacao = validarArquivo(foto, 'Foto da casa')
    if (erroValidacao) return { erro: erroValidacao }
    const resultado = await uploadAsset(supabase, tenantId, foto, 'casa')
    if ('erro' in resultado) return { erro: resultado.erro }
    urls.push(resultado.url)
  }
  const galeria_casa = [...mantidas, ...urls].slice(0, CONTEUDO_LIMITES.galeriaCasa)

  const candidato = {
    ...(texto && typeof texto === 'object' ? (texto as Record<string, unknown>) : {}),
    v: 1,
    ...(galeria_casa.length > 0 ? { galeria_casa } : { galeria_casa: undefined }),
  }
  const parsed = storeConteudoSchema.safeParse(candidato)
  if (!parsed.success) return { erro: `Conteúdo da vitrine: ${parsed.error.errors[0].message}` }

  // Destaques só podem apontar para produtos desta loja.
  let conteudo = parsed.data
  if (conteudo.destaques && conteudo.destaques.length > 0) {
    const { data: validos } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .in('id', conteudo.destaques)
    const ids = new Set((validos ?? []).map((p: { id: string }) => p.id))
    const filtrados = conteudo.destaques.filter((id) => ids.has(id))
    conteudo = { ...conteudo, destaques: filtrados.length > 0 ? filtrados : undefined }
  }

  return { conteudo: hasConteudo(conteudo) ? conteudo : null }
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

  return { sucesso: true }
}
