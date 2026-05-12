'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

// Assina INSERTs em `messages` (filtrando localmente para threads desta página)
// e em `message_threads`, e dispara router.refresh() — sem mutar estado local.
export function RealtimeListaThreads({ threadIds }: { threadIds: string[] }) {
  const router = useRouter()

  useEffect(() => {
    if (threadIds.length === 0) return
    const supabase = createSupabaseClient()
    const setIds = new Set(threadIds)

    const canal = supabase
      .channel(`realtime:mensagens-lista:${threadIds.length}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const novo = payload.new as { thread_id?: string } | undefined
          if (novo?.thread_id && setIds.has(novo.thread_id)) {
            router.refresh()
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_threads' },
        () => router.refresh(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadIds.join(',')])

  return null
}
