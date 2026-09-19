import type { CSSProperties, ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine serena (arquétipo `serene`, beleza, skincare
 * e joias delicadas) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaSerena.tsx.
 *
 * A referência (All Natural) fala baixo: branco, cinza-névoa, ink e o ardósia
 * do tema; Inter em peso LEVE, sentence case; fios finos e raios suaves. Nada
 * grita — a delicadeza vem do peso da letra e do respiro, não da cor.
 *
 * As cores continuam vindo da pele (`bg-surface`, `bg-canvasAlt`, `text-ink`,
 * `--accent`); aqui só vivem o véu do hero e os poucos brancos escritos sobre
 * a foto, que valem em qualquer paleta do arquétipo.
 */

/** Tempo de cena e duração do glide (RN: 6000ms / 650ms — o mais calmo do sistema). */
export const DWELL_MS = 6000
export const GLIDE_MS = 650
export const CURVA = 'cubic-bezier(0.4, 0, 0.2, 1)'

/** rgba a partir de hex — véus e fios derivados das constantes. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Alfa sobre um token da pele (`--ink`, `--accent`…), que só existe como CSS
 * var: `color-mix` faz o papel do `comAlfa` quando o hex não é conhecido em
 * tempo de render. Fallback hex para motores sem `color-mix`.
 */
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#3E5257'): string {
  return `color-mix(in srgb, var(${token}, ${fallbackHex}) ${Math.round(alpha * 100)}%, transparent)`
}

/**
 * Largura da coluna × fator: a coluna ocupa 100vw no celular e trava em 480px
 * no desktop, então `min(f·100vw, f·480px)` é o `SCREEN_W * f` da RN.
 */
export function larg(fator: number): string {
  return `min(${+(fator * 100).toFixed(2)}vw, ${Math.round(fator * 480)}px)`
}

/**
 * Véu do hero: a foto escurece em direção ao pé, onde vive o texto — o
 * GRADIENTE_HERO da RN em CSS puro, mais leve que o do noir porque a foto
 * serena é clara e o texto branco precisa só de um apoio.
 */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.30) 62%, rgba(0,0,0,0.62) 100%)'

/** Lido na hora do gesto: quem liga "reduzir movimento" no meio da visita é atendido. */
export function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

/** Percentual de desconto inteiro; 0 quando não há promoção válida. */
export function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

/**
 * A casa no canto esquerdo do header — ocupa o lugar do "voltar" da RN, que
 * não existe no web (a loja é a raiz do host). Logo redonda com fio fino ou,
 * sem logo, a inicial do nome num círculo de contorno.
 */
export function MarcaDaCasa({ nome, logoUrl }: { nome: string; logoUrl: string | null }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '·'
  return (
    <a
      href="/"
      aria-label={`${nome} — início da loja`}
      className="flex h-10 w-10 shrink-0 items-center justify-center transition-opacity hover:opacity-70 active:opacity-60"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
          style={{ boxShadow: `0 0 0 1px ${tokenComAlfa('--ink', 0.12, '#111216')}` }}
        />
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border font-display text-[14px] font-normal text-ink"
          style={{ borderColor: tokenComAlfa('--ink', 0.2, '#111216') }}
          aria-hidden
        >
          {inicial}
        </span>
      )}
    </a>
  )
}

/**
 * Indicadores do hero: LINHAS segmentadas no TOPO, como na referência — a
 * ativa branca, as demais brancas apagadas. Botões: quem prefere menos
 * movimento troca de cena por aqui.
 */
export function LinhasSegmentadas({
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
            className="block h-[2px] w-full rounded-[1px] transition-colors duration-300 motion-reduce:transition-none"
            style={{ backgroundColor: i === ativo ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}
          />
        </button>
      ))}
    </div>
  )
}

/**
 * CTA fantasma — contorno fino, fundo transparente; a única "ação" do hero. O
 * preenchimento só aparece no hover, e sutil.
 */
export function CtaFantasma({
  children,
  aoTocar,
  className = '',
  style,
}: {
  children: ReactNode
  aoTocar: () => void
  className?: string
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      className={`rounded-md border px-[22px] py-[11px] font-body text-[14px] font-medium text-white transition-colors hover:bg-white/10 active:bg-white/15 ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.8)', ...style }}
    >
      {children}
    </button>
  )
}

/** Chip de promo: pill branca com texto vermelho, como na referência. */
export function ChipPromo({ pct }: { pct: number }) {
  return (
    <span className="absolute left-3 top-3 rounded-pill bg-surface px-[10px] py-1 font-body text-[12px] font-medium text-danger shadow-soft">
      -{pct}%
    </span>
  )
}

/**
 * Card sereno — palco quadrado cinza-névoa, chip de promo, e nome + preço
 * FORA do card, na mesma linha (referência exata). O coração de favorito da
 * RN fica de fora: o web não tem favoritos.
 */
export function CardSereno({ produto, aoTocar }: { produto: ProdutoCatalogo; aoTocar: () => void }) {
  const desc = descontoPct(produto)
  const temPromo = desc > 0
  return (
    <button
      type="button"
      onClick={aoTocar}
      className="block w-full min-w-0 text-left transition-opacity hover:opacity-90 active:opacity-80"
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-canvasAlt">
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.foto_url}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="block h-full w-full object-cover"
          />
        )}
        {temPromo && <ChipPromo pct={desc} />}
      </span>

      <span className="mt-[10px] flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate font-body text-[15px] font-medium text-ink">{produto.nome}</span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="font-body text-[15px] font-medium text-ink">{formatarReais(precoFinalDe(produto))}</span>
          {temPromo && (
            <span className="font-body text-[12px] text-ink-soft line-through">{formatarReais(produto.preco)}</span>
          )}
        </span>
      </span>
    </button>
  )
}
