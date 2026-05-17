'use client'

import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@mallevo/lib'

import { createSupabaseClient } from '@/lib/supabase/client'
import { getConsumer } from '@/lib/auth'

/**
 * AuthProvider — bootstrap de auth do storefront (Stage 3e).
 *
 * Espelha o bloco `onAuthStateChange` de
 * apps/mobile-consumer/app/_layout.tsx, estendido conforme §3e para
 * também hidratar o perfil `consumer` (via `getConsumer`). Hidrata
 * `useAuthStore` de @mallevo/lib SEM editar o store (mesmo princípio do
 * 3c/CartPersistence). Montado uma vez no `app/layout.tsx`.
 *
 * Sessão escopada ao subdomínio (D5): cookies host-scoped vêm do
 * `@supabase/ssr` (browser client) + middleware; este componente não
 * mexe em cookies.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setConsumer = useAuthStore((s) => s.setConsumer)
  const setCarregando = useAuthStore((s) => s.setCarregando)

  useEffect(() => {
    // Client-only: criado dentro do efeito p/ não construir o browser
    // client no SSR/prerender (singleton compartilhado via client.ts).
    const supabase = createSupabaseClient()
    let ativo = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!ativo) return
      setUser(session?.user ?? null)
      if (session?.user) {
        const perfil = await getConsumer(supabase, session.user.id)
        if (ativo) setConsumer(perfil)
      }
      if (ativo) setCarregando(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const perfil = await getConsumer(supabase, session.user.id)
        setConsumer(perfil)
      } else {
        setConsumer(null)
      }
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [setUser, setConsumer, setCarregando])

  return <>{children}</>
}
