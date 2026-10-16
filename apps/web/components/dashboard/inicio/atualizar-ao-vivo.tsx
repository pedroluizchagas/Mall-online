'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * Mantém o Início ao vivo: qualquer mudança em `orders` da loja refaz a
 * renderização do servidor (`router.refresh`), então números do dia, fila e
 * gráfico andam juntos — sem um estado paralelo no cliente para divergir.
 * Rajadas de eventos (um pedido muda de status três vezes) viram um refresh.
 */
export function AtualizarAoVivo({ tenantId }: { tenantId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseClient()
    let espera: number | undefined

    const canal = supabase
      .channel(`inicio:orders:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` },
        () => {
          window.clearTimeout(espera)
          espera = window.setTimeout(() => router.refresh(), 700)
        },
      )
      .subscribe()

    return () => {
      window.clearTimeout(espera)
      void supabase.removeChannel(canal)
    }
  }, [tenantId, router])

  return null
}
