'use client'

import type { MouseEvent, ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine artesã (arquétipo `artisan`: casa &
 * decoração, flores) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaArtesa.tsx.
 *
 * A referência (Graft) tem ritmo de PORTFÓLIO: seções numeradas fechando com
 * fio, nome gigante em sans arredondada, chip-etiqueta branco com o TIPO da
 * peça, setas finas. As cores vêm da pele (o "espresso" é o `--accent` da
 * paleta); aqui só vivem os cremes escritos sobre foto escurecida.
 */

/** Tempo de cena e glide (RN: 5500ms / 600ms — morno). */
export const DWELL_MS = 5500
export const GLIDE_MS = 600

/** Creme da referência sobre a foto escurecida (bandas e setas). */
export const CREME = 'rgba(255, 250, 242, 0.97)'
export const CREME_APAGADO = 'rgba(255, 250, 242, 0.72)'
export const VEU_BANDA = 'rgba(24, 19, 12, 0.42)'

export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.04) 30%, rgba(0,0,0,0.34) 64%, rgba(0,0,0,0.70) 100%)'

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

export function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/** O TIPO da peça: a 1ª palavra do nome ("Prateleira", "Buquê"). */
export function tipoDe(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome
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
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </>
  ),
} as const

export type IconeArtesa = keyof typeof ICONES

export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 1.9,
  className,
}: {
  nome: IconeArtesa
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
 * Ação do topo: ícone BRANCO sempre — sobre a foto e sobre a barra espresso
 * (a RN não faz crossfade aqui). Contador no `danger` da pele. `children`
 * substitui o ícone (a logo da casa no lugar do "voltar"); `href` vira `<a>`.
 */
export function AcaoArtesa({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeArtesa
  contador?: number
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center text-white transition-opacity hover:opacity-70 active:opacity-60'
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} tamanho={22} /> : null)}
      {contador > 0 && (
        <span
          className="absolute right-0 top-[3px] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 font-body text-[10px] font-bold leading-none text-white"
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

/** A casa no canto esquerdo: logo redonda com aro branco ou a inicial num círculo de contorno. */
export function MarcaDaCasa({ nome, logoUrl }: { nome: string; logoUrl: string | null }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '·'
  return (
    <AcaoArtesa href="/" rotulo={`${nome} — início da loja`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.6)' }} />
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border font-display text-[14px] font-semibold text-white"
          style={{ borderColor: 'rgba(255,255,255,0.7)' }}
          aria-hidden
        >
          {inicial}
        </span>
      )}
    </AcaoArtesa>
  )
}

/** Pílulas do hero (canto inferior direito): a ativa alonga para 18px. */
export function PilulasDoHero({
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
    <div className="flex items-center gap-[6px]" role="tablist" aria-label="Cenas do hero">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === ativo}
          aria-label={`${i + 1} de ${total}: ${rotulos[i] ?? ''}`}
          onClick={() => irPara(i)}
          className="flex h-5 items-center"
        >
          <span
            className="block h-[6px] rounded-[3px] transition-all duration-300 motion-reduce:transition-none"
            style={{ width: i === ativo ? 18 : 6, backgroundColor: i === ativo ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}
          />
        </button>
      ))}
    </div>
  )
}

/** CTA de contorno em pill com seta — como na referência. */
export function CtaContorno({ children, aoTocar, className = '' }: { children: ReactNode; aoTocar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`flex items-center gap-[10px] rounded-pill border px-5 py-[11px] font-body text-[14px] font-medium text-white transition-colors hover:bg-white/10 active:bg-white/15 ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.85)' }}
    >
      {children}
      <IconeTraco nome="arrow-right" tamanho={16} espessura={1.8} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Seção numerada — fio + "0N" à esquerda e rótulo à direita
// ─────────────────────────────────────────────────────────────

export function SecaoNumerada({
  id,
  numero,
  rotulo,
  conteudoFullBleed = false,
  className = '',
  children,
}: {
  id?: string
  numero: string
  rotulo: string
  /** Conteúdo sangrando de borda a borda (bandas de foto); o fio numerado continua no gutter. */
  conteudoFullBleed?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`scroll-mt-[58px] pt-[34px] ${className}`} aria-label={`${numero} ${rotulo}`}>
      {conteudoFullBleed ? children : <div className="px-screen-x">{children}</div>}
      <div className="mx-screen-x mt-7 flex items-center justify-between border-t border-line pt-[14px]">
        <span className="font-display text-[15px] font-semibold text-accent">{numero}</span>
        <span className="font-body text-[13px] font-medium text-ink-muted">{rotulo}</span>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────────

/** Chip-etiqueta branco com o TIPO da peça, como "SHELVES". */
export function EtiquetaTipo({ nome }: { nome: string }) {
  return (
    <span className="absolute right-[10px] top-[10px] rounded-sm bg-surface px-[10px] py-1 font-body text-[10px] font-bold uppercase tracking-[1.2px] text-accent">
      {tipoDe(nome)}
    </span>
  )
}

export function PrecoArtesa({ produto, tamanho }: { produto: ProdutoCatalogo; tamanho: number }) {
  const promo = temPromo(produto)
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-body font-medium text-ink-muted" style={{ fontSize: tamanho }}>
        {formatarReais(precoFinalDe(produto))}
      </span>
      {promo && (
        <span className="font-body text-ink-soft line-through" style={{ fontSize: tamanho - 2 }}>
          {formatarReais(produto.preco)}
        </span>
      )}
    </span>
  )
}

/** Cartão de grade: foto quadrada arredondada com etiqueta, nome e preço. */
export function CardArtesa({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  return (
    <button type="button" onClick={aoTocar} className="block w-full min-w-0 text-left transition-opacity hover:opacity-90 active:opacity-80">
      <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-canvasAlt">
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.foto_url} alt="" loading="lazy" decoding="async" draggable={false} className="block h-full w-full object-cover" />
        )}
        <EtiquetaTipo nome={produto.nome} />
      </span>
      <span className="mt-2 block truncate font-display text-[14px] font-semibold text-ink">{produto.nome}</span>
      <PrecoArtesa produto={produto} tamanho={13} />
    </button>
  )
}
