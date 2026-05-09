'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type FiltroAvaliacoes = 'tudo' | 'sem_resposta' | 'sinalizadas'

const FILTROS: { id: FiltroAvaliacoes; label: string }[] = [
  { id: 'tudo', label: 'Todas' },
  { id: 'sem_resposta', label: 'Sem resposta' },
  { id: 'sinalizadas', label: 'Sinalizadas' },
]

const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)', borderColor: 'var(--brick)' }
const ESTILO_INVERSO = { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }
const ESTILO_INATIVO = { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }

interface Props { filtroAtivo: FiltroAvaliacoes; estrelasAtivo: number | null }

export function Filtros({ filtroAtivo, estrelasAtivo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navegar = useCallback((chave: 'filtro' | 'estrelas', valor: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === null) params.delete(chave)
    else params.set(chave, valor)
    params.delete('pagina')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex gap-1" role="tablist" aria-label="Filtrar avaliações">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={f.id === filtroAtivo}
            onClick={() => navegar('filtro', f.id === 'tudo' ? null : f.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            style={f.id === filtroAtivo ? ESTILO_PRIMARIO : ESTILO_INATIVO}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-[11px] text-ink-3 font-medium">Estrelas:</span>
        {([null, 5, 4, 3, 2, 1] as const).map((n) => (
          <button
            key={n ?? 'todas'}
            type="button"
            aria-pressed={estrelasAtivo === n}
            onClick={() => navegar('estrelas', n === null ? null : String(n))}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
            style={estrelasAtivo === n ? ESTILO_INVERSO : ESTILO_INATIVO}
          >
            {n === null ? 'Todas' : `${n}★`}
          </button>
        ))}
      </div>
    </div>
  )
}
