'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export function RealtimeThread({ threadId }: { threadId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseClient()
    const canal = supabase
      .channel(`realtime:thread:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => router.refresh(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [router, threadId])

  return null
}
