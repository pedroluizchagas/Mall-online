import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine ritual (arquétipo `ritual`) — port DOM/CSS do
 * apoio de apps/mobile-consumer/components/loja/LojaRitual.tsx.
 *
 * A referência (OCHA) fala com UMA forma: a pill. A página rosa é uma família
 * de cartões de canto redondo flutuando com um gutter visível ao redor de
 * cada um, o chrome é uma pílula flutuante e as miniaturas são quadradinhos
 * arredondados. As cores de DNA moram aqui (creme do cardápio, rosa do menu,
 * anel branco); as cores da PELE (rosa da página / roxo do accent) entram por
 * `var(--token)` — as paletas `matcha` e `pitaya` repintam tudo sem código
 * novo.
 */

// ── Geometria da família de cartões ──
/** Gutter rosa visível ao redor de TODO cartão — a assinatura nº 1 da página. */
export const GUTTER = 12
/** Canto dos cartões: sempre o mesmo, o layout inteiro é uma família de pills. */
export const RAIO_CARTAO = 28
/** Altura da pílula flutuante do topo. */
export const ALTURA_PILL = 52

// ── DNA fixo da vitrine (independe da paleta; a paleta muda rosa/accent) ──
/** Papel creme do cardápio — o cartão tipográfico da referência. */
export const CREME = '#FBF3DC'
/**
 * Itens e preços do menu sobre o creme (4,85:1). Fixo, e não `--accent`: o
 * rosa claro da referência reprova AA, e as paletas trocam o accent sem
 * garantir contraste sobre o creme fixo.
 */
export const ROSA_MENU = '#B93A72'
/** Anel da miniatura ativa do hero. */
export const ANEL_ATIVO = '#FFFFFF'

/** A voz de manifesto da casa: humor de marca, neutro de nicho. */
export const MANIFESTO_PADRAO =
  'A GENTE PREPARA. AS AMIZADES, OS ROLÊS E AS BOAS IDEIAS QUE VIEREM DEPOIS SÃO POR SUA CONTA.'

/**
 * A Shrikhand groovy é DNA DESTA vitrine, não token do arquétipo: carregada
 * pela `FonteDna` e, enquanto não chega — ou se falhar —, cai no display da
 * pele. Muda o sabor do wordmark, nunca o layout.
 */
export const GROOVY: CSSProperties = {
  fontFamily: '"Shrikhand", var(--font-display), serif',
  fontWeight: 400,
}

/** rgba a partir de hex — véus e contornos derivados das constantes. */
export function comAlfa(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Alfa sobre um token da pele (`--accent-ink`, `--ink`…), que só existe como
 * CSS var: `color-mix` faz o papel do `comAlfa` quando o hex não é conhecido
 * em tempo de render.
 */
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#FBF3DC'): string {
  return `color-mix(in srgb, var(${token}, ${fallbackHex}) ${Math.round(alpha * 100)}%, transparent)`
}

/**
 * Largura da coluna × fator: a coluna ocupa 100vw no celular e trava em 480px
 * no desktop, então `min(f·100vw, f·480px)` é o `SCREEN_W * f` da RN.
 */
export function larg(fator: number): string {
  return `min(${+(fator * 100).toFixed(2)}vw, ${Math.round(fator * 480)}px)`
}

/** Largura do CARTÃO (coluna menos os dois gutters) × fator — o `largura * f` da RN. */
export function largCartao(fator: number): string {
  return `calc((min(100vw, 480px) - ${GUTTER * 2}px) * ${+fator.toFixed(3)})`
}

/** Largura média das caixas-altas da Shrikhand em em — para o "adjustsFontSizeToFit". */
const LARGURA_CAPS_GROOVY = 0.7

/**
 * O `adjustsFontSizeToFit` + `numberOfLines={1}` da RN em CSS: a linha nasce
 * no corpo pedido (já com `--type-factor`) e só encolhe quando a contagem de
 * caracteres não cabe na largura útil (coluna menos `gutterPx` de cada lado).
 */
export function corpoQueCabe(texto: string, maxPx: number, gutterPx = GUTTER + 18, ocupacao = 0.94): string {
  const chars = Math.max(texto.length, 1)
  const util = `(min(100vw, 480px) - ${gutterPx * 2}px)`
  return `min(calc(${maxPx}px * var(--type-factor, 1)), calc(${util} * ${ocupacao.toFixed(2)} / ${(chars * LARGURA_CAPS_GROOVY).toFixed(2)}))`
}

/** A primeira palavra do nome em caps — o wordmark groovy da referência ("OCHA"). */
export function palavraDaCasa(nome: string): string {
  return (nome.trim().split(/\s+/)[0] ?? nome).toUpperCase()
}

// ─────────────────────────────────────────────────────────────
// Véus — a legibilidade dos cartões-foto
// ─────────────────────────────────────────────────────────────

/**
 * O GRADIENTE_HERO da RN: perfil de DUAS bandas (0,32 no topo, ZERO no miolo,
 * 0,58 na base). Texto claro posto fora das duas bandas — o wordmark lá em
 * cima, o statement no terço inferior — nada sobre foto clara.
 */
export function GradienteHero() {
  return (
    <span
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 22%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.28) 76%, rgba(0,0,0,0.58) 100%)',
      }}
      aria-hidden
    />
  )
}

/**
 * O SCRIM_TOPO empilhado da RN: uma rampa única servindo o topo direto e a
 * base de cabeça para baixo. `alfa` é a densidade já composta das cópias
 * (1-(1-a)^n) — a ponta fraca continua em zero, então não há linha de corte.
 */
export function Veu({ lado, fracao, alfa = 0.7 }: { lado: 'topo' | 'base'; fracao: number; alfa?: number }) {
  const direcao = lado === 'topo' ? 'to bottom' : 'to top'
  return (
    <span
      className="pointer-events-none absolute inset-x-0"
      style={{
        ...(lado === 'topo' ? { top: 0 } : { bottom: 0 }),
        height: `${Math.round(fracao * 100)}%`,
        background: `linear-gradient(${direcao}, rgba(0,0,0,${alfa.toFixed(2)}) 0%, rgba(0,0,0,${(alfa * 0.55).toFixed(2)}) 42%, rgba(0,0,0,${(alfa * 0.18).toFixed(2)}) 76%, rgba(0,0,0,0) 100%)`,
      }}
      aria-hidden
    />
  )
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
  /** Tigela — a açaíteria em um traço, para a casa sem logo e para o vazio. */
  bowl: (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="M9 7c0-2 1.5-3 3-3s3 1 3 3" />
    </>
  ),
} as const

export type IconeRitual = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 17,
  cor = 'currentColor',
  espessura = 2.1,
  className,
}: {
  nome: IconeRitual
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
// Chrome — a pílula flutuante e seus dois discos
// ─────────────────────────────────────────────────────────────

/**
 * A ação da PONTA ESQUERDA da pílula: na RN é o chevron de "voltar"; no web a
 * loja é a raiz do host, então o slot vira a casa — logo em disco, ou a
 * inicial em groovy — linkando ao topo.
 */
export function CasaNaPill({ nome, logoUrl }: { nome: string; logoUrl: string | null }) {
  return (
    <a
      href="/"
      aria-label={`${nome} — início da loja`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-accent-ink transition-opacity hover:opacity-80 active:opacity-70"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="text-[19px] leading-none" style={GROOVY} aria-hidden>
          {nome.trim().charAt(0).toUpperCase() || '•'}
        </span>
      )}
    </a>
  )
}

/**
 * O disco da sacola: fundo `bg` (o rosa da página) com o ícone no accent e o
 * contador em disco accent orlado do mesmo rosa — a pílula em negativo.
 */
export function DiscoSacola({
  contador = 0,
  rotulo,
  aoTocar,
}: {
  contador?: number
  rotulo: string
  aoTocar: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={aoTocar}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full bg-canvas text-accent transition-opacity hover:opacity-90 active:opacity-80"
    >
      <IconeTraco nome="bag" tamanho={17} />
      {contador > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-[1.5px] border-canvas bg-accent px-1 font-body text-[9.5px] font-extrabold leading-none text-accent-ink"
          aria-hidden
        >
          {contador}
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Cartão — a forma única da página
// ─────────────────────────────────────────────────────────────

/**
 * Um cartão da família: gutter rosa dos dois lados, canto de 28 e `overflow:
 * hidden` (é ele que corta a palavra gigante e as fotos nas bordas).
 */
export function Cartao({
  children,
  className,
  style,
  id,
  rotulo,
  tag = 'section',
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  id?: string
  rotulo?: string
  tag?: 'section' | 'div' | 'footer' | 'header'
}) {
  const Tag = tag
  return (
    <Tag
      id={id}
      aria-label={rotulo}
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ marginLeft: GUTTER, marginRight: GUTTER, borderRadius: RAIO_CARTAO, ...style }}
    >
      {children}
    </Tag>
  )
}

// ─────────────────────────────────────────────────────────────
// Wordmark groovy — a assinatura da casa em Shrikhand
// ─────────────────────────────────────────────────────────────

/**
 * A primeira palavra do nome, em Shrikhand, na cor `bg` da pele (o rosa da
 * página sobre a foto). O halo não é sombra decorativa: é ele que descola o
 * pé do glifo da foto onde a rampa do véu já afinou.
 */
export function WordmarkGroovy({
  nome,
  maxPx,
  halo = 0.45,
  className,
  tag = 'span',
}: {
  nome: string
  maxPx: number
  halo?: number
  className?: string
  tag?: 'span' | 'h1' | 'p'
}) {
  const Tag = tag
  const palavra = palavraDaCasa(nome)
  return (
    <Tag
      className={`block max-w-full whitespace-nowrap text-center leading-[1.05] text-canvas ${className ?? ''}`}
      style={{
        ...GROOVY,
        fontSize: corpoQueCabe(palavra, maxPx),
        textShadow: `0 2px ${maxPx > 60 ? 12 : 8}px rgba(0,0,0,${halo})`,
      }}
    >
      {palavra}
    </Tag>
  )
}

// ─────────────────────────────────────────────────────────────
// Miniatura — o seletor de fotos do hero
// ─────────────────────────────────────────────────────────────

/** Quadradinho arredondado de 56; a ativa ganha anel branco e cresce 6%. */
export function Miniatura({
  src,
  ativa,
  indice,
  total,
  aoTocar,
}: {
  src: string
  ativa: boolean
  indice: number
  total: number
  aoTocar: () => void
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={`Foto ${indice + 1} de ${total}`}
      aria-pressed={ativa}
      className="block h-14 w-14 shrink-0 overflow-hidden rounded-2xl transition-transform duration-200 hover:opacity-90"
      style={{
        backgroundColor: 'rgba(0,0,0,0.2)',
        boxShadow: ativa ? `inset 0 0 0 2.5px ${ANEL_ATIVO}` : 'none',
        transform: ativa ? 'scale(1.06)' : 'scale(1)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Nome vizinho — o affordance do carrossel dos especiais
// ─────────────────────────────────────────────────────────────

/**
 * Nome do item vizinho: girado ±20° e sangrando pelo canto inferior, como na
 * referência. Desliza ~30px com o scroll via `--ritual-p` (progresso do
 * pager em páginas) e `--ritual-ativo`, escritos no cartão pelo `onScroll`.
 * 0,70 de alfa é o piso: abaixo disso o vizinho reprova AA sobre o accent da
 * paleta `pitaya` — e ele não é enfeite, é o affordance do carrossel.
 */
export function NomeVizinho({ nome, lado }: { nome: string; lado: 'esquerda' | 'direita' }) {
  return (
    <span
      className="ritual-vizinho pointer-events-none absolute bottom-[30px] block truncate font-display text-[16px] uppercase tracking-[0.4px]"
      style={
        {
          ...(lado === 'esquerda' ? { left: -22 } : { right: -22 }),
          maxWidth: larg(0.5),
          color: tokenComAlfa('--accent-ink', 0.7),
          '--rot': lado === 'esquerda' ? '-20deg' : '20deg',
        } as unknown as CSSProperties
      }
      aria-hidden
    >
      {nome}
    </span>
  )
}

/**
 * Estilos que dependem do progresso do pager (CSS vars escritas no DOM pelo
 * scroll, sem re-render): parallax das fotos e deslize dos vizinhos. Com
 * "reduzir movimento" só fica a rotação — como na RN.
 */
export function EstilosEspeciais() {
  return (
    <style>{`
      .ritual-parallax { transform: translateX(calc(14px * (var(--ritual-p, 0) - var(--i, 0)))); will-change: transform; }
      .ritual-vizinho { transform: translateX(calc(-30px * (var(--ritual-p, 0) - var(--ritual-ativo, 0)))) rotate(var(--rot, 0deg)); will-change: transform; }
      @keyframes ritual-fusao { from { opacity: 0; } to { opacity: 1; } }
      .ritual-fusao { animation: ritual-fusao 500ms cubic-bezier(0.4, 0, 0.2, 1) both; }
      @media (prefers-reduced-motion: reduce) {
        .ritual-parallax { transform: none; }
        .ritual-vizinho { transform: rotate(var(--rot, 0deg)); }
        .ritual-fusao { animation: none; }
      }
    `}</style>
  )
}
