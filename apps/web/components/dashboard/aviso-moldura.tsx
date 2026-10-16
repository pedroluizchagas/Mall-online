import Link from 'next/link'
import { cx } from '@/lib/cx'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

/**
 * Aviso da moldura — a faixa de vidro que mora na marquise, acima da folha,
 * para o que bloqueia a operação (recebimentos pendentes, assinatura em
 * atraso). Fica fora da folha de propósito: é "ao vivo", não acervo.
 */
export function AvisoMoldura({
  icone,
  titulo,
  texto,
  cta,
  tom = 'acao',
}: {
  icone: PartnerIconName
  titulo: string
  texto?: string
  cta: { label: string; href: string }
  /** `acao` = falta um passo (accent); `alerta` = algo vencido (warning). */
  tom?: 'acao' | 'alerta'
}) {
  return (
    <div
      role="status"
      className="sobre-escuro relative flex shrink-0 flex-col gap-3 rounded-[20px] bg-[color:var(--m-glass)] p-3 pl-3.5 ring-1 ring-inset ring-[color:var(--m-line)] sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: tom === 'alerta' ? 'rgba(242, 184, 75, 0.16)' : 'rgba(216, 255, 62, 0.14)',
            color: tom === 'alerta' ? 'var(--warn-vivo)' : 'var(--brick)',
          }}
        >
          <PartnerIcon name={icone} size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold leading-snug text-white">{titulo}</p>
          {texto && <p className="mt-0.5 text-[12.5px] leading-snug text-[color:var(--m-ink-2)]">{texto}</p>}
        </div>
      </div>
      <Link
        href={cta.href}
        className={cx(
          'group inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-full px-4 text-[13px] font-bold transition-colors duration-200 sm:self-auto',
          tom === 'alerta'
            ? 'bg-white text-[color:var(--brick-ink)] hover:bg-[color:#e7e7ea]'
            : 'bg-[color:var(--brick)] text-[color:var(--brick-ink)] hover:bg-[color:var(--brick-dk)]',
        )}
      >
        {cta.label}
        <PartnerIcon
          name="chevron-right"
          size={15}
          strokeWidth={2.4}
          className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  )
}
