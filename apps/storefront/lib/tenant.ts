import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Dados básicos da loja vindos da view pública `public_catalog_stores`
 * (Stage 0 — 20260515190000; `categoria_slug` desde 20260516160000;
 * `conteudo` desde 20260919120000). A view já filtra `ativo = true` e expõe
 * só colunas seguras (sem tenant_id/endereco/etc).
 */
export type Store = {
  id: string
  slug: string
  nome: string
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
  telefone: string | null
  horarios: unknown | null
  taxa_entrega: number | null
  tempo_entrega: string | null
  // Gateway-only (storefront): `aceita_dinheiro`/`aceita_cartao_maquininha`
  // permanecem no schema mas não são expostas aqui — política Mallevo,
  // ver docs/storefront/05-stage-3-storefront.md §3d.
  aceita_pix: boolean | null
  aceita_cartao_online: boolean | null
  categoria_id: string | null
  /** Slug da categoria — gate de vitrine (`resolveVitrine`, @mallevo/lib). */
  categoria_slug: string | null
  /** `StoreThemeConfig` cru — resolvido em @mallevo/lib. */
  theme: unknown | null
  /** `StoreConteudo` cru (campanha/manifesto/…) — normalizado em @mallevo/lib. */
  conteudo: unknown | null
}

/**
 * `*` de propósito: a view pública JÁ é a lista de colunas seguras (D2), e
 * selecionar colunas nomeadas acopla o deploy do storefront ao da migration —
 * com `conteudo` explícito, um storefront novo contra um banco ainda sem a
 * coluna derruba TODA loja em 404 ("column does not exist"). Com `*`, coluna
 * ausente chega `undefined` e os normalizadores da lib caem nos defaults.
 */
const COLUNAS = '*'

/**
 * Slug da loja resolvido pelo middleware (header `x-store-slug`).
 * Roteamento host-based (D1): todo request já é uma loja, sem `/loja/[slug]`.
 * Retorna `null` no apex / www / subdomínio reservado.
 */
export function getStoreSlug(): string | null {
  return headers().get('x-store-slug')
}

/**
 * Carrega a loja pela view pública, ou `null` (slug ausente, loja inexistente
 * ou inativa). Cache por request (`React.cache`): layout, página, metadata,
 * sitemap e robots compartilham a mesma query.
 */
export const buscarStore = cache(async (slug: string | null): Promise<Store | null> => {
  if (!slug) return null

  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('public_catalog_stores')
    .select(COLUNAS)
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  const row = data as Partial<Store>
  return {
    ...row,
    categoria_slug: row.categoria_slug ?? null,
    theme: row.theme ?? null,
    conteudo: row.conteudo ?? null,
  } as Store
})

/**
 * Loja obrigatória: ausente → `notFound()` → app/not-found.tsx
 * ("loja não encontrada"). Use nas páginas; o layout usa `buscarStore`.
 */
export async function getStore(slug: string | null): Promise<Store> {
  const store = await buscarStore(slug)
  if (!store) notFound()
  return store
}
