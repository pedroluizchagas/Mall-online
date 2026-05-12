'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type FiltroTickets = 'tudo' | 'abertos' | 'resolvidos'

const FILTROS: { id: FiltroTickets; label: string }[] = [
  { id: 'tudo', label: 'Todos' },
  { id: 'abertos', label: 'Abertos' },
  { id: 'resolvidos', label: 'Resolvidos' },
]

const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)', borderColor: 'var(--brick)' }
const ESTILO_INATIVO = { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }

export function Filtros({ filtroAtivo }: { filtroAtivo: FiltroTickets }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navegar = useCallback((valor: FiltroTickets) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === 'tudo') params.delete('filtro')
    else params.set('filtro', valor)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div className="flex gap-1 mb-4" role="tablist" aria-label="Filtrar tickets">
      {FILTROS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={f.id === filtroAtivo}
          onClick={() => navegar(f.id)}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          style={f.id === filtroAtivo ? ESTILO_PRIMARIO : ESTILO_INATIVO}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
