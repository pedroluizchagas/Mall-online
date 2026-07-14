import Link from 'next/link'
import { ABAS_VALIDAS, ROTULOS_ABA, type AbaRelatorio } from '../_lib/abas'
import type { Periodo } from '../_lib/periodo'

/**
 * Navegação de abas do relatório — links server-side que preservam o
 * período (?periodo=) e trocam a aba (?aba=). Sem estado no client.
 */
export function AbasRelatorio({
  abaAtiva,
  periodo,
}: {
  abaAtiva: AbaRelatorio
  periodo: Periodo
}) {
  function hrefDe(aba: AbaRelatorio): string {
    const params = new URLSearchParams()
    if (periodo !== '30d') params.set('periodo', periodo)
    if (aba !== 'visao-geral') params.set('aba', aba)
    const qs = params.toString()
    return qs ? `/relatorios?${qs}` : '/relatorios'
  }

  return (
    <div
      className="flex gap-1 mb-5 rounded-md w-fit max-w-full overflow-x-auto"
      style={{ background: 'var(--bg-2)', padding: 4 }}
      role="tablist"
      aria-label="Seções do relatório"
    >
      {ABAS_VALIDAS.map((aba) => {
        const ativa = aba === abaAtiva
        return (
          <Link
            key={aba}
            href={hrefDe(aba)}
            role="tab"
            aria-selected={ativa}
            scroll={false}
            className="inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all"
            style={
              ativa
                ? { background: 'var(--bg)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' }
                : { background: 'transparent', color: 'var(--ink-3)' }
            }
          >
            {ROTULOS_ABA[aba]}
          </Link>
        )
      })}
    </div>
  )
}
