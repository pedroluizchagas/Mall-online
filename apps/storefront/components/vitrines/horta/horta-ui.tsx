import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine horta (arquétipo `garden`) — port DOM/SVG de
 * apps/mobile-consumer/components/loja/horta-ui.tsx.
 *
 * A referência (Sonder & Sprout) constrói tudo com três gestos manuais: o SELO
 * ESCALOPADO de feira, o RABISCO de arco a mão livre e a FOTO-ADESIVO com
 * contorno branco. Mais o botão-adesivo circular creme que é o chrome inteiro.
 *
 * As cores NÃO moram aqui: quem chama passa a cor (constante de DNA da vitrine
 * ou `var(--token)` da pele). Tamanhos aceitam número (px) ou string CSS
 * (`'27%'`, `'min(27vw, 130px)'`) — no web a coluna tem até 480px e nada é
 * medido por `Dimensions`.
 */

type Tamanho = number | string

/** rgba a partir de hex — véus, fios e traços derivados das constantes. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Alfa sobre um token da pele (`--ink`, `--accent-ink`…), que só existe como
 * CSS var: `color-mix` faz o papel do `comAlfa` quando o hex não é conhecido
 * em tempo de render. Fallback hex para motores sem `color-mix`.
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

/** Número vira `px`; string CSS passa direto. */
function css(t: Tamanho): string {
  return typeof t === 'number' ? `${t}px` : t
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
  'chevron-down': <path d="M5 9l7 7 7-7" />,
} as const

export type IconeHorta = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 19,
  cor = 'currentColor',
  espessura = 2.1,
  className,
}: {
  nome: IconeHorta
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
 * Botão-adesivo circular creme com fio e sombra — o chrome INTEIRO desta
 * vitrine (não há pill nem barra de menu). O creme com contorno é o que o
 * mantém legível tanto sobre o verde do hero quanto sobre o creme da página,
 * sem precisar de dois estados. `contador` acende o disco de sacola;
 * `children` substitui o ícone (a logo da casa no lugar do "voltar", que não
 * existe no web).
 */
export function BotaoAdesivo({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeHorta
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — o adesivo da casa que leva ao topo da loja. */
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
 * Contorno escalopado (flor) do selo, em coordenadas polares:
 * `r(θ) = R · (0,90 + 0,10 · cos(nθ))`. Amostrado a cada 3° e fechado com `Z` —
 * as pétalas nascem da própria função, sem path desenhado à mão. Sempre num
 * viewBox 100×100: o SVG escala com o tamanho pedido.
 */
function pathEscalopado(petalas: number): string {
  const raio = 50
  const passos = 120
  const pontos: string[] = []
  for (let i = 0; i < passos; i++) {
    const t = (i / passos) * Math.PI * 2
    const r = raio * (0.9 + 0.1 * Math.cos(petalas * t))
    const x = raio + r * Math.cos(t)
    const y = raio + r * Math.sin(t)
    pontos.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `${pontos.join(' ')} Z`
}

/**
 * Selo recortado de feira: o conector "&" do hero, o badge do cartão e a
 * assinatura do fecho. Os filhos ficam centrados por cima do recorte.
 * `tamanho` em px ou CSS (`larg(0.27)`, `'28%'`) — o selo é sempre quadrado.
 */
export function SeloRecortado({
  tamanho,
  cor,
  rotacao = 0,
  petalas = 12,
  className,
  style,
  children,
}: {
  tamanho: Tamanho
  cor: string
  /** Graus. O selo da referência nunca está a prumo. */
  rotacao?: number
  petalas?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative flex shrink-0 items-center justify-center ${className ?? ''}`}
      style={{
        width: css(tamanho),
        aspectRatio: '1',
        transform: rotacao ? `rotate(${rotacao}deg)` : undefined,
        ...style,
      }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={pathEscalopado(petalas)} fill={cor} />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  )
}

/**
 * Rabisco de arco a mão livre — dois traços concêntricos de ponta redonda, o
 * doodle que a referência espalha pelos cantos. Puramente decorativo.
 * `non-scaling-stroke` mantém o fio na espessura pedida em qualquer tamanho.
 */
export function Rabisco({
  largura,
  cor,
  espessura = 2.5,
  className,
  style,
}: {
  largura: Tamanho
  cor: string
  espessura?: number
  className?: string
  style?: CSSProperties
}) {
  // Dois arcos abertos, o de dentro mais curto — a mão que desenha não fecha
  // o traço nem repete o mesmo raio. Coordenadas num viewBox 100×92.
  const externo = 'M 6 86.5 A 52 53.4 0 0 1 92 11'
  const interno = 'M 30 87.4 A 34 35 0 0 1 90 38.6'
  const traco = {
    stroke: cor,
    strokeWidth: espessura,
    strokeLinecap: 'round' as const,
    fill: 'none',
    vectorEffect: 'non-scaling-stroke' as const,
  }
  return (
    <svg
      viewBox="0 0 100 92"
      aria-hidden
      className={`pointer-events-none block ${className ?? ''}`}
      style={{ width: css(largura), height: 'auto', aspectRatio: '100 / 92', ...style }}
    >
      <path d={externo} {...traco} />
      <path d={interno} {...traco} />
    </svg>
  )
}

/**
 * Foto-adesivo: a moldura BRANCA de cantos assimétricos que a referência usa
 * para colar prato e ambiente na página.
 *
 * O adesivo é a moldura: raios diferentes em cada canto (nunca um retângulo a
 * prumo) + rotação sutil. Os raios são fração da MENOR dimensão (`--base`),
 * calculada em CSS a partir da largura e da proporção — em tela grande a
 * assimetria continua visível. A imagem interna repete os raios menos a
 * borda, senão o canto vaza no papel.
 *
 * `largura` em px ou CSS (`larg(0.82)`); `proporcao` = altura/largura.
 */
export function FotoAdesivo({
  src,
  alt = '',
  largura,
  proporcao,
  rotacao = 0,
  borda = 7,
  sombra = true,
  carregamento = 'lazy',
  className,
  style,
}: {
  src: string
  alt?: string
  largura: Tamanho
  proporcao: number
  rotacao?: number
  borda?: number
  sombra?: boolean
  /** A foto do hero é `eager` (LCP); as demais, `lazy`. */
  carregamento?: 'lazy' | 'eager'
  className?: string
  style?: CSSProperties
}) {
  const raios = { tl: 0.3, tr: 0.42, br: 0.26, bl: 0.46 }
  const externo = (f: number) => `calc(var(--base) * ${f})`
  const interno = (f: number) => `max(0px, calc(var(--base) * ${f} - ${borda}px))`
  return (
    <div
      className={`box-border shrink-0 bg-white ${sombra ? 'shadow-medium' : ''} ${className ?? ''}`}
      style={
        {
          '--base': `calc(${css(largura)} * ${Math.min(1, proporcao)})`,
          width: css(largura),
          aspectRatio: `1 / ${proporcao}`,
          padding: borda,
          transform: rotacao ? `rotate(${rotacao}deg)` : undefined,
          borderTopLeftRadius: externo(raios.tl),
          borderTopRightRadius: externo(raios.tr),
          borderBottomRightRadius: externo(raios.br),
          borderBottomLeftRadius: externo(raios.bl),
          ...style,
        } as CSSProperties
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={carregamento}
        fetchPriority={carregamento === 'eager' ? 'high' : undefined}
        decoding="async"
        draggable={false}
        className="block h-full w-full object-cover"
        style={{
          borderTopLeftRadius: interno(raios.tl),
          borderTopRightRadius: interno(raios.tr),
          borderBottomRightRadius: interno(raios.br),
          borderBottomLeftRadius: interno(raios.bl),
        }}
      />
    </div>
  )
}
