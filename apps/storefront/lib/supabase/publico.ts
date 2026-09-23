import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente anon SEM cookies — o do saguão (A-12).
 *
 * `createSupabaseServer` (@supabase/ssr) chama `cookies()`, e `cookies()`
 * dentro de uma função embrulhada em `unstable_cache` é erro em tempo de
 * execução no Next 14: o resultado cacheado não pode depender do request.
 * O saguão é anônimo por definição (só views `public_*`, D2), então aqui
 * não há sessão para carregar — e sem cookie a resposta é a mesma para
 * todo visitante, que é o pré-requisito de poder cachear.
 *
 * Instância única de módulo: o client do supabase-js é stateless neste
 * modo (`persistSession: false`) e criar um por chamada só custa alocação.
 */
let cliente: SupabaseClient | null = null

export function createSupabasePublico(): SupabaseClient {
  if (cliente) return cliente
  cliente = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'x-mallevo-superficie': 'saguao' } },
    },
  )
  return cliente
}
