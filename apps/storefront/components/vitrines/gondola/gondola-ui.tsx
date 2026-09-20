'use client'

import { useState, type MouseEvent, type ReactNode } from 'react'
import { lerMetadataProduto } from '@mallevo/lib'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine gôndola (arquétipo `market`: mercado &
 * conveniência, construção, oficinas) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaGondola.tsx.
 *
 * Compra de mercado é escaneável e por preço: superfícies brancas com fio,
 * PREÇO GRANDE (verde da pele quando em oferta, com a unidade "/kg"),
 * chips de categoria e o "+" de adição rápida que vira contador. As cores
 * vêm da pele (`bg-accent`, `bg-accent-soft`, `text-ink`…).
 */

/** Duração do "✓" depois de adicionar (RN: 900ms). */
export const FLASH_MS = 900
/** Ofertas: os maiores descontos primeiro, até este teto. */
export const MAX_OFERTAS = 10

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

export function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

/** "/kg", "/un" — a unidade de venda publicada pelo lojista (`metadata.unidade`). */
export function sufixoUnidade(p: ProdutoCatalogo): string {
  const u = lerMetadataProduto(p.metadata).unidade
  return typeof u === 'string' && u.trim() ? `/${u.trim()}` : ''
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
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  'close-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
} as const

export type IconeGondola = keyof typeof ICONES

export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 2.2,
  className,
}: {
  nome: IconeGondola
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

/** Ação do header claro: ícone ink, badge no accent. `children` substitui o ícone; `href` vira `<a>`. */
export function AcaoGondola({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeGondola
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
      {children ?? (icone ? <IconeTraco nome={icone} tamanho={22} espessura={2.1} /> : null)}
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

/** Letreiro de corredor: título pesado à esquerda, contagem em caps à direita. */
export function Letreiro({ titulo, contagem, id }: { titulo: string; contagem: number; id?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 id={id} className="font-display font-extrabold text-ink" style={{ fontSize: 'calc(17px * var(--type-factor, 1))', lineHeight: 1.2 }}>
        {titulo}
      </h2>
      <span className="shrink-0 font-body text-[11.5px] font-bold uppercase tracking-[0.6px] text-ink-soft">
        {contagem} {contagem === 1 ? 'item' : 'itens'}
      </span>
    </div>
  )
}

/** Preço grande da gôndola: verde quando em oferta, unidade colada, antigo riscado. */
export function PrecoGondola({ produto, tamanho }: { produto: ProdutoCatalogo; tamanho: number }) {
  const desc = descontoPct(produto)
  return (
    <span className="flex flex-col">
      <span className={`font-display font-extrabold leading-tight ${desc > 0 ? 'text-accent' : 'text-ink'}`} style={{ fontSize: tamanho }}>
        {formatarReais(precoFinalDe(produto))}
        <span className="font-body font-semibold text-ink-muted" style={{ fontSize: Math.round(tamanho * 0.7) }}>
          {sufixoUnidade(produto)}
        </span>
      </span>
      {desc > 0 && (
        <span className="font-body text-[10.5px] text-ink-soft line-through">{formatarReais(produto.preco)}</span>
      )}
    </span>
  )
}

/** Cartão de oferta do trilho: foto pequena, -N%, preço na frente. */
export function CardOferta({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      className="block w-[150px] shrink-0 snap-start rounded-md border border-line bg-surface p-2.5 text-left transition-opacity hover:opacity-90"
    >
      <span className="flex items-center gap-2">
        <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-surfaceMuted">
          {produto.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.foto_url} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover" />
          )}
        </span>
        <span className="rounded-pill bg-accent px-[7px] py-[3px] font-body text-[10.5px] font-extrabold text-accent-ink">-{descontoPct(produto)}%</span>
      </span>
      <span className="mt-2 block">
        <PrecoGondola produto={produto} tamanho={16} />
      </span>
      <span className="mt-1 line-clamp-2 block font-body text-[12px] font-semibold leading-4 text-ink">{produto.nome}</span>
    </button>
  )
}

/**
 * Cartão da grade densa — foto quadrada pequena, nome em duas linhas, preço
 * grande e o "+" de adição rápida que vira contador. Dois controles irmãos
 * (sem botão dentro de botão).
 */
export function CardGondola({
  produto,
  quantidade,
  acabouDeEntrar,
  aoTocar,
  aoAdicionar,
}: {
  produto: ProdutoCatalogo
  quantidade: number
  acabouDeEntrar: boolean
  aoTocar: () => void
  aoAdicionar: () => void
}) {
  const desc = descontoPct(produto)
  const [pulso, setPulso] = useState(0)
  return (
    <div className="flex min-w-0 flex-col rounded-md border border-line bg-surface p-2">
      <button type="button" onClick={aoTocar} className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80">
        <span className="relative block aspect-square w-full overflow-hidden rounded-sm bg-surfaceMuted">
          {produto.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.foto_url} alt="" loading="lazy" decoding="async" draggable={false} className="block h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-ink-soft" aria-hidden>
              <IconeTraco nome="bag" tamanho={20} />
            </span>
          )}
          {desc > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded-pill bg-accent px-1.5 py-0.5 font-body text-[10px] font-extrabold text-accent-ink">-{desc}%</span>
          )}
        </span>
        <span className="mt-[7px] line-clamp-2 block min-h-[31px] font-body text-[12px] font-semibold leading-[15.5px] text-ink">{produto.nome}</span>
        <span className="mt-1 block">
          <PrecoGondola produto={produto} tamanho={15} />
        </span>
      </button>
      <button
        key={pulso}
        type="button"
        data-pouso
        onClick={() => {
          setPulso((n) => n + 1)
          aoAdicionar()
        }}
        aria-label={quantidade > 0 ? `${produto.nome}: ${quantidade} na sacola, adicionar mais um` : `Adicionar ${produto.nome}`}
        className={`mt-2 flex h-8 items-center justify-center gap-1.5 rounded-pill font-body text-[12.5px] font-extrabold transition-colors duration-200 ${
          acabouDeEntrar ? 'bg-success text-accent-ink' : quantidade > 0 ? 'bg-accent text-accent-ink' : 'bg-surfaceMuted text-ink hover:bg-accent-soft'
        }`}
        style={{ animation: pulso > 0 ? 'gondola-pouso 380ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined }}
      >
        <IconeTraco nome={acabouDeEntrar ? 'check' : 'plus'} tamanho={14} espessura={2.6} />
        {quantidade > 0 && !acabouDeEntrar ? quantidade : null}
      </button>
    </div>
  )
}

/** Keyframes do pouso do "+" — uma vez por página. */
export function EstilosGondola() {
  return (
    <style>{`
      @keyframes gondola-pouso { 0% { transform: scale(0.86); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
      @media (prefers-reduced-motion: reduce) { [data-pouso] { animation: none !important; } }
    `}</style>
  )
}
