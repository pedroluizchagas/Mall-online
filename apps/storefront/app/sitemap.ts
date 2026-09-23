import type { MetadataRoute } from 'next'

import { getStoreSlug, getStore } from '@/lib/tenant'
import { createSupabaseServer } from '@/lib/supabase/server'
import { agruparPorPiso } from '@mallevo/lib'
import { carregarLojas, urlDaLoja, urlDoHostAtual, urlDoShopping } from '@/lib/saguao'

/**
 * sitemap.xml por tenant (host-based — D1). Reflete a loja do host:
 * a home da loja + uma entrada por produto disponível
 * (`public_catalog_products`, anon — D2). Produto/[id] é Stage 3b; a URL
 * `/produto/{id}` é incluída de forma antecipada para o SEO da loja já
 * mapear o catálogo (a rota passa a existir em 3b).
 *
 * Apex (saguão, Fase 5): home, Explorar, pisos com loja e a home de cada
 * loja ativa em `<slug>.<domínio>`. Slug inexistente / loja inativa → vazio.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (sitemap por tenant).
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slug = getStoreSlug()
  if (!slug) return sitemapDoSaguao()

  let storeId: string
  try {
    const store = await getStore(slug)
    storeId = store.id
  } catch {
    return []
  }

  // Mesma normalização de host do saguão (`lib/saguao.ts`): protocolo por
  // domínio e porta preservada — a heurística local montava a base com o
  // header `host` cru (A-21).
  const base = urlDoHostAtual()
  const now = new Date()

  const supabase = createSupabaseServer()
  const { data } = await supabase
    .from('public_catalog_products')
    .select('id')
    .eq('store_id', storeId)
    .order('ordem', { ascending: true, nullsFirst: false })

  const produtos: MetadataRoute.Sitemap = (data ?? []).map(
    (p: { id: string }) => ({
      url: `${base}/produto/${p.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    })
  )

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...produtos,
  ]
}


/** Sitemap do apex: o saguão e a porta de cada loja. */
async function sitemapDoSaguao(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoShopping()
  const now = new Date()
  const lojas = await carregarLojas()
  const pisos = agruparPorPiso(lojas)
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/explorar`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    ...pisos.map(({ piso }) => ({
      url: `${base}/piso/${piso.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...lojas.map((l) => ({
      url: `${urlDaLoja(l.slug)}/`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]
}
