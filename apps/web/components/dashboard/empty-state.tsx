import Link from 'next/link'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

interface EmptyStateCTA {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  /** Ícone da casa. */
  icone: PartnerIconName
  titulo: string
  descricao?: string
  cta?: EmptyStateCTA
  cta2?: EmptyStateCTA
}

const CLASSE_BOTAO =
  'group inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-bold transition-colors duration-200'

function BotaoCTA({ cta, variante }: { cta: EmptyStateCTA; variante: 'primaria' | 'secundaria' }) {
  const classe =
    variante === 'primaria'
      ? `${CLASSE_BOTAO} bg-brick text-brick-ink hover:bg-brick-dk`
      : `${CLASSE_BOTAO} bg-bg text-ink ring-1 ring-inset ring-line-2 hover:bg-bg-2`
  const corpo = (
    <>
      {cta.label}
      {variante === 'primaria' && (
        <PartnerIcon
          name="chevron-right"
          size={15}
          strokeWidth={2.4}
          className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
        />
      )}
    </>
  )
  return cta.href ? (
    <Link href={cta.href} className={classe}>
      {corpo}
    </Link>
  ) : (
    <button type="button" onClick={cta.onClick} className={classe}>
      {corpo}
    </button>
  )
}

/**
 * Estado vazio: a moeda monocromática com o ícone de linha, o título na voz
 * da casa e, se houver, o próximo passo em pílula.
 */
export function EmptyState({ icone, titulo, descricao, cta, cta2 }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-bg-3 text-ink">
        <PartnerIcon name={icone} size={24} strokeWidth={1.8} />
      </span>
      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-ink">{titulo}</h2>
      {descricao && <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-3">{descricao}</p>}
      {(cta || cta2) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {cta && <BotaoCTA cta={cta} variante="primaria" />}
          {cta2 && <BotaoCTA cta={cta2} variante="secundaria" />}
        </div>
      )}
    </div>
  )
}
