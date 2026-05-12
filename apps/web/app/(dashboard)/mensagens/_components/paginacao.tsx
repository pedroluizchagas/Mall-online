'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function Paginacao({ pagina, totalPaginas }: { pagina: number; totalPaginas: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPaginas <= 1) return null

  function ir(novaPagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (novaPagina <= 1) params.delete('pagina')
    else params.set('pagina', String(novaPagina))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const botao = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-40 hover:bg-bg-2 transition-colors'

  return (
    <nav className="flex items-center justify-center gap-3 mt-6" aria-label="Paginação">
      <button type="button" onClick={() => ir(pagina - 1)} disabled={pagina <= 1} className={botao} style={{ borderColor: 'var(--line)' }}>
        <ChevronLeft className="w-3.5 h-3.5" /> Anterior
      </button>
      <span className="text-xs text-ink-3">
        Página <strong className="text-ink">{pagina}</strong> de {totalPaginas}
      </span>
      <button type="button" onClick={() => ir(pagina + 1)} disabled={pagina >= totalPaginas} className={botao} style={{ borderColor: 'var(--line)' }}>
        Próxima <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </nav>
  )
}
