import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * Peças da FOLHA — o salão claro de vidro fosco onde mora o acervo. As mesmas
 * de apps/web/components/dashboard/folha.tsx: o letreiro de corredor
 * (sobrelinha micro + título Jakarta) e o cartão branco sem chrome que acende
 * sobre o fumê.
 */

/**
 * A folha que SOBE por cima da marquise (telas com marquise, como a Visão
 * geral): cantos superiores arredondados, 24px escondidos sob a fachada.
 */
export function Folha({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('vidro-fosco relative -mt-6 rounded-t-[28px] pb-10', className)}>{children}</div>
}

/** Letreiro de seção da folha. Nenhuma tela redesenha o rótulo de seção. */
export function SecaoFolha({
  sobrelinha,
  titulo,
  acao,
  children,
  className,
  id,
}: {
  sobrelinha?: ReactNode
  titulo: ReactNode
  acao?: { label: string; href: string }
  children: ReactNode
  className?: string
  id?: string
}) {
  const idTitulo = id ? `${id}-titulo` : undefined
  return (
    <section aria-labelledby={idTitulo} className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {sobrelinha && <p className="micro text-ink-3">{sobrelinha}</p>}
          <h2
            id={idTitulo}
            className={cx('text-[21px] font-bold leading-tight tracking-[-0.025em] text-ink', sobrelinha ? 'mt-1.5' : undefined)}
          >
            {titulo}
          </h2>
        </div>
        {acao && (
          <Link href={acao.href} className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-ink">
            <span className="sublinha">{acao.label}</span>
            <PartnerIcon
              name="chevron-right"
              size={15}
              strokeWidth={2.4}
              className="transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Cartão da folha: superfície branca, sem borda visível, sombra curta. */
export function CartaoFolha({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  return <Tag className={cx('cartao p-5', className)}>{children}</Tag>
}
