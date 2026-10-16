'use client'

import { useEffect, useState } from 'react'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Alterna claro/escuro da FOLHA do painel (a moldura é sempre a marquise).
 *
 * O tema inicial já é aplicado antes do paint pelo script em app/layout.tsx
 * (sem flash); aqui só sincronizamos o ícone e persistimos a escolha. Mora na
 * portaria da sidebar — moeda de vidro sobre a marquise.
 */

const CHAVE = 'tema-dashboard'

export function ThemeToggle() {
  // Começa null até ler o DOM, para o ícone não "pular" na hidratação.
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  function alternar() {
    const novo = !(dark ?? false)
    setDark(novo)
    document.documentElement.setAttribute('data-theme', novo ? 'dark' : 'light')
    try {
      localStorage.setItem(CHAVE, novo ? 'dark' : 'light')
    } catch {
      /* localStorage indisponível — tema volta ao default no próximo load */
    }
  }

  const escuro = dark ?? false

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-glass)] text-[color:var(--sidebar-ink-2)] ring-1 ring-inset ring-[color:var(--m-line)] transition-colors duration-200 hover:bg-[color:var(--m-glass-2)] hover:text-white"
    >
      <PartnerIcon name={escuro ? 'sun' : 'moon'} size={15} strokeWidth={2} />
    </button>
  )
}
