import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Dados básicos da loja vindos da view pública `public_catalog_stores`
 * (criada na migration do Stage 0 — 20260515190000). A view já filtra
 * `ativo = true` e expõe só colunas seguras (sem tenant_id/endereco/etc).
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
  theme: unknown | null
}

/**
 * Slug da loja resolvido pelo middleware (header `x-store-slug`).
 * Roteamento host-based (D1): todo request já é uma loja, sem `/loja/[slug]`.
 * Retorna `null` no apex / www / subdomínio reservado.
 */
export function getStoreSlug(): string | null {
  return headers().get('x-store-slug')
}

/**
 * Carrega a loja pela view pública. Cache por request (`React.cache`):
 * múltiplas chamadas no mesmo request reaproveitam a query.
 *
 * Slug ausente / loja inexistente ou inativa (não aparece na view) →
 * `notFound()` → app/loja-nao-encontrada/page.tsx.
 */
export const getStore = cache(async (slug: string | null): Promise<Store> => {
  if (!slug) {
    notFound()
  }

  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from('public_catalog_stores')
    .select(
      'id, slug, nome, descricao, logo_url, banner_url, telefone, horarios, taxa_entrega, tempo_entrega, aceita_pix, aceita_cartao_online, categoria_id, theme'
    )
    .eq('slug', slug)
    .single()

  if (error || !data) {
    notFound()
  }

  return data as Store
})
