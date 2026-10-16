'use client'

import { useEffect, useState } from 'react'

/**
 * "Agora" que anda sozinho (relógio da portaria, status de abertura).
 * Começa `null` no servidor e no primeiro render do cliente — hora nunca entra
 * no HTML, então não há divergência de hidratação.
 */
export function useAgora(intervaloMs = 30_000): Date | null {
  const [agora, setAgora] = useState<Date | null>(null)

  useEffect(() => {
    const tique = () => setAgora(new Date())
    tique()
    const id = window.setInterval(tique, intervaloMs)
    return () => window.clearInterval(id)
  }, [intervaloMs])

  return agora
}
