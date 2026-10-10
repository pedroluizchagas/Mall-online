import type { SupabaseClient } from '@supabase/supabase-js'
import type { Endereco } from '@mallevo/types'

/**
 * auth.ts — helpers de auth do storefront (Stage 3e).
 *
 * `getConsumer` lê o perfil do usuário da sessão pela RPC
 * `meu_perfil_consumidor` — endereços (e CPF/nascimento) não são legíveis
 * direto em `consumers` desde a migration 20261010150000. É leitura
 * AUTENTICADA — NÃO é catálogo, então não cai na restrição D2 (que vale só
 * para os dados de catálogo via views `public_catalog_*`). Shape espelha `ConsumerProfile` do `useAuthStore`
 * de @mallevo/lib (consumido sem edição).
 */

export interface ConsumerProfile {
  id: string
  nome: string
  telefone?: string | null
  foto_url?: string | null
  enderecos: Endereco[]
}

/** Linha que a RPC devolve (as colunas que o storefront usa). */
interface LinhaPerfil {
  id: string
  nome: string
  telefone: string | null
  foto_url: string | null
  enderecos: unknown
}

export async function getConsumer(
  supabase: SupabaseClient
): Promise<ConsumerProfile | null> {
  const { data, error } = await supabase.rpc('meu_perfil_consumidor').maybeSingle<LinhaPerfil>()

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
