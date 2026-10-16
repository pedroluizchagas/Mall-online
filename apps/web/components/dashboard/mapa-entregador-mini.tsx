'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { PartnerIcon } from '@/components/ui/partner-icon'

interface Props {
  courierId: string
}

/** O entregador em rota: posição ao vivo e o atalho para o mapa. */
export function MapaEntregadorMini({ courierId }: Props) {
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    const supabase = createSupabaseClient()

    async function carregar() {
      const { data } = await supabase
        .from('courier_locations')
        .select('latitude, longitude')
        .eq('courier_id', courierId)
        .single()

      if (data) setLoc(data)
    }

    void carregar()

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
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [courierId])

  return (
    <div className="cartao flex items-center gap-4 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink">
        <PartnerIcon name="route" size={19} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          Entregador em rota
          {loc && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: 'var(--ok)' }}>
              <span className="pulso size-1.5 rounded-full" style={{ background: 'var(--ok)' }} />
              ao vivo
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          {loc ? 'A posição atualiza sozinha enquanto ele estiver a caminho.' : 'Aguardando a primeira localização…'}
        </p>
      </div>
      {loc && (
        <a
          href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-bold text-bg transition-opacity hover:opacity-90"
        >
          Ver no mapa
          <PartnerIcon name="external" size={14} strokeWidth={2.2} />
        </a>
      )}
    </div>
  )
}
