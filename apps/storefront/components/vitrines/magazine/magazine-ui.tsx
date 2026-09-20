'use client'

import type { MouseEvent, ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine magazine (arquétipo `magazine`: lojas de
 * departamento, categoria "outros") — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaMagazine.tsx.
 *
 * A referência (Revive) é VAREJO CLÁSSICO: faixa-anúncio, wordmark em serifa
 * (a `display` do arquétipo), títulos centrados, tiles de foto cheia, chip
 * verde de oferta e a pill "Adicionar" no próprio cartão. As cores vêm da
 * pele; aqui só vivem o véu do hero, a caixa emoldurada e o verde do chip.
 */

/** Tempo de cena e glide (RN: 5000ms / 520ms — cadência constante). */
export const DWELL_MS = 5000
export const GLIDE_MS = 520

/** Duração do estado "Na sacola" (RN: 1300ms). */
export const FLASH_MS = 1300

/** A RN mostra 4 itens por seção e abre o resto no "Ver tudo". */
export const ITENS_FECHADOS = 4

export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.16) 62%, rgba(0,0,0,0.32) 100%)'
export const CAIXA_HERO = 'rgba(28, 22, 20, 0.5)'
export const VEU_TILE = 'rgba(20, 16, 14, 0.34)'
/** Chip verde de oferta — a assinatura varejista (RN: success a 14%). */
export const VERDE_CHIP = 'color-mix(in srgb, var(--success, #16A34A) 14%, transparent)'

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

/** Percentual de desconto inteiro; 0 quando não há promoção válida. */
export function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

// ─────────────────────────────────────────────────────────────
// Ícones de traço (família do ConsumerIcon: 24×24, round)
// ─────────────────────────────────────────────────────────────

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
} as const

export type IconeMagazine = keyof typeof ICONES

export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 2,
  className,
}: {
  nome: IconeMagazine
  tamanho?: number
  cor?: string
  espessura?: number
  className?: string
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {ICONES[nome]}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Chrome — faixa-anúncio, ação do header claro
// ─────────────────────────────────────────────────────────────

/** Faixa-anúncio no accent, caps miúdas espaçadas — a mensagem de oferta. */
export function FaixaAnuncio({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-center justify-center bg-accent px-screen-x py-[9px] text-center font-body text-[10.5px] font-semibold uppercase leading-[13px] tracking-[1.2px] text-accent-ink">
      <span className="truncate">{children}</span>
    </p>
  )
}

/** Ação do header claro: ícone ink, badge no `danger`. `children` substitui o ícone; `href` vira `<a>`. */
export function AcaoMagazine({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeMagazine
  contador?: number
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-opacity hover:opacity-70 active:opacity-60'
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} tamanho={22} /> : null)}
      {contador > 0 && (
        <span
          className="absolute right-0 top-[2px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 font-body text-[10px] font-bold leading-none text-white"
          aria-hidden
        >
          {contador}
        </span>
      )}
    </>
  )
  if (href) {
    return (
      <a href={href} aria-label={rotulo} className={classe} onClick={aoTocar}>
        {miolo}
      </a>
    )
  }
  return (
    <button type="button" aria-label={rotulo} className={classe} onClick={aoTocar}>
      {miolo}
    </button>
  )
}

/** A casa no canto esquerdo: logo redonda com fio ou a inicial num círculo de contorno. */
export function MarcaDaCasa({ nome, logoUrl }: { nome: string; logoUrl: string | null }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '·'
  return (
    <AcaoMagazine href="/" rotulo={`${nome} — início da loja`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px var(--line, #E4E4E7)' }} />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line font-display text-[14px] font-semibold text-ink" aria-hidden>
          {inicial}
        </span>
      )}
    </AcaoMagazine>
  )
}

/** Pontos do hero, centrados no pé: o ativo cresce para 9px. */
export function PontosDoHero({
  total,
  ativo,
  rotulos,
  irPara,
}: {
  total: number
  ativo: number
  rotulos: string[]
  irPara: (i: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-[7px]" role="tablist" aria-label="Cenas do hero">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === ativo}
          aria-label={`${i + 1} de ${total}: ${rotulos[i] ?? ''}`}
          onClick={() => irPara(i)}
          className="flex h-5 w-4 items-center justify-center"
        >
          <span
            className="block rounded-full transition-all duration-300 motion-reduce:transition-none"
            style={{
              width: i === ativo ? 9 : 6,
              height: i === ativo ? 9 : 6,
              backgroundColor: i === ativo ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            }}
          />
        </button>
      ))}
    </div>
  )
}

/** Pill no accent com "›" — o CTA do hero e o "Ver tudo" das seções. */
export function PillAccent({
  children,
  aoTocar,
  className = '',
  ...aria
}: {
  children: ReactNode
  aoTocar: () => void
  className?: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`flex items-center gap-2 rounded-pill bg-accent px-6 py-[11px] font-body text-[13.5px] font-semibold text-accent-ink transition-opacity hover:opacity-90 active:opacity-80 ${className}`}
      {...aria}
    >
      {children}
      <IconeTraco nome="chevron-right" tamanho={14} espessura={2.2} />
    </button>
  )
}

/** Título centrado de seção — o varejo fala no meio da página. */
export function TituloCentrado({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mb-[14px] text-center font-display font-semibold text-ink"
      style={{ fontSize: 'calc(24px * var(--type-factor, 1))', lineHeight: 1.2 }}
    >
      {children}
    </h2>
  )
}

// ─────────────────────────────────────────────────────────────
// Cartão magazine — chip NOVO, chip verde e "Adicionar" no cartão
// ─────────────────────────────────────────────────────────────

/**
 * O coração de favorito da RN fica de fora: o web não tem favoritos. O botão
 * "Adicionar" é um controle irmão do cartão (dois alvos, sem botão dentro de
 * botão).
 */
export function CardMagazine({
  produto,
  destaque,
  adicionado,
  aoTocar,
  aoAdicionar,
}: {
  produto: ProdutoCatalogo
  /** Primeiro item da seção: ganha o chip NOVO quando não está em promoção. */
  destaque: boolean
  adicionado: boolean
  aoTocar: () => void
  aoAdicionar: () => void
}) {
  const desc = descontoPct(produto)
  const temPromo = desc > 0

  return (
    <div className="flex min-w-0 flex-col">
      <button type="button" onClick={aoTocar} className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80">
        <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-canvasAlt">
          {produto.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.foto_url} alt="" loading="lazy" decoding="async" draggable={false} className="block h-full w-full object-cover" />
          )}
          {destaque && !temPromo && (
            <span className="absolute left-[10px] top-[10px] rounded-pill bg-surface px-[10px] py-1 font-body text-[10px] font-bold tracking-[0.6px] text-ink shadow-soft">
              NOVO
            </span>
          )}
        </span>

        <span className="mt-[9px] line-clamp-2 min-h-[36px] font-body text-[13.5px] font-semibold leading-[18px] text-ink">{produto.nome}</span>
        <span className="mt-1 flex flex-wrap items-center gap-[6px]">
          <span className="font-body text-[15px] font-bold text-ink">{formatarReais(precoFinalDe(produto))}</span>
          {temPromo && (
            <>
              <span className="font-body text-[12px] text-ink-soft line-through">{formatarReais(produto.preco)}</span>
              <span className="rounded-pill px-[7px] py-[2.5px] font-body text-[10.5px] font-bold text-success" style={{ backgroundColor: VERDE_CHIP }}>
                -{desc}% OFF
              </span>
            </>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={aoAdicionar}
        aria-label={adicionado ? `${produto.nome} na sacola` : `Adicionar ${produto.nome}`}
        className={`mt-[9px] flex items-center justify-center gap-[7px] rounded-pill border-[1.4px] py-[10px] font-body text-[12.5px] font-semibold transition-colors duration-200 ${
          adicionado ? 'border-success bg-success text-white' : 'border-ink bg-transparent text-ink hover:bg-ink/5'
        }`}
      >
        <IconeTraco nome={adicionado ? 'check' : 'bag'} tamanho={14} espessura={2.2} />
        {adicionado ? 'Na sacola' : 'Adicionar'}
      </button>
    </div>
  )
}
