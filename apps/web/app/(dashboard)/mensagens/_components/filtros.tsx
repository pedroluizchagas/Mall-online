'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type FiltroMensagens = 'todas' | 'nao_lidas' | 'arquivadas'

const FILTROS: { id: FiltroMensagens; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'nao_lidas', label: 'Não lidas' },
  { id: 'arquivadas', label: 'Arquivadas' },
]

const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)', borderColor: 'var(--brick)' }
const ESTILO_INATIVO = { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }

export function Filtros({ filtroAtivo }: { filtroAtivo: FiltroMensagens }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navegar = useCallback((valor: FiltroMensagens) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === 'todas') params.delete('filtro')
    else params.set('filtro', valor)
    params.delete('pagina')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4" role="tablist" aria-label="Filtrar mensagens">
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
