import Link from 'next/link'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

/**
 * Estado vazio: a moeda monocromática com o ícone de linha, o título na voz
 * da casa e, se houver, o próximo passo em pílula (o do painel web).
 */
export function EmptyState({
  icone,
  titulo,
  descricao,
  cta,
}: {
  icone: PartnerIconName
  titulo: string
  descricao?: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-bg-3 text-ink">
        <PartnerIcon name={icone} size={24} strokeWidth={1.8} />
      </span>
      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-ink">{titulo}</h2>
      {descricao && <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-3">{descricao}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="group mt-6 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-bg px-5 text-[14px] font-bold text-ink ring-1 ring-inset ring-line-2 transition-colors duration-200 hover:bg-bg-2"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
