'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type TipoFiltro = 'todos' | 'video' | 'foto'
export type EstadoFiltro = 'todos' | 'publicados' | 'ocultos' | 'analise' | 'sinalizados'

const TIPOS: { id: TipoFiltro; label: string }[] = [
  { id: 'todos', label: 'Tudo' },
  { id: 'video', label: 'Vídeos' },
  { id: 'foto', label: 'Fotos' },
]

const ESTADOS: { id: EstadoFiltro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'publicados', label: 'Publicados' },
  { id: 'ocultos', label: 'Ocultos' },
  { id: 'analise', label: 'Em análise' },
  { id: 'sinalizados', label: 'Sinalizados' },
]

const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)', borderColor: 'var(--brick)' }
const ESTILO_INVERSO = { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }
const ESTILO_INATIVO = { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }

export function FiltrosConteudo({ tipoAtivo, estadoAtivo }: { tipoAtivo: TipoFiltro; estadoAtivo: EstadoFiltro }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navegar = useCallback(
    (chave: 'tipo' | 'estado', valor: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (valor === null) params.delete(chave)
      else params.set(chave, valor)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1" role="tablist" aria-label="Filtrar por tipo">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tipoAtivo}
            onClick={() => navegar('tipo', t.id === 'todos' ? null : t.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            style={t.id === tipoAtivo ? ESTILO_PRIMARIO : ESTILO_INATIVO}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-ink-3 font-medium">Estado:</span>
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.id === estadoAtivo}
            onClick={() => navegar('estado', e.id === 'todos' ? null : e.id)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
            style={e.id === estadoAtivo ? ESTILO_INVERSO : ESTILO_INATIVO}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}
