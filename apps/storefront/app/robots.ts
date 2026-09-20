import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { getStoreSlug, getStore } from '@/lib/tenant'
import { urlDoShopping } from '@/lib/saguao'

/**
 * robots.txt por tenant (host-based — D1). Loja válida → indexável,
 * apontando o sitemap do próprio host. Apex → saguão indexável. Slug
 * inexistente / loja inativa → bloqueia indexação.
 *
 * Dinâmico: depende do header `host` (via getStoreSlug/getStore).
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3a (robots por tenant).
 */
export const dynamic = 'force-dynamic'

function baseUrl(): string {
  const h = headers()
  const host = h.get('host') ?? ''
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const slug = getStoreSlug()

  // Apex = saguão (Fase 5): indexável, com o sitemap do shopping.
  if (!slug) {
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/preview', '/saguao'] },
      sitemap: `${urlDoShopping()}/sitemap.xml`,
    }
  }

  try {
    await getStore(slug)
  } catch {
    // Loja inexistente/inativa: nada para indexar.
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/preview'] },
    sitemap: `${baseUrl()}/sitemap.xml`,
  }
}
