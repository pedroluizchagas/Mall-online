import type { MouseEvent, ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine mesa (arquétipo `heritage`: restaurantes e
 * cafés com história) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaMesa.tsx.
 *
 * As referências (Veloria, Bistora, La Paloma) falam com quatro gestos: a
 * SERIFA de display em creme sobre a foto, o SELO de tradição, o ORNAMENTO
 * (fio · losango · fio) e a LINHA PONTILHADA do cardápio impresso. As cores
 * vêm da pele (`--accent` é a madeira, `--bg` o creme); aqui só vive o creme
 * escrito sobre a foto, que é DNA e vale em qualquer paleta.
 */

/** O creme do texto sobre a foto (DNA — não é token). */
export const CREME = '#FFF9F0'
export const CREME_85 = 'rgba(255, 249, 240, 0.85)'
export const CREME_45 = 'rgba(255, 249, 240, 0.45)'

/** Véu do hero: quente, mais denso no pé, onde o nome em serifa pousa. */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(26,23,20,0.30) 0%, rgba(26,23,20,0.06) 32%, rgba(26,23,20,0.38) 64%, rgba(26,23,20,0.74) 100%)'

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

export function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
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
  'chevron-down': <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
} as const

export type IconeMesa = keyof typeof ICONES

export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 2,
  className,
}: {
  nome: IconeMesa
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
// Chrome
// ─────────────────────────────────────────────────────────────

/**
 * Ação do header: crossfade creme (sobre a foto) → ink (header claro) — o
 * `AcaoMesa` da RN com o progresso do scroll reduzido a um estado. `children`
 * substitui o ícone (a logo da casa no lugar do "voltar"); `href` vira `<a>`.
 */
export function AcaoMesa({
  icone,
  escuro,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeMesa
  escuro: boolean
  contador?: number
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center transition-opacity hover:opacity-70 active:opacity-60'
  const camada =
    'absolute inset-0 flex items-center justify-center transition-opacity duration-300 motion-reduce:transition-none'
  const miolo = (
    <>
      {children ??
        (icone ? (
          <>
            <span className={camada} style={{ opacity: escuro ? 0 : 1 }} aria-hidden>
              <IconeTraco nome={icone} tamanho={22} cor={CREME} />
            </span>
            <span className={camada} style={{ opacity: escuro ? 1 : 0 }} aria-hidden>
              <IconeTraco nome={icone} tamanho={22} cor="var(--ink, #1A1714)" />
            </span>
          </>
        ) : null)}
      {contador > 0 && (
        <span
          className="absolute right-0 top-[3px] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-extrabold leading-none text-accent-ink"
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

/** A casa no canto esquerdo: logo redonda, ou a inicial em serifa num anel — creme sobre a foto, ink depois. */
export function MarcaDaCasa({ nome, logoUrl, escuro }: { nome: string; logoUrl: string | null; escuro: boolean }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '·'
  return (
    <AcaoMesa href="/" escuro={escuro} rotulo={`${nome} — início da loja`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover transition-shadow duration-300"
          style={{ boxShadow: escuro ? '0 0 0 1px var(--line, #E8DFD2)' : `0 0 0 1px ${CREME_45}` }}
        />
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border font-display text-[15px] font-semibold transition-colors duration-300"
          style={{ borderColor: escuro ? 'var(--line, #E8DFD2)' : CREME_85, color: escuro ? 'var(--ink, #1A1714)' : CREME }}
          aria-hidden
        >
          {inicial}
        </span>
      )}
    </AcaoMesa>
  )
}

// ─────────────────────────────────────────────────────────────
// Ornamentos
// ─────────────────────────────────────────────────────────────

/** Fio · losango · fio — o ornamento do cardápio impresso. */
export function Ornamento({ compacto = false, className = '' }: { compacto?: boolean; className?: string }) {
  const largura = compacto ? 28 : 44
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-hidden>
      <span className="block h-px bg-line" style={{ width: largura }} />
      <span className="block h-1.5 w-1.5 rotate-45 bg-accent" />
      <span className="block h-px bg-line" style={{ width: largura }} />
    </span>
  )
}

/** Sobrelinha de bloco em caps espaçadas, centrada, no accent (madeira). */
export function Letreiro({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="mb-4 text-center font-body text-[11px] font-semibold uppercase tracking-[2.2px] text-accent">
      {children}
    </p>
  )
}

/** Selo circular de tradição: inicial em serifa dentro de dois anéis creme. */
export function SeloTradicao({ inicial, className = '' }: { inicial: string; className?: string }) {
  return (
    <span
      className={`flex h-[74px] w-[74px] items-center justify-center rounded-full border ${className}`}
      style={{ borderColor: CREME_85 }}
      aria-hidden
    >
      <span className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full border" style={{ borderColor: CREME_45 }}>
        <span className="font-display text-[26px] font-semibold leading-[30px]" style={{ color: CREME }}>
          {inicial}
        </span>
        <span className="font-body text-[6.5px] font-bold tracking-[1.4px]" style={{ color: CREME_85 }}>
          TRADIÇÃO
        </span>
      </span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Cardápio
// ─────────────────────────────────────────────────────────────

export function Preco({ produto, tamanho, alinhar = 'left' }: { produto: ProdutoCatalogo; tamanho: number; alinhar?: 'left' | 'right' }) {
  return (
    <span className={`flex flex-col ${alinhar === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="font-display font-semibold leading-tight text-ink" style={{ fontSize: tamanho }}>
        {formatarReais(precoFinalDe(produto))}
      </span>
      {temPromo(produto) && (
        <span className="font-body text-ink-soft line-through" style={{ fontSize: tamanho - 3 }}>
          {formatarReais(produto.preco)}
        </span>
      )}
    </span>
  )
}

/** Item do cardápio-livro: foto pequena, nome em serifa, LINHA PONTILHADA até o preço, descrição leve. */
export function ItemDoCardapio({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  return (
    <button type="button" onClick={aoTocar} className="flex w-full items-start gap-3.5 text-left transition-opacity hover:opacity-85 active:opacity-75">
      {produto.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={produto.foto_url} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-sm bg-surfaceMuted object-cover" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline">
          <span className="line-clamp-2 shrink font-display text-[16px] font-semibold leading-[21px] text-ink">{produto.nome}</span>
          {/* A linha pontilhada do cardápio impresso */}
          <span className="mx-1.5 mb-[5px] min-w-[18px] flex-1 border-b border-dotted border-line" aria-hidden />
          <Preco produto={produto} tamanho={15} alinhar="right" />
        </span>
        {produto.descricao && (
          <span className="mt-[3px] line-clamp-2 block font-body text-[13px] leading-[18px] text-ink-muted">{produto.descricao}</span>
        )}
      </span>
    </button>
  )
}

/** Cartão do trilho de pratos: foto 4:5 de canto suave, nome em serifa, preço. */
export function CardPrato({ produto, aoTocar, prioridade = false }: { produto: ProdutoCatalogo; aoTocar: () => void; prioridade?: boolean }) {
  return (
    <button type="button" onClick={aoTocar} className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80">
      <span className="block w-full overflow-hidden rounded-lg bg-surfaceMuted" style={{ aspectRatio: '4 / 5' }}>
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.foto_url}
            alt=""
            loading={prioridade ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className="block h-full w-full object-cover"
          />
        )}
      </span>
      <span
        className="mt-3 block truncate font-display font-semibold text-ink"
        style={{ fontSize: 'calc(18px * var(--type-factor, 1))' }}
      >
        {produto.nome}
      </span>
      <Preco produto={produto} tamanho={14} />
    </button>
  )
}
