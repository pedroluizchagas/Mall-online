/**
 * Endereços públicos da loja no storefront. Fonte única: o botão "Ver loja
 * pública", o preview de Minha Loja e qualquer link para a vitrine montam a
 * URL aqui — não em strings espalhadas (havia `mallevo.app/` num lugar e
 * `<slug>.mallevo.com.br` em outro).
 *
 * `NEXT_PUBLIC_STOREFRONT_URL_TEMPLATE` (ex.: `https://{slug}.mallevo.com.br`)
 * permite apontar para outro ambiente; em desenvolvimento o padrão é o
 * storefront local em `*.mallevo.localhost:3002` (o middleware dele resolve
 * esse domínio; Firefox/Chrome resolvem `*.localhost` sozinhos).
 */
const TEMPLATE =
  process.env.NEXT_PUBLIC_STOREFRONT_URL_TEMPLATE ??
  (process.env.NODE_ENV === 'development'
    ? 'http://{slug}.mallevo.localhost:3002'
    : 'https://{slug}.mallevo.com.br')

export function urlDaLoja(slug: string): string {
  return TEMPLATE.replace('{slug}', slug)
}

/** Rascunho que o preview do storefront aceita (`/preview?draft=`). */
export interface RascunhoPreview {
  /** StoreThemeConfig v2 enxuto. */
  theme?: Record<string, unknown>
  /** StoreConteudo v1 (só texto/ids — fotos novas só depois de publicar). */
  conteudo?: Record<string, unknown>
  /** Simular outra categoria (o gate de vitrine é preset × categoria). */
  categoria?: string | null
}

function base64url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function urlPreviewDaLoja(
  slug: string,
  rascunho: RascunhoPreview,
  opcoes: { produtoId?: string | null } = {},
): string {
  const params = new URLSearchParams()
  params.set('draft', base64url(JSON.stringify(rascunho)))
  if (opcoes.produtoId) params.set('produto', opcoes.produtoId)
  return `${urlDaLoja(slug)}/preview?${params.toString()}`
}
