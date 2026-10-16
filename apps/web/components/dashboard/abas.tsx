'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cx } from '@/lib/cx'

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

/** Abas em pílula (a ativa é tinta) — as mesmas do PageHeader. */
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
      <div role="tablist" className="-m-1 mb-6 flex gap-1 overflow-x-auto p-1">
        {defs.map((aba) => {
          const isAtiva = aba.id === idAtivo
          return (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={isAtiva}
              onClick={() => trocarAba(aba.id)}
              className={cx(
                'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition-colors duration-200',
                isAtiva ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg hover:text-ink',
              )}
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
