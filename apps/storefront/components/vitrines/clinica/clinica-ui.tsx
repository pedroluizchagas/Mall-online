'use client'

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine clínica (arquétipo `clinic`: farmácia, saúde
 * & bem-estar, veterinária) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaClinica.tsx.
 *
 * A clínica fala em UTILIDADE: superfícies brancas elevadas sobre o canvas,
 * discos accent-soft com ícone de traço, selos de estado (desconto, receita)
 * e a adição rápida no próprio cartão. As cores vêm todas da pele
 * (`bg-surface`, `bg-accent-soft`, `text-warning`…); aqui só vivem o véu do
 * hero e os brancos escritos sobre a foto.
 */

/** Tempo de cena e glide (RN: 5000ms / 550ms — calmo e preciso). */
export const DWELL_MS = 5000
export const GLIDE_MS = 550

/** Duração do estado "adicionado" do "+" (RN: 1200ms). */
export const FLASH_MS = 1200

/**
 * Largura da coluna × fator: a coluna ocupa 100vw no celular e trava em 480px
 * no desktop, então `min(f·100vw, f·480px)` é o `SCREEN_W * f` da RN.
 */
export function larg(fator: number): string {
  return `min(${+(fator * 100).toFixed(2)}vw, ${Math.round(fator * 480)}px)`
}

/** Véu do hero: a foto escurece em direção ao pé, onde vive o texto (GRADIENTE_HERO da RN). */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 28%, rgba(0,0,0,0.34) 62%, rgba(0,0,0,0.68) 100%)'

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

/** Percentual de desconto inteiro; 0 quando não há promoção válida. */
export function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

/** `metadata.exige_receita` — o mesmo contrato do ProductModal. */
export function exigeReceita(p: ProdutoCatalogo): boolean {
  return p.metadata?.exige_receita === true
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
  truck: (
    <>
      <path d="M3 7h11v9H3V7Z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v4h4" />
      <path d="M10 12h5M10 16h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
} as const

export type IconeClinica = keyof typeof ICONES

export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 2.1,
  className,
}: {
  nome: IconeClinica
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
 * Ação do header: crossfade branco (sobre a foto) → ink (header claro) — o
 * `AcaoClinica` da RN com o progresso do scroll reduzido a um estado.
 * Contador no `danger` da pele. `children` substitui o ícone (a logo da casa
 * no lugar do "voltar", que não existe no web); `href` vira `<a>`.
 */
export function AcaoClinica({
  icone,
  escuro,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeClinica
  /** `true` quando o header claro assumiu (ícone em ink); `false` sobre a foto (branco). */
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
              <IconeTraco nome={icone} tamanho={22} cor="#FFFFFF" />
            </span>
            <span className={camada} style={{ opacity: escuro ? 1 : 0 }} aria-hidden>
              <IconeTraco nome={icone} tamanho={22} cor="var(--ink, #111216)" />
            </span>
          </>
        ) : null)}
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

/** A casa no canto esquerdo: logo redonda ou a inicial num círculo, branca sobre a foto e ink depois. */
export function MarcaDaCasa({ nome, logoUrl, escuro }: { nome: string; logoUrl: string | null; escuro: boolean }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '·'
  return (
    <AcaoClinica href="/" escuro={escuro} rotulo={`${nome} — início da loja`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover transition-shadow duration-300"
          style={{ boxShadow: escuro ? '0 0 0 1px var(--line, #E4E4E7)' : '0 0 0 1px rgba(255,255,255,0.6)' }}
        />
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border font-display text-[14px] font-bold transition-colors duration-300"
          style={{
            borderColor: escuro ? 'var(--line, #E4E4E7)' : 'rgba(255,255,255,0.7)',
            color: escuro ? 'var(--ink, #111216)' : '#FFFFFF',
          }}
          aria-hidden
        >
          {inicial}
        </span>
      )}
    </AcaoClinica>
  )
}

/** Indicadores de linha no topo do hero — a ativa branca, as demais apagadas. */
export function LinhasDoHero({
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
    <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Cenas do hero">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === ativo}
          aria-label={`${i + 1} de ${total}: ${rotulos[i] ?? ''}`}
          onClick={() => irPara(i)}
          className="flex h-5 w-[30px] items-center"
        >
          <span
            className="block h-[2.5px] w-full rounded-[1.5px] transition-colors duration-300 motion-reduce:transition-none"
            style={{ backgroundColor: i === ativo ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}
          />
        </button>
      ))}
    </div>
  )
}

/** CTA fantasma em pill sobre a foto — a única ação do hero. */
export function CtaFantasma({ children, aoTocar, className = '' }: { children: ReactNode; aoTocar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`rounded-pill border px-5 py-[10px] font-body text-[13.5px] font-medium text-white transition-colors hover:bg-white/10 active:bg-white/15 ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.85)' }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Faixa de confiança
// ─────────────────────────────────────────────────────────────

export function ItemConfianca({ icone, rotulo }: { icone: IconeClinica; rotulo: string }) {
  return (
    <li className="flex flex-1 flex-col items-center gap-[7px] text-center">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
        <IconeTraco nome={icone} tamanho={16} />
      </span>
      <span className="font-body text-[10.5px] font-semibold leading-tight text-ink-muted">{rotulo}</span>
    </li>
  )
}

export function Separador() {
  return <li className="my-1 w-px bg-line" aria-hidden />
}

// ─────────────────────────────────────────────────────────────
// Cartão quadrado clínico — tocar abre; "+" adiciona rápido; selo RECEITA
// ─────────────────────────────────────────────────────────────

export function CardClinico({
  produto,
  adicionado,
  aoTocar,
  aoAdicionar,
  className = '',
  style,
}: {
  produto: ProdutoCatalogo
  adicionado: boolean
  aoTocar: () => void
  aoAdicionar: () => void
  className?: string
  style?: CSSProperties
}) {
  const desc = descontoPct(produto)
  const temPromo = desc > 0
  const receita = exigeReceita(produto)
  // Pouso elástico do "+": a animação recomeça a cada toque (remonta o botão).
  const [pulso, setPulso] = useState(0)

  const selos = (temPromo || receita) && (
    <span className="absolute left-[10px] top-[10px] flex gap-[6px]">
      {temPromo && (
        <span className="rounded-pill bg-surface px-[9px] py-1 font-body text-[11px] font-semibold text-danger shadow-soft">-{desc}%</span>
      )}
      {receita && (
        <span className="rounded-pill bg-surface px-[9px] py-1 font-body text-[10px] font-bold tracking-[0.5px] text-warning shadow-soft">
          RECEITA
        </span>
      )}
    </span>
  )

  return (
    <div className={`min-w-0 ${className}`} style={style}>
      {/* Palco quadrado: o cartão abre o produto; o "+" é um controle irmão
          (dois alvos, sem botão dentro de botão). */}
      <div className="relative aspect-square w-full">
        <button
          type="button"
          onClick={aoTocar}
          aria-label={`Ver ${produto.nome}`}
          className="absolute inset-0 block overflow-hidden rounded-lg bg-canvasAlt transition-opacity hover:opacity-90 active:opacity-80"
        >
          {produto.foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.foto_url} alt="" loading="lazy" decoding="async" draggable={false} className="block h-full w-full object-cover" />
          )}
          {selos}
        </button>
        <button
          key={pulso}
          type="button"
          onClick={() => {
            setPulso((n) => n + 1)
            aoAdicionar()
          }}
          aria-label={receita ? `Ver ${produto.nome} (exige receita)` : adicionado ? `${produto.nome} adicionado` : `Adicionar ${produto.nome}`}
          data-pouso
          className={`absolute bottom-2 right-2 flex h-[34px] w-[34px] items-center justify-center rounded-full text-accent-ink shadow-soft transition-colors duration-200 ${
            adicionado ? 'bg-success' : 'bg-accent'
          }`}
          style={{ animation: pulso > 0 ? 'clinica-pouso 420ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined }}
        >
          <IconeTraco nome={adicionado ? 'check' : 'plus'} tamanho={16} espessura={2.6} />
        </button>
      </div>

      <button type="button" onClick={aoTocar} tabIndex={-1} className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-80">
        <span className="mt-[9px] block truncate font-body text-[13.5px] font-semibold text-ink">{produto.nome}</span>
        {produto.descricao && <span className="mt-[1px] block truncate font-body text-[11.5px] text-ink-muted">{produto.descricao}</span>}
        <span className="mt-[3px] flex items-baseline gap-[6px]">
          <span className="font-body text-[14px] font-bold text-accent">{formatarReais(precoFinalDe(produto))}</span>
          {temPromo && <span className="font-body text-[11px] text-ink-soft line-through">{formatarReais(produto.preco)}</span>}
        </span>
      </button>
    </div>
  )
}

/** Keyframes do pouso elástico — uma vez por página. */
export function EstilosClinica() {
  return (
    <style>{`
      @keyframes clinica-pouso {
        0% { transform: scale(0.85); }
        60% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-pouso] { animation: none !important; }
      }
    `}</style>
  )
}
