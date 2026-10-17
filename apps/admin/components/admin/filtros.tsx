import Link from 'next/link'
import { cx } from '@/lib/cx'

export interface OpcaoFiltro {
  label: string
  href: string
  ativa: boolean
  /** Quantos itens o filtro traria (com os outros filtros aplicados). */
  contagem?: number
}

/**
 * Fileira de filtros em pílula (os chips do app): a ativa é TINTA — lima não
 * é estado de filtro no claro. São links (o filtro mora na URL), então
 * funcionam sem JavaScript e voltam com o botão do navegador.
 */
export function FiltroChips({ rotulo, opcoes }: { rotulo: string; opcoes: OpcaoFiltro[] }) {
  return (
    <nav
      aria-label={`Filtrar por ${rotulo.toLowerCase()}`}
      className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
    >
      <span className="micro shrink-0 text-ink-3 sm:w-[104px]">{rotulo}</span>
      <div className="-m-1 flex min-w-0 gap-1 overflow-x-auto p-1">
        {opcoes.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            scroll={false}
            aria-current={o.ativa ? 'true' : undefined}
            className={cx(
              'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition-colors duration-200',
              o.ativa ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg hover:text-ink',
            )}
          >
            {o.label}
            {typeof o.contagem === 'number' && (
              <span
                className={cx(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                  o.ativa ? 'bg-bg/20 text-bg' : 'bg-bg-3 text-ink-2',
                )}
              >
                {o.contagem}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}

/**
 * Monta o href de uma página de lista preservando os outros filtros: valor
 * vazio remove o parâmetro (é o "Todos").
 */
export function hrefComFiltros(base: string, atuais: Record<string, string | undefined>, mudanca: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries({ ...atuais, ...mudanca })) {
    if (valor) params.set(chave, valor)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
