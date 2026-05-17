import type { SupabaseClient } from '@supabase/supabase-js'
import type { Endereco } from '@mallevo/types'

/**
 * auth.ts — helpers de auth do storefront (Stage 3e).
 *
 * `getConsumer` lê o perfil em `consumers` por `user_id`. É leitura
 * AUTENTICADA (RLS por usuário) — NÃO é catálogo, então não cai na
 * restrição D2 (que vale só para os dados de catálogo via views
 * `public_catalog_*`). Shape espelha `ConsumerProfile` do `useAuthStore`
 * de @mallevo/lib (consumido sem edição).
 */

export interface ConsumerProfile {
  id: string
  nome: string
  telefone?: string | null
  foto_url?: string | null
  enderecos: Endereco[]
}

export async function getConsumer(
  supabase: SupabaseClient,
  userId: string
): Promise<ConsumerProfile | null> {
  const { data, error } = await supabase
    .from('consumers')
    .select('id, nome, telefone, foto_url, enderecos')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    nome: data.nome,
    telefone: data.telefone ?? null,
    foto_url: data.foto_url ?? null,
    enderecos: Array.isArray(data.enderecos)
      ? (data.enderecos as Endereco[])
      : [],
  }
}
