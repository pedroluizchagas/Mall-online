'use client'

import { createBrowserClient } from '@supabase/ssr'

// Singleton lazy: o browser client NÃO pode ser construído no servidor
// (SSR/prerender) — `createBrowserClient` é client-only. Cachear a
// instância também faz o `onAuthStateChange` do AuthProvider observar os
// sign-in/out disparados pelas telas de auth (mesma instância) e evita
// múltiplos GoTrueClient.
let cliente: ReturnType<typeof createBrowserClient> | undefined

export function createSupabaseClient() {
  if (!cliente) {
    cliente = createBrowserClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return cliente
}
