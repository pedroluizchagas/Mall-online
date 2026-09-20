import type { MouseEvent, ReactNode } from 'react'
import { lerMetadataProduto } from '@mallevo/lib'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine cuidado (arquétipo `soft`: salões &
 * estética, pet shop, veterinária) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaCuidado.tsx.
 *
 * Serviço acolhedor: cantos bem redondos (a escala `round` da pele), acento
 * quente, Nunito, moedas de stats e cartões-tier com checklist. As cores vêm
 * da pele (`bg-accent`, `bg-accent-soft`, `text-ink`…).
 */

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

export function temPromo(p: ProdutoCatalogo): boolean {
  return !!p.preco_promocional && p.preco_promocional < p.preco
}

/** Ficha técnica publicada pelo lojista (`metadata.especificacoes`) → linhas do checklist. */
export function fichaDe(p: ProdutoCatalogo, max = 4): string[] {
  const esp = lerMetadataProduto(p.metadata).especificacoes ?? []
  return esp.map(([rotulo, valor]) => `${rotulo}: ${valor}`).slice(0, max)
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
  heart: <path d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5a4 4 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  'chevron-down': <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
} as const

export type IconeCuidado = keyof typeof ICONES

export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 2.1,
  className,
}: {
  nome: IconeCuidado
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

/** Ação do topo: moeda branca com sombra suave (o botão redondo da RN); `href` vira `<a>`. */
export function AcaoCuidado({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeCuidado
  contador?: number
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-soft transition-opacity hover:opacity-80 active:opacity-70'
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} tamanho={20} /> : null)}
      {contador > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-extrabold leading-none text-accent-ink"
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

export function Letreiro({ titulo, sub, id }: { titulo: string; sub?: string; id?: string }) {
  return (
    <div className="mb-3 px-screen-x">
      <h2 id={id} className="font-display font-extrabold text-ink" style={{ fontSize: 'calc(20px * var(--type-factor, 1))', lineHeight: 1.2 }}>
        {titulo}
      </h2>
      {sub && <p className="mt-0.5 font-body text-[13px] font-medium text-ink-muted">{sub}</p>}
    </div>
  )
}

/** Tier: cartão quente-suave (o primeiro em accent cheio), preço grande e checklist da ficha. */
export function CartaoPacote({ produto, destaque, aoTocar }: { produto: ProdutoCatalogo; destaque: boolean; aoTocar: () => void }) {
  const ficha = fichaDe(produto)
  const linhas = ficha.length > 0 ? ficha : produto.descricao ? [produto.descricao] : []
  const tinta = destaque ? 'text-accent-ink' : 'text-ink'
  const tintaSuave = destaque ? 'text-accent-ink' : 'text-ink-muted'
  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`block w-full text-left transition-transform hover:-translate-y-0.5 ${destaque ? 'bg-accent shadow-medium' : 'bg-accent-soft'} rounded-xl p-[18px]`}
    >
      {produto.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={produto.foto_url} alt="" loading="lazy" decoding="async" className="mb-3.5 block h-[120px] w-full rounded-lg bg-surfaceMuted object-cover" />
      )}
      <span className={`line-clamp-2 block font-display text-[18px] font-extrabold leading-[23px] ${tinta}`}>{produto.nome}</span>
      <span className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`font-display text-[26px] font-extrabold ${tinta}`}>{formatarReais(precoFinalDe(produto))}</span>
        {temPromo(produto) && <span className={`font-body text-[12px] line-through opacity-80 ${tintaSuave}`}>{formatarReais(produto.preco)}</span>}
      </span>
      <ul className="mt-3 flex flex-col gap-[7px] list-none p-0 m-0">
        {linhas.map((linha) => (
          <li key={linha} className="flex items-start gap-2">
            <span
              className={`mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${destaque ? 'bg-white/30 text-accent-ink' : 'bg-surface text-accent'}`}
              aria-hidden
            >
              <IconeTraco nome="check" tamanho={11} espessura={3} />
            </span>
            <span className={`line-clamp-2 font-body text-[13px] font-semibold leading-[18px] ${tintaSuave}`}>{linha}</span>
          </li>
        ))}
      </ul>
      <span
        className={`mt-4 flex h-[42px] items-center justify-center rounded-pill font-body text-[13.5px] font-extrabold ${destaque ? 'bg-surface text-accent' : 'bg-accent text-accent-ink'}`}
      >
        Escolher
      </span>
    </button>
  )
}

/** Linha de serviço: moeda com inicial (ou foto), nome, descrição, preço e seta. */
export function LinhaServico({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  return (
    <button type="button" onClick={aoTocar} className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-canvas">
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft">
        {produto.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.foto_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-[16px] font-extrabold text-accent">{produto.nome.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-bold text-ink">{produto.nome}</span>
        {produto.descricao && <span className="mt-0.5 block truncate font-body text-[12.5px] font-medium text-ink-muted">{produto.descricao}</span>}
      </span>
      <span className="shrink-0 font-display text-[15px] font-extrabold text-ink">{formatarReais(precoFinalDe(produto))}</span>
      <IconeTraco nome="chevron-right" tamanho={16} className="shrink-0 text-ink-soft" />
    </button>
  )
}
