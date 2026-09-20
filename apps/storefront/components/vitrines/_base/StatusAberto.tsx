'use client'

import { useEffect, useState } from 'react'
import { relogioDaLoja, statusAbertura } from '@mallevo/lib'

/**
 * Relógio vivo da loja: "Aberto até 18:00" / "Abre às 08:00" / "Fechado hoje".
 * Recalcula a cada minuto a partir de `stores.horarios` (nunca decrementa —
 * sem deriva). Loja sem horários informados → não renderiza nada: a regra da
 * convergência é não inventar "Aberto".
 *
 * Hora de parede da LOJA (`relogioDaLoja`): o servidor roda em UTC e o
 * visitante pode estar em outro fuso.
 */
export function StatusAberto({
  horarios,
  className = 'text-[13px] font-semibold text-ink-muted',
}: {
  horarios: unknown
  className?: string
}) {
  const [agora, setAgora] = useState(() => relogioDaLoja())

  useEffect(() => {
    const id = setInterval(() => setAgora(relogioDaLoja()), 60_000)
    return () => clearInterval(id)
  }, [])

  const status = statusAbertura(horarios, agora)
  if (status === null) return null
  const { aberta, texto } = status

  return (
    <span className={`flex items-center gap-1.5 ${className}`} suppressHydrationWarning>
      <span
        className={`h-2 w-2 rounded-full ${aberta ? 'bg-success' : 'bg-danger'}`}
        aria-hidden
      />
      {texto}
    </span>
  )
}
