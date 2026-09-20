'use client'

import { useEffect, useState } from 'react'

/** Lido na hora do gesto: quem liga "reduzir movimento" no meio da visita é atendido. */
export function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** `prefers-reduced-motion` como estado — o `AccessibilityInfo` da RN. */
export function useReduzirMovimento(): boolean {
  const [reduzir, setReduzir] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduzir(mq.matches)
    const aoMudar = (e: MediaQueryListEvent) => setReduzir(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])
  return reduzir
}
