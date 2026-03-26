'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Props {
  courierId: string
}

export function MapaEntregadorMini({ courierId }: Props) {
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('courier_locations')
        .select('latitude, longitude')
        .eq('courier_id', courierId)
        .single()

      if (data) setLoc(data)
    }

    carregar()

    const canal = supabase
      .channel(`loc-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          setLoc({
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [courierId])

  if (!loc) {
    return (
      <div className="bg-gray-100 rounded-xl h-20 flex items-center justify-center">
        <p className="text-sm text-gray-400">Aguardando localização...</p>
      </div>
    )
  }

  const linkMaps = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Entregador em rota</p>
        <span className="flex items-center gap-1 text-xs text-green-600">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Ao vivo
        </span>
      </div>
      <a
        href={linkMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#4CAF82] underline"
      >
        Ver no Google Maps
      </a>
    </div>
  )
}
