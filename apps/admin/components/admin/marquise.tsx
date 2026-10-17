import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

/**
 * Peças da MARQUISE — a fachada escura onde mora o que está ao vivo. Mesmas
 * peças de apps/web/components/dashboard/marquise.tsx (porte do app do
 * lojista): sobrelinha micro, statement com a última linha acesa, placas e
 * cartões de vidro e o ponto que respira.
 *
 * Tudo aqui assume fundo `--marquee` (a moldura da administração). O vidro é
 * conteúdo, não chrome: placas, cartões e pílulas de ação.
 */

/** O ponto "ao vivo": 7px que respira (respeita movimento reduzido). */
export function PontoAoVivo({
  tom = 'acesa',
  className,
}: {
  tom?: 'acesa' | 'tinta' | 'ok' | 'aviso' | 'perigo'
  className?: string
}) {
  const cor = {
    acesa: 'var(--brick)',
    tinta: 'var(--ink)',
    ok: 'var(--ok-vivo)',
    aviso: 'var(--warn-vivo)',
    perigo: 'var(--err-vivo)',
  }[tom]
  return (
    <span aria-hidden className={cx('relative inline-flex size-[7px] shrink-0', className)}>
      <span className="pulso absolute inset-0 rounded-full" style={{ background: cor }} />
    </span>
  )
}

/**
 * Sobrelinha — o micro em caixa alta que abre cada letreiro do app. Com
 * `aoVivo`, o ponto aceso marca o que está acontecendo.
 */
export function Sobrelinha({
  children,
  tom = 'escuro',
  aoVivo = false,
  className,
}: {
  children: ReactNode
  tom?: 'escuro' | 'claro'
  aoVivo?: boolean
  className?: string
}) {
  return (
    <p
      className={cx(
        'micro flex items-center gap-2.5',
        tom === 'escuro' ? (aoVivo ? 'text-[color:var(--brick)]' : 'text-[color:var(--m-ink-3)]') : 'text-ink-3',
        className,
      )}
    >
      {aoVivo && <PontoAoVivo tom={tom === 'escuro' ? 'acesa' : 'tinta'} />}
      {children}
    </p>
  )
}

/** Statement — a frase da marquise com a ÚLTIMA linha acesa: itálico, accent. */
export function Statement({
  linha,
  acesa,
  className,
  id,
  as: Tag = 'h1',
}: {
  linha: ReactNode
  acesa: ReactNode
  className?: string
  id?: string
  as?: 'h1' | 'h2'
}) {
  return (
    <Tag
      id={id}
      className={cx('font-semibold leading-[0.98] tracking-[-0.04em] text-white [word-spacing:0.04em]', className)}
    >
      <span className="block">{linha}</span>
      <span className="block pb-[0.06em] italic text-[color:var(--brick)]">{acesa}</span>
    </Tag>
  )
}

/**
 * Placa de vidro — um número do dia. Ícone accent, valor grande, rótulo.
 * `alerta` acende o valor (há algo pedindo ação); `href` a torna clicável.
 */
export function PlacaVidro({
  icone,
  valor,
  rotulo,
  alerta = false,
  href,
  className,
}: {
  icone: PartnerIconName
  valor: ReactNode
  rotulo: string
  alerta?: boolean
  href?: string
  className?: string
}) {
  const corpo = (
    <>
      <PartnerIcon name={icone} size={17} strokeWidth={2} className="text-[color:var(--brick)]" />
      <span
        className={cx(
          'mt-3 block truncate text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums',
          alerta ? 'text-[color:var(--brick)]' : 'text-white',
        )}
      >
        {valor}
      </span>
      <span className="mt-1.5 block truncate text-[12.5px] font-medium text-[color:var(--m-ink-2)]">{rotulo}</span>
    </>
  )
  const classe = cx(
    'block min-w-0 rounded-[18px] px-4 py-3.5 ring-1 ring-inset transition-colors duration-300',
    alerta
      ? 'bg-[color:var(--m-glass-2)] ring-[color:var(--accent-ring)]'
      : 'bg-[color:var(--m-glass)] ring-[color:var(--m-line)]',
    href && 'hover:bg-[color:var(--m-glass-2)]',
    className,
  )
  return href ? (
    <Link href={href} className={classe}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  )
}

/** Cartão de vidro — o recipiente do que está ao vivo na marquise. */
export function CartaoVidro({
  children,
  aceso = false,
  className,
}: {
  children: ReactNode
  aceso?: boolean
  className?: string
}) {
  return (
    <div
      className={cx(
        'rounded-[22px] p-5 ring-1 ring-inset',
        aceso
          ? 'bg-[color:var(--m-glass-2)] ring-[color:var(--accent-ring)]'
          : 'bg-[color:var(--m-glass)] ring-[color:var(--m-line)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
