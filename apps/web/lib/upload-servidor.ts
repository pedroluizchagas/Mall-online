import type { SupabaseClient } from '@supabase/supabase-js'
import { urlPublicaDoBucket } from '@mallevo/lib'
import type { Database } from '@mallevo/types'

/**
 * Mídia gravada pelas server actions do dashboard: de onde ela PODE vir e o
 * que fazer com a que sai de cena. Só é importado por arquivos `'use server'`
 * (não há `server-only` instalado no app — o guarda-corpo é este comentário e
 * o fato de nada aqui rodar sem o cliente do servidor).
 *
 * Regras do plano de convergência §2:
 *  - R2: toda referência a mídia é validada por prefixo do tenant E por
 *    bucket. "Parece https" não é critério (A-03).
 *  - R3: substituir ou remover mídia apaga o objeto antigo — nada fica órfão
 *    no Storage (A-04).
 */

type Supabase = SupabaseClient<Database>

/** Extensão do objeto pelo MIME declarado, nunca pelo nome do arquivo do lojista. */
export function extensaoSegura(mime: string, fallback: string): string {
  switch (mime) {
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
    case 'image/svg+xml': return 'svg'
    default: return fallback
  }
}

function baseSupabase(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

/**
 * `https://<projeto>/storage/v1/object/public/<bucket>/<tenant>/` — o único
 * começo aceitável para uma URL de mídia deste tenant neste bucket.
 */
export function prefixoPublicoDoTenant(bucket: string, tenantId: string, supabaseUrl = baseSupabase()): string {
  return urlPublicaDoBucket(supabaseUrl, bucket, `${tenantId}/`)
}

/**
 * Caminho do objeto a partir da URL pública, SE ela for deste bucket e deste
 * tenant. Qualquer outra coisa (URL externa, outro bucket, outro tenant)
 * devolve `null`.
 */
export function caminhoDaUrlPublica(
  url: string,
  bucket: string,
  tenantId: string,
  supabaseUrl = baseSupabase(),
): string | null {
  if (typeof url !== 'string' || !url) return null
  const prefixo = prefixoPublicoDoTenant(bucket, tenantId, supabaseUrl)
  if (!supabaseUrl || !url.startsWith(prefixo)) return null
  const caminho = `${tenantId}/${url.slice(prefixo.length)}`
  if (caminho.includes('..') || caminho.endsWith('/')) return null
  return caminho
}

/**
 * Filtra as URLs que o formulário diz ter "mantido" pelo conjunto **já
 * gravado** naquele registro: só sobrevive o que o banco já tinha. Preserva a
 * ordem escolhida pelo lojista (reordenar é legítimo) e remove duplicatas.
 *
 * É a checagem certa para um campo "mantida" (A-03): ela não deixa entrar NADA
 * de novo por ali — URL externa, objeto de outro tenant, nem outro objeto do
 * mesmo tenant. Mídia nova entra só por upload de verdade, que sempre gera URL
 * do bucket.
 *
 * Por que não filtrar pelo prefixo do bucket: isso parece seguro e é pior nos
 * dois sentidos. Aceita qualquer objeto do tenant (inclusive um que não é deste
 * produto) e **apaga em silêncio** o que está gravado e não mora no bucket —
 * foi o que o e2e pegou em 2026-09-22: as fotos do seed (picsum) sumiam da
 * galeria assim que o lojista salvava o produto por qualquer motivo.
 */
export function manterDoConjunto(bruto: unknown, jaGravadas: readonly string[]): string[] {
  if (!Array.isArray(bruto)) return []
  const permitidas = new Set(jaGravadas.filter((u) => typeof u === 'string'))
  const vistas = new Set<string>()
  const out: string[] = []
  for (const u of bruto) {
    if (typeof u !== 'string' || !permitidas.has(u) || vistas.has(u)) continue
    vistas.add(u)
    out.push(u)
  }
  return out
}

/**
 * Filtra URLs pelo bucket e prefixo do tenant. Use para conteúdo que o cliente
 * MONTA (caminho de upload que ele acabou de fazer), não para um campo
 * "mantida" — nesse caso o certo é `manterDoConjunto`.
 */
export function filtrarUrlsDoTenant(
  urls: unknown,
  bucket: string,
  tenantId: string,
  supabaseUrl = baseSupabase(),
): string[] {
  if (!Array.isArray(urls)) return []
  const vistas = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    if (typeof u !== 'string') continue
    if (!caminhoDaUrlPublica(u, bucket, tenantId, supabaseUrl)) continue
    if (vistas.has(u)) continue
    vistas.add(u)
    out.push(u)
  }
  return out
}

/**
 * O que saiu de cena: estava gravado e não está entre as mantidas (A-04).
 * Função pura — é ela que os testes cobrem.
 */
export function diffDeMidia(
  antigas: readonly (string | null | undefined)[] | null | undefined,
  mantidas: readonly (string | null | undefined)[] | null | undefined,
): string[] {
  if (!Array.isArray(antigas)) return []
  const ficam = new Set((mantidas ?? []).filter((u): u is string => typeof u === 'string' && u.length > 0))
  const vistas = new Set<string>()
  const out: string[] = []
  for (const u of antigas) {
    if (typeof u !== 'string' || !u) continue
    if (ficam.has(u) || vistas.has(u)) continue
    vistas.add(u)
    out.push(u)
  }
  return out
}

/**
 * Apaga objetos do bucket — best-effort, depois que a linha já foi gravada.
 * Aceita URL pública ou caminho; o que não estiver sob `{tenantId}/` é
 * descartado sem tentar remover. Falha não derruba a action (o lojista já
 * salvou); fica o log estruturado para a reconciliação.
 */
export async function removerObjetosDoTenant(
  supabase: Supabase,
  bucket: string,
  urlsOuPaths: readonly (string | null | undefined)[],
  tenantId: string,
): Promise<void> {
  const paths: string[] = []
  for (const entrada of urlsOuPaths) {
    if (typeof entrada !== 'string' || !entrada) continue
    const caminho = entrada.startsWith('http')
      ? caminhoDaUrlPublica(entrada, bucket, tenantId)
      : entrada
    if (!caminho) continue
    if (!caminho.startsWith(`${tenantId}/`) || caminho.includes('..')) continue
    if (!paths.includes(caminho)) paths.push(caminho)
  }
  if (paths.length === 0) return

  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) {
    console.error({ acao: 'removerObjetosDoTenant', bucket, paths, erro: error.message })
  }
}
