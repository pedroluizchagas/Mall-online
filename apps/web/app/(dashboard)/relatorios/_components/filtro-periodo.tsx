'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PERIODOS_VALIDOS, ROTULOS_PERIODO, type Periodo } from '../_lib/periodo'

const ESTILO_PRIMARIO = { background: 'var(--brick)', color: 'var(--brick-ink)', borderColor: 'var(--brick)' }
const ESTILO_INATIVO = { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }

export function FiltroPeriodo({ periodoAtivo }: { periodoAtivo: Periodo }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navegar = useCallback((p: Periodo) => {
    const params = new URLSearchParams(searchParams.toString())
    if (p === '30d') params.delete('periodo')
    else params.set('periodo', p)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-1 mb-5" role="tablist" aria-label="Período do relatório">
      {PERIODOS_VALIDOS.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={p === periodoAtivo}
          onClick={() => navegar(p)}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
          style={p === periodoAtivo ? ESTILO_PRIMARIO : ESTILO_INATIVO}
        >
          {ROTULOS_PERIODO[p]}
        </button>
      ))}
    </div>
  )
}
