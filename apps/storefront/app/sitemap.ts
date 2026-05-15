import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { getStoreSlug, getStore } from '@/lib/tenant'
import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * sitemap.xml por tenant (host-based — D1). Reflete a loja do host:
 * a home da loja + uma entrada por produto disponível
 * (`public_catalog_products`, anon — D2). Produto/[id] é Stage 3b; a URL
 * `/produto/{id}` é incluída de forma antecipada para o SEO da loja já
 * mapear o catálogo (a rota passa a existir em 3b).
 *
 * Apex / slug inexistente / loja inativa → sitemap vazio.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (sitemap por tenant).
 */
export const dynamic = 'force-dynamic'

function baseUrl(): string {
  const h = headers()
  const host = h.get('host') ?? ''
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slug = getStoreSlug()
  if (!slug) return []

  let storeId: string
  try {
    const store = await getStore(slug)
    storeId = store.id
  } catch {
    return []
  }

  const base = baseUrl()
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
