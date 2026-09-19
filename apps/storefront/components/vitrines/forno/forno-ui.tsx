import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine forno (arquétipo `slice`) — port DOM/SVG de
 * apps/mobile-consumer/components/loja/forno-ui.tsx.
 *
 * A referência (Restaurin / "Pizza Lounge") constrói tudo com quatro gestos: a
 * COROA real do logo, a pizza em RECORTE REDONDO sem moldura, os CÍRCULOS
 * CONCÊNTRICOS que viram alvo atrás dela e o line-art FANTASMA de cozinha nos
 * cartões claros. Mais o botão circular creme que é o chrome inteiro.
 *
 * As cores NÃO moram aqui: quem chama passa a cor (constante de DNA da vitrine
 * ou `var(--token)` da pele). Tamanhos aceitam número (px) ou string CSS
 * (`'10%'`, `'min(10vw, 48px)'`) — no web a coluna tem até 480px e nada é
 * medido por `Dimensions`.
 */

type Tamanho = number | string

/** rgba a partir de hex — véus, anéis e traços derivados das constantes. */
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
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#111216'): string {
  return `color-mix(in srgb, var(${token}, ${fallbackHex}) ${Math.round(alpha * 100)}%, transparent)`
}

/**
 * Largura da coluna × fator: a coluna ocupa 100vw no celular e trava em 480px
 * no desktop, então `min(f·100vw, f·480px)` é o `SCREEN_W * f` da RN.
 */
export function larg(fator: number): string {
  return `min(${+(fator * 100).toFixed(2)}vw, ${Math.round(fator * 480)}px)`
}

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
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'chevron-down': <path d="M5 9l7 7 7-7" />,
  'chevron-right': <path d="M9 5l7 7-7 7" />,
} as const

export type IconeForno = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 19,
  cor = 'currentColor',
  espessura = 2.1,
  className,
}: {
  nome: IconeForno
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
 * Botão circular creme com fio e sombra — o chrome INTEIRO desta vitrine. O
 * creme com contorno é o que o mantém legível sobre os três palcos por onde
 * ele passa (o preto do hero, o ouro do pôster e o creme da página) sem
 * precisar trocar de estado no scroll. `children` substitui o ícone (a logo
 * da casa no lugar do "voltar", que não existe no web).
 */
export function BotaoForno({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeForno
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — o chip da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-full border border-line bg-surface text-ink shadow-soft transition-opacity hover:opacity-80 active:opacity-70'
  const estilo: CSSProperties = { borderColor: tokenComAlfa('--ink', 0.14) }
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} /> : null)}
      {contador > 0 && (
        <span
          className="absolute -right-[3px] -top-[3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-surface bg-accent px-1 text-[10px] font-extrabold leading-none text-accent-ink"
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
 * A coroa do logo da referência — chapada, três pontas, sem contorno. Aparece
 * sozinha acima do wordmark, no fecho e dentro dos badges redondos.
 */
export function Coroa({
  tamanho,
  cor,
  className,
  style,
}: {
  tamanho: Tamanho
  cor: string
  className?: string
  style?: CSSProperties
}) {
  // Proporção do desenho (100×86): a coroa é mais larga que alta.
  return (
    <svg
      viewBox="0 0 100 86"
      aria-hidden
      className={className}
      style={{ width: tamanho, height: 'auto', aspectRatio: '100 / 86', display: 'block', ...style }}
    >
      <path
        d="M12 78 L12 20 L34 48 L50 12 L66 48 L88 20 L88 78 Z"
        fill={cor}
        // O traço da própria cor arredonda as pontas: o glifo da referência
        // é gordo e sem bico agulhado.
        stroke={cor}
        strokeWidth={7}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Fatia de pizza — o segundo ícone dos badges redondos do cartão da casa. */
export function Fatia({
  tamanho,
  cor,
  className,
  style,
}: {
  tamanho: Tamanho
  cor: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={className}
      style={{ width: tamanho, height: 'auto', aspectRatio: '1', display: 'block', ...style }}
    >
      <path
        d="M50 10 L88 84 Q50 96 12 84 Z"
        fill={cor}
        stroke={cor}
        strokeWidth={6}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * A pizza em RECORTE REDONDO — o gesto central da referência: a foto top-down
 * entra sem moldura, só o círculo. Serve do disco gigante do hero ao thumb do
 * cardápio. `anel` desenha o fio fino que a referência usa quando o disco cai
 * sobre um bloco de cor chapada; `sombra` é a shadow.medium do hero.
 *
 * `tamanho` em px ou CSS (`'92%'`): o disco é sempre quadrado (`aspect-ratio`).
 */
export function PizzaRedonda({
  src,
  alt = '',
  tamanho,
  anel,
  sombra = false,
  carregamento = 'lazy',
  className,
  style,
}: {
  src: string
  alt?: string
  tamanho: Tamanho
  anel?: string
  sombra?: boolean
  /** Hero = `eager` (é o LCP da página); discos do pôster/lista = `lazy`. */
  carregamento?: 'lazy' | 'eager'
  className?: string
  style?: CSSProperties
}) {
  const sombras = [
    anel ? `0 0 0 1.5px ${anel}` : null,
    sombra ? '0 8px 18px rgba(0, 0, 0, 0.10)' : null,
  ].filter(Boolean)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={carregamento}
      fetchPriority={carregamento === 'eager' ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={`block shrink-0 rounded-full object-cover ${className ?? ''}`}
      style={{
        width: tamanho,
        height: 'auto',
        aspectRatio: '1',
        boxShadow: sombras.length ? sombras.join(', ') : undefined,
        ...style,
      }}
    />
  )
}

/**
 * Os anéis concêntricos que a referência coloca ATRÁS da pizza — o alvo. Só
 * traço, nunca preenchimento: quem carrega a cor cheia é o bloco por baixo.
 * `non-scaling-stroke` mantém o fio em 1,5px em qualquer tamanho, como o
 * viewBox em px fazia na RN.
 */
export function CirculosConcentricos({
  cor,
  className,
  style,
}: {
  cor: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={className}
      style={{ display: 'block', ...style }}
    >
      {[0.55, 0.7, 0.85, 1].map((f) => (
        <circle
          key={f}
          cx={50}
          cy={50}
          // −1 para o anel externo não ser cortado pela borda do viewBox.
          r={50 * f - 1}
          stroke={cor}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      ))}
    </svg>
  )
}

/** Folha em lente entre dois pontos — a pétala do raminho, só traço. */
function folha(x: number, y: number, dx: number, dy: number): string {
  const fx = x + dx
  const fy = y + dy
  return `M${x},${y} Q${x + dx * 0.1},${y + dy * 0.95} ${fx},${fy} Q${x + dx * 0.95},${y + dy * 0.1} ${x},${y}`
}

/**
 * Line-art fantasma de cozinha: o garfo e o raminho que a referência imprime
 * quase invisíveis no fundo dos cartões claros. Puramente decorativo — quem
 * chama passa uma cor já esmaecida.
 */
export function RabiscoCozinha({
  largura,
  cor,
  motivo,
  espessura = 2,
  className,
  style,
}: {
  largura: Tamanho
  cor: string
  motivo: 'garfo' | 'raminho'
  espessura?: number
  className?: string
  style?: CSSProperties
}) {
  const traco = {
    stroke: cor,
    strokeWidth: espessura,
    strokeLinecap: 'round' as const,
    fill: 'none',
    vectorEffect: 'non-scaling-stroke' as const,
  }

  if (motivo === 'garfo') {
    // Garfo alto e estreito: dentes, concha e cabo num só gesto.
    return (
      <svg
        viewBox="0 0 40 100"
        aria-hidden
        className={className}
        style={{ width: largura, height: 'auto', aspectRatio: '40 / 100', display: 'block', ...style }}
      >
        <path d="M8 8 L8 30 Q8 42 20 42 Q32 42 32 30 L32 8" {...traco} />
        <path d="M20 8 L20 92" {...traco} />
      </svg>
    )
  }

  // Raminho: haste em curva com quatro folhas alternadas.
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={className}
      style={{ width: largura, height: 'auto', aspectRatio: '1', display: 'block', ...style }}
    >
      <path d="M8 94 Q38 66 90 10" {...traco} />
      <path d={folha(32, 72, 22, -16)} {...traco} />
      <path d={folha(30, 74, -18, -14)} {...traco} />
      <path d={folha(58, 46, 24, -14)} {...traco} />
      <path d={folha(56, 48, -18, -12)} {...traco} />
    </svg>
  )
}
