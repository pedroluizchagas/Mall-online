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
          setLoc({ latitude: payload.new.latitude, longitude: payload.new.longitude })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [courierId])

  if (!loc) {
    return (
      <div
        className="rounded-xl h-20 flex items-center justify-center"
        style={{ background: 'var(--bg-2)' }}
      >
        <p className="text-sm text-ink-3">Aguardando localização...</p>
      </div>
    )
  }

  const linkMaps = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-ink">Entregador em rota</p>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ok)' }}>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--ok)' }}
          />
          Ao vivo
        </span>
      </div>
      <a
        href={linkMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium underline"
        style={{ color: 'var(--brick-dk)' }}
      >
        Ver no Google Maps
      </a>
    </div>
  )
}
