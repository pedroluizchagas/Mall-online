import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine torra (arquétipo `roast`) — port DOM/CSS do
 * que em apps/mobile-consumer/components/loja/LojaTorra.tsx era inline.
 *
 * A referência (Kafoska) constrói tudo com quatro gestos: a PALAVRA da casa
 * repetida em escada de opacidade do accent, o produto FLUTUANDO por cima
 * (recorte solto ou cápsula), "MENU" em letras EMPILHADAS de pé e a MARCA
 * D'ÁGUA do título repetida ao fundo dos cartões âmbar. Não há fonte-DNA: a
 * voz é a `font-display` da pele (Archivo no preset roast).
 *
 * As cores da pele NÃO moram aqui — chegam por classe Tailwind (`text-accent`)
 * ou `var(--token)`. As poucas cores fixas (branco do título do cartão, véu da
 * marca d'água) são DNA da referência e vivem em quem chama.
 */

type Tamanho = number | string

/** rgba a partir de hex — para as constantes de DNA. */
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
 * em tempo de render. É o que deixa o "rgba(34, 21, 3, 0.78)" da RN valer
 * também nas paletas alternativas do roast (barro, hortelã, açaí).
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

/** Largura média das caixas-altas da Archivo 800 em em — para o "adjustsFontSizeToFit". */
const LARGURA_CAPS = 0.72

/**
 * O `adjustsFontSizeToFit` da RN em CSS: a linha nasce no corpo pedido
 * (`maxCss`, ex.: `calc(76px * var(--type-factor, 1))`) e só encolhe quando
 * a contagem de caracteres não cabe em `ocupacao` da largura da coluna.
 */
export function corpoQueCabe(texto: string, maxCss: string, ocupacao = 0.94): string {
  const chars = Math.max(texto.length, 1)
  return `min(${maxCss}, ${larg(ocupacao / (chars * LARGURA_CAPS))})`
}

// ── Movimento ─────────────────────────────────────────────────

/** Nome da classe que faz o cartão seguinte NASCER por cima do atual. */
export const CLASSE_ENTRA = 'torra-entra'
/** Fusão do crossfade (ms) — o ritmo do café coando. */
export const DURACAO_FUSAO = 700
/** Permanência de cada cartão em cena (ms). */
export const PERMANENCIA = 4500

/**
 * Os keyframes do crossfade, injetados pela vitrine. `both` segura o cartão
 * em opacity 1 depois da fusão até o commit em estado; sob "reduzir
 * movimento" a animação some e o cartão só troca (estático).
 */
export function EstilosTorra() {
  return (
    <style>{`
@keyframes torra-fade-in { from { opacity: 0 } to { opacity: 1 } }
.${CLASSE_ENTRA} { animation: torra-fade-in ${DURACAO_FUSAO}ms cubic-bezier(0.4, 0, 0.2, 1) both; }
@media (prefers-reduced-motion: reduce) { .${CLASSE_ENTRA} { animation: none; } }
`}</style>
  )
}

// ── Ícones ────────────────────────────────────────────────────

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  'chevron-down': <path d="M5 9l7 7 7-7" />,
} as const

export type IconeTorra = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 22,
  cor = 'currentColor',
  espessura = 2,
  className,
}: {
  nome: IconeTorra
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
 * Grão de café — o glifo da casa quando ela não tem logo (chip do header,
 * estado vazio). Oval com o sulco central, chapado.
 */
export function Grao({
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
      <g transform="rotate(-32 50 50)">
        <ellipse cx="50" cy="50" rx="27" ry="40" fill={cor} />
        <path
          d="M50 12 C 38 30, 62 44, 50 60 C 40 74, 56 82, 50 88"
          fill="none"
          stroke="var(--bg, #1C2617)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

// ── Chrome ────────────────────────────────────────────────────

/**
 * Ação do topo: ícone na tinta da pele, sem caixa (a referência é um header
 * "nu" que ganha fundo ao rolar). `children` substitui o ícone (a logo da
 * casa no lugar do "voltar", que não existe no web). Contador âmbar no canto.
 */
export function AcaoTorra({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeTorra
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — o chip da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-opacity hover:opacity-80 active:opacity-70'
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} /> : null)}
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

// ── Pôster ────────────────────────────────────────────────────

/**
 * Escada do pôster: a palavra repetida do suave ao accent cheio. Derivada do
 * ACCENT da paleta por opacidade (não de um âmbar fixo) — assim serve
 * qualquer pele do arquétipo: âmbar no café, orquídea no açaí, terracota no
 * barro.
 */
export const ESCADA_POSTER = [0.5, 0.66, 0.82, 1] as const

export function PalavraEmEscada({ palavra, className }: { palavra: string; className?: string }) {
  const corpo = corpoQueCabe(palavra, 'calc(76px * var(--type-factor, 1))')
  return (
    <div className={`flex w-full flex-col items-center overflow-hidden ${className ?? ''}`} aria-hidden>
      {ESCADA_POSTER.map((grau, i) => (
        <span
          key={i}
          className="block max-w-full whitespace-nowrap text-center font-display font-extrabold uppercase leading-[0.95] tracking-[2px] text-accent"
          style={{ fontSize: corpo, opacity: grau }}
        >
          {palavra}
        </span>
      ))}
    </div>
  )
}

/**
 * O produto em cena sobre a palavra. `recorte` (PNG de fundo transparente do
 * lojista) é o efeito verdadeiro do pôster: o objeto solto, `contain`, sem
 * máscara. Sem recorte, a foto ganha MÁSCARA DE CÁPSULA — arco no topo e na
 * base, silhueta de copo — e lê como objeto, não como retângulo.
 *
 * Preenche o pai (`absolute inset-0`): quem empilha as cenas do crossfade é
 * a vitrine.
 */
export function CenaDoPoster({
  src,
  recorte,
  carregamento = 'lazy',
  className,
}: {
  src: string
  recorte: boolean
  /** A cena EM CARTAZ é o LCP da Torra (A-09); as pré-carregadas ficam lazy. */
  carregamento?: 'lazy' | 'eager'
  className?: string
}) {
  const prioridade = carregamento === 'eager' ? 'high' : undefined
  if (recorte) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        draggable={false}
        loading={carregamento}
        fetchPriority={prioridade}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-contain ${className ?? ''}`}
      />
    )
  }
  return (
    <span
      className={`absolute inset-0 block overflow-hidden rounded-[999px] bg-surfaceMuted shadow-floating ${className ?? ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        loading={carregamento}
        fetchPriority={prioridade}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </span>
  )
}

/** Marcadores do pôster: traço para o cartão em cena, ponto para os demais. */
export function Marcadores({
  total,
  ativo,
  rotuloDe,
  aoEscolher,
}: {
  total: number
  ativo: number
  rotuloDe: (i: number) => string
  aoEscolher: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Produto em cena">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === ativo}
          aria-label={rotuloDe(i)}
          onClick={() => aoEscolher(i)}
          className={`h-1.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none ${
            i === ativo ? 'w-[18px] bg-accent' : 'w-1.5 bg-line'
          }`}
        />
      ))}
    </div>
  )
}

// ── Cardápio ──────────────────────────────────────────────────

/**
 * "MENU" em letras EMPILHADAS de pé — o rail que acompanha a coluna de
 * cartões na referência. Letras em coluna (não `writing-mode`): cada glifo
 * fica de pé e legível, como na RN.
 */
export function LetrasEmpilhadas({ palavra, className }: { palavra: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className ?? ''}`} aria-hidden>
      {palavra.split('').map((letra, i) => (
        <span
          key={i}
          className="block font-display text-[56px] font-extrabold uppercase leading-[54px] text-accent"
        >
          {letra}
        </span>
      ))}
    </div>
  )
}

/**
 * A marca d'água do cartão âmbar: o título repetido em nove linhas, alternando
 * o recuo, num véu branco. Cobre o cartão inteiro e é cortada pelas bordas.
 */
export function MarcaDagua({ texto, cor, linhas = 9 }: { texto: string; cor: string; linhas?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-1 bottom-0 overflow-hidden" aria-hidden>
      {Array.from({ length: linhas }).map((_, i) => (
        <span
          key={i}
          className="block whitespace-nowrap font-display text-[42px] font-extrabold uppercase leading-[47px] tracking-[1px]"
          style={{ color: cor, paddingLeft: i % 2 === 0 ? 16 : 52 }}
        >
          {texto}
        </span>
      ))}
    </div>
  )
}
