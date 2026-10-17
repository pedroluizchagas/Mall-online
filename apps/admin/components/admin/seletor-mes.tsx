import Link from 'next/link'
import { cx } from '@/lib/cx'
import { rotuloDoMes, somarMeses, type Mes } from '@/lib/hoje'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Seletor de mês em pílula: anterior · mês · próximo. São links (o mês mora
 * na URL), sem o `<input type="month">` nativo, que o Safari e o Firefox de
 * computador nem desenham. Não deixa avançar além do mês corrente.
 */
export function SeletorMes({ mes, atual, base }: { mes: Mes; atual: Mes; base: string }) {
  const anterior = somarMeses(mes, -1)
  const proximo = somarMeses(mes, 1)
  const temProximo = proximo <= atual
  const classeSeta =
    'flex size-9 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-bg-2'

  return (
    <nav aria-label="Escolher o mês" className="flex items-center gap-2">
      <div className="flex h-11 items-center gap-1 rounded-full bg-bg p-1 ring-1 ring-inset ring-line">
        <Link href={`${base}?mes=${anterior}`} scroll={false} aria-label={`Mês anterior: ${rotuloDoMes(anterior)}`} className={classeSeta}>
          <PartnerIcon name="chevron-left" size={17} strokeWidth={2.3} />
        </Link>
        <span className="min-w-[148px] text-center text-[14px] font-bold text-ink" aria-current="date">
          {/* Só a inicial: o `capitalize` do CSS subiria o "de" também. */}
          {rotuloDoMes(mes).replace(/^./, (c) => c.toUpperCase())}
        </span>
        {temProximo ? (
          <Link href={`${base}?mes=${proximo}`} scroll={false} aria-label={`Próximo mês: ${rotuloDoMes(proximo)}`} className={classeSeta}>
            <PartnerIcon name="chevron-right" size={17} strokeWidth={2.3} />
          </Link>
        ) : (
          <span aria-hidden className={cx(classeSeta, 'cursor-default text-ink-4 hover:bg-transparent')}>
            <PartnerIcon name="chevron-right" size={17} strokeWidth={2.3} />
          </span>
        )}
      </div>
      {mes !== atual && (
        <Link
          href={base}
          scroll={false}
          className="inline-flex h-11 items-center rounded-full px-4 text-[13.5px] font-semibold text-ink-2 transition-colors hover:bg-bg hover:text-ink"
        >
          Este mês
        </Link>
      )}
    </nav>
  )
}
