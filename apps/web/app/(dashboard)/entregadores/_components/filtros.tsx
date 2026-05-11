'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type FiltroEntregadores = 'ativos' | 'inativos' | 'todos'

const FILTROS: { id: FiltroEntregadores; label: string }[] = [
  { id: 'ativos', label: 'Ativos' },
  { id: 'inativos', label: 'Inativos' },
  { id: 'todos', label: 'Todos' },
]

const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)', borderColor: 'var(--brick)' }
const ESTILO_INATIVO = { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }

export function Filtros({ filtroAtivo }: { filtroAtivo: FiltroEntregadores }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navegar = useCallback((valor: FiltroEntregadores) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === 'ativos') params.delete('filtro')
    else params.set('filtro', valor)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex gap-1" role="tablist" aria-label="Filtrar entregadores">
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
    </div>
  )
}
