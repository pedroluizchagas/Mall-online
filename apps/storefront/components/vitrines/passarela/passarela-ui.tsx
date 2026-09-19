import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine passarela (arquétipo `mono`, moda
 * monocromática) — port DOM/SVG de
 * apps/mobile-consumer/components/loja/passarela-ui.tsx.
 *
 * A referência (Homelander) é um mundo sem cor: branco, tinta quase-preta e
 * fotografia em preto e branco. Ela se sustenta em três peças — o MONOGRAMA
 * COROADO (único ornamento), o CHIP de escassez (única cor do sistema) e a
 * PILL DE ADIÇÃO RÁPIDA que flutua sobre a foto e faz a compra acontecer na
 * própria grade, sem abrir o produto.
 *
 * Fora o laranja do chip, as cores NÃO moram aqui: vêm dos tokens da pele
 * (`--ink`, `--bg`, `--surface`…). No mono o accent É a tinta, então nada
 * aqui usa `--accent` — um "destaque" em accent seria invisível como diferença.
 */

/**
 * A ÚNICA cor do arquétipo: o chip de escassez. Aprofundado vs. o laranja da
 * referência (~#F97316, que dava 2,8:1 e reprovaria em texto pequeno) para
 * sustentar branco com 5,18:1. Fixo — as paletas do mono trocam a temperatura
 * do branco, nunca a cor de urgência. Espelhado em `__tests__` da lib.
 */
export const LARANJA_ESTOQUE = '#C2410C'

/** Tinta do chip: branco fixo, porque o fundo dele também é fixo. */
const TINTA_CHIP = '#FFFFFF'

/** A tinta da referência — fallback dos tokens quando a pele não injetou nada. */
export const TINTA_HEX = '#111111'

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
 * Alfa sobre um token da pele (`--ink`, `--bg`…), que só existe como CSS var:
 * `color-mix` faz o papel do `comAlfa` quando o hex não é conhecido em tempo
 * de render. Fallback hex para motores sem `color-mix`.
 */
export function tokenComAlfa(token: string, alpha: number, fallbackHex = TINTA_HEX): string {
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
 * O GRADIENTE_HERO da RN em CSS puro: perfil de DUAS bandas (denso no topo
 * para o chrome claro, ZERO no miolo, denso na base para o texto). Não é luxo
 * aqui: a moda desta vitrine é fotografada em fundo BRANCO de estúdio, e um
 * véu chapado leve deixaria o título abaixo de AA.
 */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.12) 22%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 54%, rgba(0,0,0,0.34) 76%, rgba(0,0,0,0.68) 100%)'

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
} as const

export type IconePassarela = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 19,
  cor = 'currentColor',
  espessura = 1.8,
  className,
}: {
  nome: IconePassarela
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
 * Botão circular claro com fio e sombra — o chrome INTEIRO desta vitrine,
 * legível sobre a foto do hero e sobre o branco da página sem trocar de
 * estado. O badge do contador usa a TINTA (e não o accent) porque no mono o
 * accent já é a própria tinta. `children` substitui o ícone (a logo da casa
 * no lugar do "voltar", que não existe no web).
 */
export function BotaoPassarela({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconePassarela
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — a logo da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-full border bg-surface text-ink shadow-soft transition-opacity hover:opacity-80 active:opacity-70'
  const estilo: CSSProperties = { borderColor: tokenComAlfa('--ink', 0.12) }
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} /> : null)}
      {contador > 0 && (
        <span
          className="absolute -right-[3px] -top-[3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-surface bg-ink px-1 font-body text-[10px] font-bold leading-none text-canvas"
          aria-hidden
        >
          {contador}
        </span>
      )}
    </>
  )
  if (href) {
    return (
      <a href={href} aria-label={rotulo} className={classe} style={estilo} onClick={aoTocar}>
        {miolo}
      </a>
    )
  }
  return (
    <button type="button" aria-label={rotulo} className={classe} style={estilo} onClick={aoTocar}>
      {miolo}
    </button>
  )
}

/**
 * O monograma coroado da referência — coroa de TRAÇO FINO (o oposto da coroa
 * chapada do forno: aqui o ornamento sussurra) sobre a inicial da casa. É o
 * único ornamento do arquétipo inteiro. `tamanho` é o corpo da inicial em px.
 */
export function MonogramaCoroado({
  inicial,
  tamanho,
  cor,
  className,
  style,
}: {
  inicial: string
  tamanho: number
  cor: string
  className?: string
  style?: CSSProperties
}) {
  const larguraCoroa = Math.round(tamanho * 0.62)
  return (
    <span className={`inline-flex flex-col items-center ${className ?? ''}`} style={style} aria-hidden>
      <svg
        width={larguraCoroa}
        height={Math.round(larguraCoroa * 0.56)}
        viewBox="0 0 100 56"
        fill="none"
        style={{ display: 'block' }}
      >
        <path
          d="M10 50 L10 10 L32 32 L50 6 L68 32 L90 10 L90 50 Z"
          stroke={cor}
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="block font-display font-bold"
        style={{
          marginTop: Math.round(tamanho * 0.1),
          fontSize: tamanho,
          lineHeight: `${Math.round(tamanho * 1.1)}px`,
          color: cor,
        }}
      >
        {inicial}
      </span>
    </span>
  )
}

/**
 * Chip de escassez — a única mancha de cor do design, e por isso reservada ao
 * que é de fato urgente. Fundo e tinta fixos: ele flutua sobre FOTO, não sobre
 * a página, então não pode depender da paleta.
 */
export function ChipEstoque({ texto, className }: { texto: string; className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-block rounded-full px-[10px] py-[5px] font-body text-[10.5px] font-bold uppercase tracking-[0.6px] ${className ?? ''}`}
      style={{ backgroundColor: LARANJA_ESTOQUE, color: TINTA_CHIP }}
    >
      {texto}
    </span>
  )
}

/**
 * Estado do botão de adição rápida, controlado pela vitrine. No web a
 * consulta de variações é local (`detalhes` já veio do servidor), então não
 * existe o "checando" da RN.
 */
export type EstadoRapido = 'pronta' | 'adicionado'

/**
 * A PILL DE ADIÇÃO RÁPIDA ("QUICK ADD") — o gesto que define o arquétipo: a
 * compra acontece na grade, sem abrir o produto. Branca fixa porque flutua
 * sobre a foto; ao confirmar, inverte para a tinta do tema com "NA SACOLA ✓".
 */
export function PillRapida({
  estado,
  compacta = false,
  rotulo,
  aoTocar,
  className,
}: {
  estado: EstadoRapido
  compacta?: boolean
  /** Nome acessível ("Adicionar Camisa X à sacola"). */
  rotulo: string
  aoTocar: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  const feito = estado === 'adicionado'
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={rotulo}
      aria-live="polite"
      className={`flex items-center justify-center gap-[7px] rounded-full shadow-soft transition-opacity hover:opacity-90 active:opacity-85 ${
        compacta ? 'py-[10px]' : 'py-[13px]'
      } ${feito ? 'bg-ink text-canvas' : 'bg-white text-[#111111]'} ${className ?? ''}`}
    >
      {feito ? (
        <IconeTraco nome="check" tamanho={compacta ? 13 : 15} espessura={2} />
      ) : (
        <IconeTraco nome="bag" tamanho={compacta ? 13 : 15} />
      )}
      <span className={`font-body font-semibold uppercase tracking-[1.2px] ${compacta ? 'text-[11px]' : 'text-[12px]'}`}>
        {feito ? 'Na sacola' : 'Adicionar'}
      </span>
    </button>
  )
}
