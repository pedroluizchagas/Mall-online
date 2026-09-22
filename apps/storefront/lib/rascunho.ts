import { normalizeStoreConteudo, parseStoreTheme } from '@mallevo/lib'

import type { Store } from '@/lib/tenant'

/**
 * Teto do `?draft=` em bytes. O rascunho real (tema + campanha + manifesto +
 * destaques) fica na casa de 1 KB; 8 KB dá folga larga e corta payload
 * fabricado antes do `JSON.parse`.
 */
const TETO_DRAFT_BYTES = 8 * 1024

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
  if (!draft || draft.length > TETO_DRAFT_BYTES) return null
  try {
    const json = Buffer.from(draft, 'base64url').toString('utf8')
    if (json.length > TETO_DRAFT_BYTES) return null
    const obj = JSON.parse(json)
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as Rascunho) : null
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
  // `parseStoreTheme` valida campo a campo (achado A-01): `color`/`fonts`/
  // `shape` hostis são descartados aqui, antes de virarem CSS var no
  // `StoreThemeRoot`. Sem preset válido, mantém o tema publicado.
  const temaDoRascunho = parseStoreTheme(rascunho.theme)

  return {
    ...store,
    theme: temaDoRascunho ?? store.theme,
    conteudo: rascunho.conteudo ? normalizeStoreConteudo(rascunho.conteudo) : store.conteudo,
    categoria_slug: categoria,
  }
}
