'use client'

import { useEffect, useState } from 'react'
import { useOrderStore } from '@mallevo/lib'

import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * useLocalizacaoCourier — port de
 * apps/mobile-consumer/hooks/useLocalizacaoCourier.ts (Stage 3f).
 * Lê `courier_locations` (auth/RLS) + Realtime UPDATE. `useOrderStore`
 * consumido de @mallevo/lib SEM editar (espelha 3c/3e).
 *
 * Storefront usa o singleton browser do `client.ts` (mesmo do
 * AuthProvider) — o effect só roda no client, então é seguro.
 */

interface Localizacao {
  latitude: number
  longitude: number
}

export function useLocalizacaoCourier(
  courierId: string | null | undefined
): Localizacao | null {
  const setLocalizacaoEntregador = useOrderStore(
    (s) => s.setLocalizacaoEntregador
  )
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null)

  useEffect(() => {
    if (!courierId) {
      setLocalizacao(null)
      setLocalizacaoEntregador(null)
      return
    }

    const supabase = createSupabaseClient()

    supabase
      .from('courier_locations')
      .select('latitude, longitude')
      .eq('courier_id', courierId)
      .single()
      .then(({ data }) => {
        if (data) {
          const coords = {
            latitude: data.latitude,
            longitude: data.longitude,
          }
          setLocalizacao(coords)
          setLocalizacaoEntregador(coords)
        }
      })

    const canal = supabase
      .channel(`loc-consumer-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          const coords = {
            latitude: (payload.new as { latitude: number }).latitude,
            longitude: (payload.new as { longitude: number }).longitude,
          }
          setLocalizacao(coords)
          setLocalizacaoEntregador(coords)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [courierId, setLocalizacaoEntregador])

  return localizacao
}
