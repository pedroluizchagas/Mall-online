import type { CSSProperties, MouseEvent, ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine editorial (arquétipo `editorial`, moda /
 * beleza / acessórios) — port DOM/CSS dos gestos de
 * apps/mobile-consumer/components/loja/LojaEditorial.tsx.
 *
 * A referência (Veonn / Marion / Zaro) fala por CONTRASTE e por AUSÊNCIA: sans
 * limpa em dois pesos extremos (display 800 vs. cinza 500), branco como
 * material, cor quase nenhuma — o acento só em micro-momentos (badge de
 * desconto, contador da sacola). Nada tem caixa: o whitespace separa.
 *
 * As cores vêm TODAS da pele (`--ink`, `--ink-muted`, `--line`, `--bg`…): o
 * único DNA fixo do layout é o branco puro sobre a foto do hero e o véu que a
 * escurece em direção ao texto.
 */

/** Tempo de cena e duração do glide do hero (RN: 5000ms / 560ms). */
export const DWELL_MS = 5000
export const GLIDE_MS = 560
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
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#111111'): string {
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
 * GRADIENTE_HERO da RN em CSS puro.
 */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.36) 62%, rgba(0,0,0,0.78) 100%)'

/** Desconto inteiro (%) quando há promoção real; 0 caso contrário. */
export function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

/**
 * Keyframes do hero: o glide de 560ms da RN vira um crossfade em que a FOTO
 * anda 15% da largura (o parallax de profundidade) e o TEXTO se dissolve um
 * passo atrás. `-dir`/`-esq` são o sentido do movimento (avançar/voltar).
 * Sob "reduzir movimento" nada se mexe — a cena troca seca.
 */
export function EstilosEditorial() {
  return (
    <style>{`
      @keyframes edt-cena-entrar { from { opacity: 0; } to { opacity: 1; } }
      @keyframes edt-cena-sair { from { opacity: 1; } to { opacity: 0; } }
      @keyframes edt-foto-entrar-dir { from { transform: translateX(15%); } to { transform: translateX(0); } }
      @keyframes edt-foto-sair-dir { from { transform: translateX(0); } to { transform: translateX(-15%); } }
      @keyframes edt-foto-entrar-esq { from { transform: translateX(-15%); } to { transform: translateX(0); } }
      @keyframes edt-foto-sair-esq { from { transform: translateX(0); } to { transform: translateX(15%); } }
      @keyframes edt-texto-entrar { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes edt-texto-sair { from { opacity: 1; } to { opacity: 0; } }

      .edt-cena-entrar { animation: edt-cena-entrar ${GLIDE_MS}ms ${CURVA} both; }
      .edt-cena-sair { animation: edt-cena-sair ${GLIDE_MS}ms ${CURVA} both; }
      .edt-cena-entrar .edt-foto { animation: edt-foto-entrar-dir ${GLIDE_MS}ms ${CURVA} both; }
      .edt-cena-sair .edt-foto { animation: edt-foto-sair-dir ${GLIDE_MS}ms ${CURVA} both; }
      .edt-esq.edt-cena-entrar .edt-foto { animation-name: edt-foto-entrar-esq; }
      .edt-esq.edt-cena-sair .edt-foto { animation-name: edt-foto-sair-esq; }
      .edt-cena-entrar .edt-texto { animation: edt-texto-entrar ${Math.round(GLIDE_MS * 0.8)}ms ${CURVA} ${Math.round(GLIDE_MS * 0.25)}ms both; }
      .edt-cena-sair .edt-texto { animation: edt-texto-sair ${Math.round(GLIDE_MS * 0.5)}ms ${CURVA} both; }

      @media (prefers-reduced-motion: reduce) {
        .edt-cena-entrar, .edt-cena-sair,
        .edt-cena-entrar .edt-foto, .edt-cena-sair .edt-foto,
        .edt-cena-entrar .edt-texto, .edt-cena-sair .edt-texto { animation: none; }
        .edt-cena-sair { opacity: 0; }
      }
    `}</style>
  )
}

/**
 * Sobrelinha em caps espaçadas (11px / 2.2px) com o FIO CURTO embaixo — a
 * assinatura do overlay do hero. `fio={false}` para usos sem a régua.
 */
export function Sobrelinha({
  children,
  className = '',
  style,
  fio = true,
  corFio,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  fio?: boolean
  corFio?: string
}) {
  return (
    <div className={`flex flex-col gap-[5px] ${className}`} style={style}>
      <span className="font-body text-[11px] font-medium uppercase tracking-[2.2px]">{children}</span>
      {fio && <span className="block h-px w-9" style={{ backgroundColor: corFio ?? 'currentColor' }} aria-hidden />}
    </div>
  )
}

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
} as const

export type IconeEditorial = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 22,
  cor = 'currentColor',
  espessura = 2,
  className,
}: {
  nome: IconeEditorial
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

/**
 * Ação do topo: ícone SEM fundo que faz crossfade de branco (sobre a foto do
 * hero) para ink (quando o header claro assume) — o `AcaoHero` da RN, com o
 * progresso do scroll reduzido a um estado. Contador no `danger` da pele: a
 * única cor viva do chrome, como na RN. `children` substitui o ícone (a logo
 * da casa no lugar do "voltar", que não existe no web).
 */
export function AcaoEditorial({
  icone,
  escuro,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeEditorial
  /** `true` quando o header claro assumiu (ícone em ink); `false` sobre a foto (branco). */
  escuro: boolean
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — a logo da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center transition-opacity hover:opacity-70 active:opacity-60'
  const camada = 'absolute inset-0 flex items-center justify-center transition-opacity duration-300 motion-reduce:transition-none'
  const miolo = (
    <>
      {children ?? (icone ? (
        <>
          <span className={camada} style={{ opacity: escuro ? 0 : 1 }} aria-hidden>
            <IconeTraco nome={icone} cor="#FFFFFF" />
          </span>
          <span className={camada} style={{ opacity: escuro ? 1 : 0 }} aria-hidden>
            <IconeTraco nome={icone} cor="var(--ink, #111111)" />
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

/**
 * Pontos do carrossel: o ativo é um ANEL branco de 9px, os demais pontos
 * cheios de 5px meio apagados — como na RN. Botões: quem prefere menos
 * movimento troca de cena por aqui.
 */
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
    <div className="flex items-center gap-[7px]" role="tablist" aria-label="Cenas do hero">
      {Array.from({ length: total }, (_, i) => {
        const emCena = i === ativo
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={emCena}
            aria-label={`${i + 1} de ${total}: ${rotulos[i] ?? ''}`}
            onClick={() => irPara(i)}
            className="flex h-5 w-[9px] items-center justify-center"
          >
            <span
              className="block rounded-full transition-all duration-300 motion-reduce:transition-none"
              style={
                emCena
                  ? { width: 9, height: 9, border: '1.5px solid #FFFFFF' }
                  : { width: 5, height: 5, backgroundColor: 'rgba(255,255,255,0.6)' }
              }
            />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Preço no tom editorial: cinza discreto; em promoção o final vira ink pesado
 * e o original fica riscado e apagado ao lado.
 */
export function PrecoEditorial({ produto, tamanho }: { produto: ProdutoCatalogo; tamanho: number }) {
  const promo = descontoPct(produto) > 0
  return (
    <span className="mt-[2px] flex items-center gap-[6px] font-body">
      <span
        className={promo ? 'font-semibold text-ink' : 'font-medium text-ink-muted'}
        style={{ fontSize: tamanho }}
      >
        {formatarReais(precoFinalDe(produto))}
      </span>
      {promo && (
        <span className="font-normal text-ink-soft line-through" style={{ fontSize: tamanho - 1 }}>
          {formatarReais(produto.preco)}
        </span>
      )}
    </span>
  )
}

/**
 * Badge do card: pill BRANCA com sombra suave sobre a foto — "-30%" ou "Novo".
 * O raio segue a pele (`rounded-pill`: 8px na escala sharp do editorial).
 */
export function BadgeCard({ children }: { children: ReactNode }) {
  return (
    <span className="absolute bottom-[10px] left-[10px] rounded-pill bg-white px-[10px] py-1 font-body text-[11px] font-semibold text-ink shadow-soft">
      {children}
    </span>
  )
}
