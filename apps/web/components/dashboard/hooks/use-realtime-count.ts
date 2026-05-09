'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

type TabelaRealtime = 'orders' | 'messages' | 'store_reviews'

interface OpcoesRealtimeCount {
  table: TabelaRealtime
  /** Filtros server-side aplicados como `eq`. Para múltiplas chaves,
   *  apenas a primeira vai no canal Realtime; as demais ficam no
   *  callback (Realtime do Postgres aceita só uma condição). */
  filtroEq?: Record<string, string | number>
  inicial: number
}

function bate(linha: Record<string, unknown> | undefined, filtros: Record<string, string | number>) {
  if (!linha) return false
  for (const chave of Object.keys(filtros)) {
    if (linha[chave] !== filtros[chave]) return false
  }
  return true
}

/**
 * Mantém um contador reativo de linhas que satisfazem `filtroEq`. Faz
 * um `select count(*)` ao montar para garantir consistência com o
 * banco e depois ajusta delta a cada evento de `postgres_changes`.
 */
export function useRealtimeCount({ table, filtroEq, inicial }: OpcoesRealtimeCount): number {
  const [count, setCount] = useState<number>(inicial)

  useEffect(() => {
    const supabase = createSupabaseClient()
    const filtros = filtroEq ?? {}
    const chaves = Object.keys(filtros)
    const primeiraChave = chaves[0]
    const filtroCanal = primeiraChave
      ? `${primeiraChave}=eq.${filtros[primeiraChave]}`
      : undefined

    let cancelado = false

    async function refetch() {
      let q = supabase.from(table).select('*', { count: 'exact', head: true })
      for (const chave of chaves) {
        q = q.eq(chave, filtros[chave])
      }
      const { count: total } = await q
      if (!cancelado && typeof total === 'number') setCount(total)
    }

    void refetch()

    const canal = supabase
      .channel(`realtime-count:${table}:${primeiraChave ?? 'all'}:${filtroCanal ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filtroCanal ? { filter: filtroCanal } : {}),
        },
        (payload) => {
          if (cancelado) return
          const novo = payload.new as Record<string, unknown> | undefined
          const antigo = payload.old as Record<string, unknown> | undefined

          if (payload.eventType === 'INSERT') {
            if (bate(novo, filtros)) setCount((n) => n + 1)
          } else if (payload.eventType === 'DELETE') {
            if (bate(antigo, filtros)) setCount((n) => Math.max(0, n - 1))
          } else if (payload.eventType === 'UPDATE') {
            const antigoBate = bate(antigo, filtros)
            const novoBate = bate(novo, filtros)
            if (!antigoBate && novoBate) setCount((n) => n + 1)
            else if (antigoBate && !novoBate) setCount((n) => Math.max(0, n - 1))
          }
        }
      )
      .subscribe()

    return () => {
      cancelado = true
      void supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(filtroEq)])

  return count
}
