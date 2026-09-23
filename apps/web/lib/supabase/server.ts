import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@mallevo/types'

/**
 * Cliente Supabase do servidor TIPADO pelo schema gerado (`@mallevo/types`).
 *
 * O `as unknown as SupabaseClient<Database>` é a ÚNICA conversão necessária e
 * não esconde erro de domínio: `@supabase/ssr@0.4.1` declara
 * `createServerClient<Database, SchemaName, Schema>` enquanto o
 * `SupabaseClient` do `@supabase/supabase-js@2.100` já espera
 * `<Database, ClientOptions, SchemaName, Schema>`. Com a lista antiga, o
 * `Schema` cai em `never` e TODA consulta volta como `never` (era o motivo de
 * o cliente estar em `<any>` e de os `as any` espalhados pelas actions).
 * Removê-la exige subir o `@supabase/ssr`.
 */
export function createSupabaseServer(): SupabaseClient<Database> {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignorado em Server Components (cookies são read-only)
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>
}

export function createSupabaseAdmin(): SupabaseClient<Database> {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  ) as unknown as SupabaseClient<Database>
}
