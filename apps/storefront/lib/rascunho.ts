import { hasExplicitPreset, normalizeStoreConteudo } from '@mallevo/lib'

import type { Store } from '@/lib/tenant'

/**
 * Rascunho do editor de Minha Loja (`/preview?draft=`): tema + conteúdo +
 * categoria simulada, codificados em base64url pelo dashboard
 * (`apps/web/lib/storefront-url.ts`). Aplicado SÓ neste request — nada é
 * persistido. Tudo aqui é dado público da loja: sem tema válido, mantém o
 * publicado; conteúdo passa pelo normalizador da lib; categoria só se for
 * um slug plausível.
 */
export interface Rascunho {
  theme?: unknown
  conteudo?: unknown
  categoria?: string | null
}

export function decodificarRascunho(draft: string | undefined): Rascunho | null {
  if (!draft) return null
  try {
    const json = Buffer.from(draft, 'base64url').toString('utf8')
    const obj = JSON.parse(json)
    return obj && typeof obj === 'object' ? (obj as Rascunho) : null
  } catch {
    return null
  }
}

export function aplicarRascunho(store: Store, rascunho: Rascunho | null): Store {
  if (!rascunho) return store
  const categoria =
    typeof rascunho.categoria === 'string' && /^[a-z0-9-]{2,60}$/.test(rascunho.categoria)
      ? rascunho.categoria
      : store.categoria_slug
  return {
    ...store,
    theme: hasExplicitPreset(rascunho.theme) ? rascunho.theme : store.theme,
    conteudo: rascunho.conteudo ? normalizeStoreConteudo(rascunho.conteudo) : store.conteudo,
    categoria_slug: categoria,
  }
}
