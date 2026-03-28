import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrderStore } from '@/store/useOrderStore'

interface Localizacao {
  latitude: number
  longitude: number
}

export function useLocalizacaoCourier(
  courierId: string | null | undefined
): Localizacao | null {
  const { setLocalizacaoEntregador } = useOrderStore()
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null)

  useEffect(() => {
    if (!courierId) {
      setLocalizacao(null)
      setLocalizacaoEntregador(null)
      return
    }

    supabase
      .from('courier_locations')
      .select('latitude, longitude')
      .eq('courier_id', courierId)
      .single()
      .then(({ data }) => {
        if (data) {
          setLocalizacao(data)
          setLocalizacaoEntregador(data)
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
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          }
          setLocalizacao(coords)
          setLocalizacaoEntregador(coords)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [courierId])

  return localizacao
}
