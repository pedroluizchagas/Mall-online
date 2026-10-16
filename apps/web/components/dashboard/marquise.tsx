import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

/**
 * Peças da MARQUISE — a fachada escura onde mora o que está ao vivo. Porte
 * web de apps/mobile-partner/components/marquise/Marquise.tsx (que é o do
 * consumidor): sobrelinha micro, statement com a última linha acesa, placas
 * e cartões de vidro, moeda de vidro e o ponto que respira.
 *
 * Tudo aqui assume fundo `--marquee` (a moldura do painel). O vidro é
 * conteúdo, não chrome: placas, cartões, pílulas e moedas de ação.
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
 * Sobrelinha — o micro em caixa alta que abre cada letreiro do app ("AO VIVO
 * NO SHOPPING"). Com `aoVivo`, o ponto aceso marca o que está acontecendo.
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

/**
 * Statement — a frase da marquise com a ÚLTIMA linha acesa: itálico, accent.
 * ("Sua loja, / ao vivo no shopping.")
 */
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
      className={cx(
        'font-semibold leading-[0.98] tracking-[-0.04em] text-white [word-spacing:0.04em]',
        className,
      )}
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
          'mt-3 block text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums',
          alerta ? 'text-[color:var(--brick)]' : 'text-white',
        )}
      >
        {valor}
      </span>
      <span className="mt-1.5 block text-[12.5px] font-medium text-[color:var(--m-ink-2)]">{rotulo}</span>
    </>
  )
  const classe = cx(
    'block rounded-[18px] px-4 py-3.5 ring-1 ring-inset transition-colors duration-300',
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

/** Moeda de vidro — botão redondo de 40px; `badge` = ponto de aviso. */
export function MoedaVidro({
  icone,
  rotulo,
  href,
  onClick,
  badge = false,
  className,
}: {
  icone: PartnerIconName
  rotulo: string
  href?: string
  onClick?: () => void
  badge?: boolean
  className?: string
}) {
  const classe = cx(
    'relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white ring-1 ring-inset ring-[color:var(--m-line)] bg-[color:var(--m-glass)] transition-colors duration-300 hover:bg-[color:var(--m-glass-2)]',
    className,
  )
  const corpo = (
    <>
      <PartnerIcon name={icone} size={18} strokeWidth={1.9} />
      {badge && (
        <span
          aria-hidden
          className="absolute right-[7px] top-[7px] size-2 rounded-full ring-2 ring-[color:var(--marquee)]"
          style={{ background: 'var(--brick)' }}
        />
      )}
    </>
  )
  return href ? (
    <Link href={href} aria-label={rotulo} title={rotulo} className={classe}>
      {corpo}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={rotulo} title={rotulo} className={classe}>
      {corpo}
    </button>
  )
}

/** Barra de progresso de 4px da marquise (fill accent). */
export function BarraProgresso({ fracao, className }: { fracao: number; className?: string }) {
  const p = Math.max(0, Math.min(1, fracao))
  return (
    <span aria-hidden className={cx('block h-1 overflow-hidden rounded-full bg-[color:var(--m-glass-2)]', className)}>
      <span
        className="block h-full rounded-full transition-[width] duration-700 ease-entrada"
        style={{ width: `${p * 100}%`, background: 'var(--brick)' }}
      />
    </span>
  )
}
