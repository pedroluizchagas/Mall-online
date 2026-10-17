/**
 * Endereço público de uma loja no storefront — a mesma regra de
 * apps/web/lib/storefront-url.ts. `NEXT_PUBLIC_STOREFRONT_URL_TEMPLATE`
 * aponta para outro ambiente; em desenvolvimento o padrão é o storefront
 * local em `*.mallevo.localhost:3002`.
 */
const TEMPLATE =
  process.env.NEXT_PUBLIC_STOREFRONT_URL_TEMPLATE ??
  (process.env.NODE_ENV === 'development' ? 'http://{slug}.mallevo.localhost:3002' : 'https://{slug}.mallevo.com.br')

export function urlDaLoja(slug: string): string {
  return TEMPLATE.replace('{slug}', slug)
}
