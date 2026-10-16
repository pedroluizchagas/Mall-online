'use client'

import { tempoRelativo } from '@/lib/format'
import { useAgora } from '../hooks/use-agora'

/**
 * "há 6 min" que anda sozinho. O servidor manda o texto do momento do
 * render; no cliente, o relógio assume e atualiza a cada 30 s.
 */
export function HaQuantoTempo({ iso, inicial }: { iso: string; inicial: string }) {
  const agora = useAgora(30_000)
  const texto = agora ? tempoRelativo(iso, agora.getTime()) : inicial
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {texto === 'agora' ? 'agora' : `há ${texto}`}
    </time>
  )
}
