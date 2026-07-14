'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Alterna claro/escuro do dashboard (dashboard-redesign Fase 5).
 *
 * O tema inicial já é aplicado antes do paint pelo script em app/layout.tsx
 * (sem flash); aqui só sincronizamos o ícone e persistimos a escolha. Vive
 * no rodapé da sidebar — a sidebar é sempre escura, então usa as cores
 * `--sidebar-ink-*`.
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
      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0"
      style={{ color: 'var(--sidebar-ink-2)', background: 'transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--sidebar-2)'
        e.currentTarget.style.color = 'var(--sidebar-ink)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--sidebar-ink-2)'
      }}
    >
      {escuro ? <Sun className="w-4 h-4" strokeWidth={1.75} /> : <Moon className="w-4 h-4" strokeWidth={1.75} />}
    </button>
  )
}
