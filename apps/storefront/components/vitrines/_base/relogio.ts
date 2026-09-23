'use client'

import { useEffect, useRef, useState } from 'react'
import { relogioDaLoja } from '@mallevo/lib'

/**
 * Tique compartilhado das vitrines (R8): bate uma vez ao montar e depois a
 * cada `intervaloMs`. Eram 20 `setInterval` iguais espalhados pelas 18
 * vitrines — o teste-guarda `dedupe.test.ts` proíbe que voltem.
 *
 * O callback fica num ref: trocar a função não reinicia o relógio (e não
 * acumula deriva).
 */
export function useTique(aoBater: () => void, intervaloMs: number): void {
  const bater = useRef(aoBater)
  bater.current = aoBater
  useEffect(() => {
    bater.current()
    const id = setInterval(() => bater.current(), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
}

/**
 * Hora de parede da LOJA, viva. Nasce `null` para o servidor (que roda em
 * UTC) e o cliente não divergirem na hidratação — quem chama usa
 * `agora ?? relogioDaLoja()` para o primeiro quadro. Meio minuto basta para
 * nunca mostrar hora velha sem acordar a página à toa.
 */
export function useRelogioDaLoja(intervaloMs = 30_000): Date | null {
  const [agora, setAgora] = useState<Date | null>(null)
  useTique(() => setAgora(relogioDaLoja()), intervaloMs)
  return agora
}
