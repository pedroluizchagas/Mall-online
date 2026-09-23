// supabase/functions/reconciliar-midia/index.ts
//
// Varre os buckets do lojista e lista (ou apaga) objetos que nenhuma linha do
// banco referencia mais. Follow-up do achado A-04 do plano de convergência:
// desde 2026-09-22 o dashboard apaga a mídia que ele mesmo substitui, mas nada
// limpa o que ficou órfão ANTES disso — nem o objeto perdido quando o upload
// dá certo e a gravação da linha falha.
//
// Buckets e quem referencia:
//   explore-media  {tenant}/{store}/…  → store_posts.media_path / thumb_path
//   product-images {tenant}/…          → products.foto_url, metadata.galeria[],
//                                        metadata.recorte, product_variants.foto_url,
//                                        service_staff.foto_url
//   store-assets   {tenant}/…          → stores.logo_url, banner_url,
//                                        conteudo.galeria_casa[], e as mesmas colunas
//                                        de foto acima (o partner sobe em um ou outro)
//
// ATENÇÃO: a parte perigosa é o levantamento acima, não a varredura. Coluna de
// mídia nova no schema sem entrar aqui = arquivo em uso marcado como órfão.
// Rodar SEMPRE em dry_run primeiro e conferir a lista antes de `apagar: true`.
//
// Uso (service_role obrigatório — é operação de manutenção, não de lojista):
//   POST /functions/v1/reconciliar-midia            → relatório, NÃO apaga
//   POST /functions/v1/reconciliar-midia {"apagar": true, "tenant_id": "..."}
//
// `dry_run` é o padrão de propósito: rodar, LER o relatório e só então apagar.
// A idade mínima (`idade_minima_horas`, 24 por padrão) evita competir com um
// upload em andamento, que ainda não gravou a linha.
import { getSupabaseAdmin, corsHeaders } from '../helpers/auth.ts'

interface Corpo {
  apagar?: boolean
  tenant_id?: string
  idade_minima_horas?: number
}

interface RelatorioBucket {
  bucket: string
  objetos: number
  orfaos: string[]
  apagados: number
  erro?: string
}

/** Caminho do objeto a partir da URL pública, ou null se não for deste bucket. */
function caminhoDaUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url || typeof url !== 'string') return null
  const marca = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length))
}

interface ObjetoListado {
  name: string
  id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface StorageDoBucket {
  list(
    prefixo: string,
    opcoes?: { limit?: number },
  ): Promise<{ data: ObjetoListado[] | null; error: { message: string } | null }>
  remove(caminhos: string[]): Promise<{ error: { message: string } | null }>
}

/** Lista recursiva de um prefixo do bucket (a API do Storage não recursa sozinha). */
async function listarRecursivo(
  storage: StorageDoBucket,
  prefixo: string,
  profundidade = 0,
): Promise<{ caminho: string; criadoEm: string }[]> {
  if (profundidade > 3) return []
  const { data, error } = await storage.list(prefixo, { limit: 1000 })
  if (error || !data) return []

  const saida: { caminho: string; criadoEm: string }[] = []
  for (const item of data) {
    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name
    // Pasta: o Storage devolve entrada sem `id`.
    if (!item.id) {
      saida.push(...(await listarRecursivo(storage, caminho, profundidade + 1)))
    } else {
      saida.push({ caminho, criadoEm: item.created_at ?? item.updated_at ?? '' })
    }
  }
  return saida
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  const cabecalhos = { ...corsHeaders(), 'Content-Type': 'application/json' }

  // Só service_role. Um lojista não reconcilia o bucket de ninguém, nem o dele.
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth || auth !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return new Response(JSON.stringify({ erro: 'Requer service_role' }), {
      status: 401,
      headers: cabecalhos,
    })
  }

  let corpo: Corpo = {}
  try {
    corpo = await req.json()
  } catch {
    // Sem corpo = relatório de tudo, sem apagar.
  }

  const apagar = corpo.apagar === true
  const tenantId = corpo.tenant_id ?? null
  const idadeMinimaMs = (corpo.idade_minima_horas ?? 24) * 3600 * 1000
  const limite = Date.now() - idadeMinimaMs

  const supabase = getSupabaseAdmin()
  const relatorio: RelatorioBucket[] = []

  // --- referências vivas, por bucket ---
  const vivos: Record<string, Set<string>> = {
    'explore-media': new Set(),
    'product-images': new Set(),
    'store-assets': new Set(),
  }

  let qPosts = supabase.from('store_posts').select('media_path, thumb_path')
  if (tenantId) qPosts = qPosts.eq('tenant_id', tenantId)
  const { data: posts } = await qPosts
  for (const p of posts ?? []) {
    if (p.media_path) vivos['explore-media'].add(p.media_path)
    if (p.thumb_path) vivos['explore-media'].add(p.thumb_path)
  }

  let qProdutos = supabase.from('products').select('foto_url, metadata, tenant_id')
  if (tenantId) qProdutos = qProdutos.eq('tenant_id', tenantId)
  const { data: produtos } = await qProdutos
  for (const prod of produtos ?? []) {
    const meta = (prod.metadata ?? {}) as Record<string, unknown>
    const urls = [
      prod.foto_url,
      ...(Array.isArray(meta.galeria) ? (meta.galeria as string[]) : []),
      typeof meta.recorte === 'string' ? meta.recorte : null,
    ]
    for (const u of urls) {
      const c = caminhoDaUrl(u, 'product-images')
      if (c) vivos['product-images'].add(c)
    }
  }

  // `product_variants.foto_url` e `service_staff.foto_url` moram nos MESMOS
  // buckets. Sem eles aqui, a reconciliação chamaria de órfã uma foto em uso —
  // o levantamento de quem referencia cada bucket é a parte crítica desta
  // função, não a varredura. Ao acrescentar coluna de mídia no schema,
  // acrescentar aqui também.
  for (const [tabela, colunaEscopo] of [
    ['product_variants', 'tenant_id'],
    ['service_staff', 'tenant_id'],
  ] as const) {
    let q = supabase.from(tabela).select('foto_url')
    if (tenantId) q = q.eq(colunaEscopo, tenantId)
    const { data } = await q
    for (const linha of data ?? []) {
      for (const bucket of ['product-images', 'store-assets']) {
        const c = caminhoDaUrl(linha.foto_url, bucket)
        if (c) vivos[bucket].add(c)
      }
    }
  }

  let qLojas = supabase.from('stores').select('logo_url, banner_url, conteudo, tenant_id')
  if (tenantId) qLojas = qLojas.eq('tenant_id', tenantId)
  const { data: lojas } = await qLojas
  for (const loja of lojas ?? []) {
    const conteudo = (loja.conteudo ?? {}) as Record<string, unknown>
    const urls = [
      loja.logo_url,
      loja.banner_url,
      ...(Array.isArray(conteudo.galeria_casa) ? (conteudo.galeria_casa as string[]) : []),
    ]
    for (const u of urls) {
      const c = caminhoDaUrl(u, 'store-assets')
      if (c) vivos['store-assets'].add(c)
    }
  }

  // --- varredura ---
  for (const bucket of Object.keys(vivos)) {
    const storage = supabase.storage.from(bucket) as unknown as StorageDoBucket
    try {
      const objetos = await listarRecursivo(storage, tenantId ?? '')
      const orfaos = objetos
        .filter((o) => !vivos[bucket].has(o.caminho))
        // Recém-criado pode ser upload em curso cuja linha ainda não existe.
        .filter((o) => !o.criadoEm || new Date(o.criadoEm).getTime() < limite)
        .map((o) => o.caminho)

      let apagados = 0
      if (apagar && orfaos.length > 0) {
        // O Storage aceita até 1000 chaves por chamada.
        for (let i = 0; i < orfaos.length; i += 500) {
          const lote = orfaos.slice(i, i + 500)
          const { error } = await storage.remove(lote)
          if (!error) apagados += lote.length
          else console.error(JSON.stringify({ acao: 'remover', bucket, erro: error.message }))
        }
      }

      relatorio.push({ bucket, objetos: objetos.length, orfaos, apagados })
    } catch (e) {
      relatorio.push({
        bucket,
        objetos: 0,
        orfaos: [],
        apagados: 0,
        erro: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const total = relatorio.reduce((n, r) => n + r.orfaos.length, 0)
  console.log(
    JSON.stringify({
      acao: 'reconciliar-midia',
      modo: apagar ? 'apagar' : 'dry_run',
      tenant_id: tenantId,
      orfaos: total,
      apagados: relatorio.reduce((n, r) => n + r.apagados, 0),
    }),
  )

  return new Response(
    JSON.stringify({ modo: apagar ? 'apagar' : 'dry_run', tenant_id: tenantId, total, relatorio }),
    { headers: cabecalhos },
  )
})
