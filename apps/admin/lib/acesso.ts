import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Quem está na sessão desta requisição. O `cache` do React faz o layout, a
 * moldura e a página dividirem UMA ida ao Auth (antes eram três em série a
 * cada tela); fora de uma renderização ele só repassa a chamada.
 */
export const usuarioDaSessao = cache(async (): Promise<User | null> => {
  const supabase = createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Segunda porta da administração (a primeira é o middleware): toda leitura e
 * toda ação confere o papel de novo. O papel vem de `app_metadata`, que só o
 * servidor grava — `user_metadata` o próprio usuário edita pelo SDK.
 */
export async function exigirAdmin(): Promise<User> {
  const user = await usuarioDaSessao()
  if (!user || user.app_metadata?.role !== 'admin') throw new Error('Acesso negado')
  return user
}
