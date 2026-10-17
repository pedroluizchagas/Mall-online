'use client'

import { useEffect, type RefObject } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Foco de diálogo modal: ao abrir, vai para o primeiro campo; Tab e Shift+Tab
 * circulam dentro dele; Esc fecha; ao fechar, o foco volta a quem abriu.
 */
export function useFocoNoDialogo(aberto: boolean, ref: RefObject<HTMLElement>, aoFechar: () => void) {
  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    const caixa = ref.current
    const focaveis = () => Array.from(caixa?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])

    // Espera o conteúdo montar (listas que carregam depois).
    const quadro = requestAnimationFrame(() => {
      const primeiro = caixa?.querySelector<HTMLElement>('input, select, textarea') ?? focaveis()[0]
      primeiro?.focus()
    })

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        aoFechar()
        return
      }
      if (e.key !== 'Tab') return
      const lista = focaveis()
      if (lista.length === 0) return
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      cancelAnimationFrame(quadro)
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus?.()
    }
  }, [aberto, ref, aoFechar])
}
