import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service_role para uso EXCLUSIVO do app admin.
 *
 * Necessário para operações que ignoram RLS — em particular UPDATE em
 * `stores.categoria_id`, que está bloqueado pela policy `stores_update_self`
 * (categoria é imutável em auto-serviço; troca é operação de super-admin).
 *
 * NUNCA importar este helper em código que rode no navegador.
 */
export function createSupabaseAdminServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}
