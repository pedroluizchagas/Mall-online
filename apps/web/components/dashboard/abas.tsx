'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface AbaDef {
  id: string
  label: string
  content: ReactNode
}

export interface AbasProps {
  defs: AbaDef[]
  searchParam?: string
  defaultId?: string
}

export function Abas({ defs, searchParam, defaultId }: AbasProps) {
  const fallback = defaultId ?? defs[0]?.id ?? ''
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const idDeURL = searchParam ? searchParams.get(searchParam) : null
  const idValidoDaURL =
    idDeURL && defs.some((d) => d.id === idDeURL) ? idDeURL : null

  const [idLocal, setIdLocal] = useState(fallback)
  const idAtivo = searchParam ? idValidoDaURL ?? fallback : idLocal

  const trocarAba = useCallback(
    (proximoId: string) => {
      if (searchParam) {
        const params = new URLSearchParams(searchParams.toString())
        params.set(searchParam, proximoId)
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      } else {
        setIdLocal(proximoId)
      }
    },
    [pathname, router, searchParam, searchParams],
  )

  const ativa = defs.find((d) => d.id === idAtivo) ?? defs[0]

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        {defs.map((aba) => {
          const isAtiva = aba.id === idAtivo
          return (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={isAtiva}
              onClick={() => trocarAba(aba.id)}
              className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              style={
                isAtiva
                  ? { borderColor: 'var(--brick)', color: 'var(--ink)' }
                  : { borderColor: 'transparent', color: 'var(--ink-3)' }
              }
            >
              {aba.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel">{ativa ? ativa.content : null}</div>
    </div>
  )
}
