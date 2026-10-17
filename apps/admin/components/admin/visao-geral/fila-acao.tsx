import Link from 'next/link'
import { cx } from '@/lib/cx'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { CartaoVidro } from '../marquise'

export interface ItemAcao {
  id: string
  icone: PartnerIconName
  titulo: string
  descricao: string
  cta: { label: string; href: string }
}

/**
 * "Pede sua ação" — a fila da administração na marquise (o lugar dos pedidos
 * novos no Início do lojista). Só entra o que depende de alguém aqui dentro;
 * a ordem é a da urgência e só o PRIMEIRO item leva o CTA aceso — a próxima
 * coisa a fazer. Os outros são vidro.
 */
export function FilaAcao({ itens }: { itens: ItemAcao[] }) {
  if (itens.length === 0) {
    return (
      <CartaoVidro className="flex items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-glass-2)] text-[color:var(--m-ink-2)]">
          <PartnerIcon name="check-double" size={18} strokeWidth={2} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-white">Nada pedindo você agora</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-[color:var(--m-ink-2)]">
            Aprovações de entregadores, lojas sem nicho e recebimentos travados aparecem aqui.
          </span>
        </span>
      </CartaoVidro>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {itens.map((item, i) => (
        <li key={item.id} className="list-none">
          <CartaoVidro aceso={i === 0} className="flex items-start gap-3.5 p-4">
            <span
              aria-hidden
              className={cx(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                i === 0 ? 'bg-[color:rgba(216,255,62,0.14)] text-[color:var(--brick)]' : 'bg-[color:var(--m-glass-2)] text-white',
              )}
            >
              <PartnerIcon name={item.icone} size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug text-white">{item.titulo}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-[color:var(--m-ink-2)]">{item.descricao}</p>
              <Link
                href={item.cta.href}
                className={cx(
                  'group mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-colors duration-200',
                  i === 0
                    ? 'bg-[color:var(--brick)] text-[color:var(--brick-ink)] hover:bg-[color:var(--brick-dk)]'
                    : 'bg-[color:var(--m-glass-2)] text-white hover:bg-[color:rgba(255,255,255,0.18)]',
                )}
              >
                {item.cta.label}
                <PartnerIcon
                  name="chevron-right"
                  size={15}
                  strokeWidth={2.4}
                  className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </CartaoVidro>
        </li>
      ))}
    </ul>
  )
}
