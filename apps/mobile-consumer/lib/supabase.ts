import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@mallevo/types'
import { criarSupabaseMock } from './mock/client'

/**
 * Modo demonstração: com `EXPO_PUBLIC_USE_MOCK=true` o app roda 100%
 * sobre o dataset em memória (lib/mock) — útil para apresentar o
 * shopping/pisos sem backend. Qualquer outro valor usa o Supabase real.
 */
const USAR_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true'

export const supabase: SupabaseClient<Database> = USAR_MOCK
  ? (criarSupabaseMock() as unknown as SupabaseClient<Database>)
  : createClient<Database>(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    )
