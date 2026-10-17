'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { hrefComFiltros } from './filtros'

/**
 * Busca da lista: a pílula de campo da casa. Digitar atualiza `?busca=` na
 * URL (com folga de 350 ms) preservando os filtros — a lista é renderizada no
 * servidor, então o resultado é o mesmo de abrir o link.
 */
export function CampoBusca({
  valorInicial,
  parametros,
  placeholder,
  rotulo,
}: {
  valorInicial: string
  /** Os outros filtros da página, mantidos ao buscar. */
  parametros: Record<string, string | undefined>
  placeholder: string
  rotulo: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [valor, setValor] = useState(valorInicial)
  const [buscando, iniciar] = useTransition()
  const ultimo = useRef(valorInicial)

  useEffect(() => {
    const termo = valor.trim()
    if (termo === ultimo.current) return
    const id = window.setTimeout(() => {
      ultimo.current = termo
      iniciar(() => router.replace(hrefComFiltros(pathname, parametros, { busca: termo || undefined }), { scroll: false }))
    }, 350)
    return () => window.clearTimeout(id)
  }, [valor, parametros, pathname, router])

  return (
    <label className="relative flex h-10 w-full items-center sm:w-[320px]">
      <span className="sr-only">{rotulo}</span>
      <PartnerIcon
        name="search"
        size={16}
        strokeWidth={2}
        className="pointer-events-none absolute left-3.5 text-ink-3"
      />
      <input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        maxLength={80}
        className="h-full w-full rounded-full bg-bg pl-10 pr-10 text-[13.5px] text-ink outline-none focus-visible:outline-none ring-1 ring-inset ring-line transition-shadow placeholder:text-ink-4 focus:ring-2 focus:ring-ink [&::-webkit-search-cancel-button]:hidden"
      />
      {buscando && (
        <span
          aria-hidden
          className="absolute right-3.5 size-3.5 animate-spin rounded-full border-2 border-ink-4 border-t-transparent"
        />
      )}
    </label>
  )
}
