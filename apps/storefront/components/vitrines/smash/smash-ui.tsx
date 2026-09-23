import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine smash (arquétipo `smash`) — port DOM/CSS do
 * apoio de apps/mobile-consumer/components/loja/LojaSmash.tsx.
 *
 * A referência (Stack N Snack) fala com poucos gestos, repetidos com fome:
 * PILLS por toda parte (contorno laranja, sólida laranja, bordô), MOLDURAS
 * COLORIDAS grossas ao redor das fotos, o OURO do chip ativo / do selo
 * "ECONOMIZE" / da faixa marquee, e os DOTS laranja do pager.
 *
 * Cores de DNA moram aqui (creme, ouro, molduras); as cores da PELE
 * (bordô/laranja) entram por `var(--token)` — as paletas `mostarda` e
 * `pimenta` repintam a vitrine sem código novo.
 */

// ── DNA fixo da vitrine (independe da paleta; a paleta muda bordô/accent) ──
/** Folha creme do cardápio — o "papel de bandeja" da lanchonete. */
export const CREME = '#FAF3E4'
/** Cartão de item sobre o creme. */
export const CARTAO = '#FFFFFF'
/** Fio dos cartões sobre o creme. */
export const FIO_CREME = '#EFE5D2'
/** Chip de categoria em repouso. */
export const CHIP = '#EFE4CC'
/** Ouro do chip ativo, do selo de economia e da faixa marquee. */
export const OURO = '#F5C445'
/** Texto de apoio sobre o creme (AA sobre #FAF3E4). */
export const TINTA_APOIO = '#6F6354'
/** Preço "de" riscado sobre o cartão branco. */
export const TINTA_RISCADA = '#B9AC97'
/** Rosa e céu das molduras do hero (a 1ª moldura usa o accent da paleta). */
export const MOLDURA_ROSA = '#F2A9C4'
export const MOLDURA_CEU = '#8FD3EE'

/** As três molduras, na ordem da referência: laranja (accent), rosa, céu. */
export const MOLDURAS = ['var(--accent, #EF6A1F)', MOLDURA_ROSA, MOLDURA_CEU] as const

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
 * Alfa sobre um token da pele (`--ink`, `--accent-ink`…), que só existe como
 * CSS var: `color-mix` faz o papel do `comAlfa` quando o hex não é conhecido
 * em tempo de render. Fallback hex para motores sem `color-mix`.
 */
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#FFF6E8'): string {
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
 * O `adjustsFontSizeToFit` + `numberOfLines={1}` da RN em CSS: a linha nasce
 * no corpo pedido (já com `--type-factor`) e só encolhe quando a contagem de
 * caracteres não cabe na largura útil da coluna (`ocupacao` da coluna menos
 * o gutter dos dois lados, em px).
 */
export function corpoQueCabe(texto: string, maxPx: number, gutterPx = 24, ocupacao = 0.96): string {
  const chars = Math.max(texto.length, 1)
  const util = `(min(100vw, 480px) - ${gutterPx * 2}px)`
  return `min(calc(${maxPx}px * var(--type-factor, 1)), calc(${util} * ${ocupacao.toFixed(2)} / ${(chars * LARGURA_CAPS).toFixed(2)}))`
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
  spark: (
    <>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M12 8.5 13.6 12 12 15.5 10.4 12 12 8.5Z" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  chef: (
    <>
      <path d="M7 10a3 3 0 0 1 1-5.8A4 4 0 0 1 16 4.2 3 3 0 0 1 17 10v6H7v-6Z" />
      <path d="M7 19h10" />
      <path d="M10 13v3" />
      <path d="M14 13v3" />
    </>
  ),
} as const

export type IconeSmash = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 19,
  cor = 'currentColor',
  espessura = 2.1,
  className,
}: {
  nome: IconeSmash
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
// Chrome — ação do topo e wordmark
// ─────────────────────────────────────────────────────────────

/**
 * Ação do topo: ícone creme num quadrado arredondado de contorno fino. O
 * contorno é `--ink` a 45% — legível tanto sobre o bordô nu do hero quanto
 * sobre a pílula bordô que aparece no scroll. `children` substitui o ícone
 * (a logo da casa no lugar do "voltar", que não existe no web).
 */
export function AcaoSmash({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeSmash
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — o chip da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-[14px] border-[1.5px] text-ink transition-opacity hover:opacity-80 active:opacity-70'
  const estilo: CSSProperties = { borderColor: tokenComAlfa('--ink', 0.45) }
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} /> : null)}
      {contador > 0 && (
        <span
          className="absolute -right-[6px] -top-[6px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-extrabold leading-none text-accent-ink"
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
 * A assinatura do header da referência: "STACK (N) SNACK" — a palavra-elo
 * curta vive num disco no accent. Nomes sem elo curto ficam só nas caps.
 */
export function WordmarkSmash({ nome, tamanho, className }: { nome: string; tamanho: number; className?: string }) {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  const discoIdx = palavras.findIndex((p, i) => i > 0 && p.length <= 2)
  const disco = Math.round(tamanho * 1.45)

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center font-display font-extrabold uppercase ${className ?? ''}`}
      style={{ gap: Math.round(tamanho * 0.3) }}
    >
      {palavras.map((palavra, i) =>
        i === discoIdx ? (
          <span
            key={`${palavra}-${i}`}
            className="flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink"
            style={{ width: disco, height: disco, fontSize: Math.round(tamanho * 0.62), lineHeight: 1 }}
          >
            {palavra}
          </span>
        ) : (
          <span
            key={`${palavra}-${i}`}
            className="truncate text-ink"
            style={{ fontSize: tamanho, letterSpacing: 0.6, lineHeight: 1.15 }}
          >
            {palavra}
          </span>
        ),
      )}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Pills — o gesto que a referência mais repete
// ─────────────────────────────────────────────────────────────

/**
 * Pill de contorno laranja: a pill de entrega do hero (com faísca) e a que
 * abre cada seção da folha creme ("Cardápio", "Ofertas").
 */
export function PillContorno({
  children,
  icone,
  className,
}: {
  children: ReactNode
  icone?: IconeSmash
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] rounded-full border-[1.5px] border-accent px-[14px] font-body font-bold text-accent ${className ?? 'py-[6px] text-[13px]'}`}
    >
      {icone && <IconeTraco nome={icone} tamanho={14} espessura={2.1} />}
      {children}
    </span>
  )
}

/**
 * Botão-pill do hero: `solido` é o laranja cheio com tinta bordô; o fantasma
 * é o contorno creme (`--ink` a 85%). Ambos em caps display 800, o CTA da
 * referência.
 */
export function BotaoPill({
  children,
  solido = false,
  href,
  aoTocar,
  className,
}: {
  children: ReactNode
  solido?: boolean
  href?: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  className?: string
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-[14px] font-display text-[13px] font-extrabold uppercase tracking-[0.8px] transition-opacity active:opacity-80'
  const cor = solido
    ? 'bg-accent text-accent-ink hover:opacity-90'
    : 'border-[1.5px] text-ink hover:opacity-85'
  const estilo: CSSProperties | undefined = solido ? undefined : { borderColor: tokenComAlfa('--ink', 0.85) }
  const classe = `${base} ${cor} ${className ?? ''}`
  if (href) {
    return (
      <a href={href} className={classe} style={estilo} onClick={aoTocar}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={classe} style={estilo} onClick={aoTocar}>
      {children}
    </button>
  )
}

/**
 * CTA bordô que fecha cada cartão ("PEDIR AGORA", "PEGAR OFERTA"). É um
 * `<span>`: o cartão inteiro já é o botão, e o web não aceita botão dentro
 * de botão.
 */
export function CtaCartao({ children }: { children: ReactNode }) {
  return (
    <span className="mt-[14px] flex w-full items-center justify-center rounded-full bg-canvas py-[15px] font-display text-[13px] font-extrabold uppercase tracking-[1px] text-ink">
      {children}
    </span>
  )
}

/** Chip de categoria: ouro quando ativo, creme-escuro em repouso; caps bordô. */
export function ChipCategoria({
  children,
  ativo,
  aoTocar,
  controla,
}: {
  children: ReactNode
  ativo: boolean
  aoTocar: () => void
  /** id do painel que o chip controla (`aria-controls`). */
  controla?: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativo}
      aria-controls={controla}
      onClick={aoTocar}
      className="rounded-full px-4 py-[9px] font-display text-[12px] font-extrabold uppercase tracking-[0.6px] text-canvas transition-colors hover:opacity-90"
      style={{ backgroundColor: ativo ? OURO : CHIP }}
    >
      {children}
    </button>
  )
}

/** Selo "ECONOMIZE R$X" em ouro sobre o card laranja do combo. */
export function SeloEconomize({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex self-start rounded-full px-3 py-[6px] font-display text-[11.5px] font-extrabold uppercase tracking-[0.5px] text-canvas"
      style={{ backgroundColor: OURO }}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Molduras coloridas — a foto do destaque emoldurada em 5px de cor
// ─────────────────────────────────────────────────────────────

/**
 * Moldura grossa e colorida ao redor da foto — a fileira do hero. `indice`
 * escolhe a cor na ordem laranja → rosa → céu, como na referência.
 */
export function MolduraFoto({
  src,
  alt = '',
  indice,
  aoTocar,
  rotulo,
  className,
  style,
}: {
  src: string
  alt?: string
  indice: number
  aoTocar: () => void
  rotulo: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={rotulo}
      className={`block shrink-0 snap-center overflow-hidden rounded-[28px] border-[5px] bg-surface transition-opacity active:opacity-90 ${className ?? ''}`}
      style={{ borderColor: MOLDURAS[indice % MOLDURAS.length], ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading={indice > 1 ? 'lazy' : 'eager'}
        fetchPriority={indice === 0 ? 'high' : undefined}
      />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Pager — dots laranja
// ─────────────────────────────────────────────────────────────

/** Dots do pager — laranja cheio no ativo, laranja fantasma no resto. */
export function Dots({
  total,
  ativo,
  irPara,
  className,
}: {
  total: number
  ativo: number
  /** Com ele, cada dot é um botão que leva à página. */
  irPara?: (i: number) => void
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center gap-[7px] ${className ?? 'mt-4'}`} role={irPara ? 'tablist' : undefined}>
      {Array.from({ length: total }).map((_, i) =>
        irPara ? (
          <button
            key={i}
            type="button"
            aria-label={`Ir para o item ${i + 1} de ${total}`}
            aria-current={i === ativo}
            onClick={() => irPara(i)}
            className="flex h-6 w-4 items-center justify-center"
          >
            <span
              className="block h-2 w-2 rounded-full bg-accent transition-opacity"
              style={{ opacity: i === ativo ? 1 : 0.28 }}
            />
          </button>
        ) : (
          <span
            key={i}
            className="block h-2 w-2 rounded-full bg-accent transition-opacity"
            style={{ opacity: i === ativo ? 1 : 0.28 }}
            aria-hidden
          />
        ),
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Faixa marquee dourada — as categorias rolando em loop
// ─────────────────────────────────────────────────────────────

/** Largura estimada de uma palavra em caps 13px/1.4 + o "•" com margens (px). */
function larguraEstimada(palavra: string): number {
  return palavra.length * 10.5 + 13 + 32
}

/**
 * Faixa dourada com as categorias da casa em loop contínuo. Só CSS: o trilho
 * tem DUAS cópias idênticas de um bloco e anda a largura de uma (-50%) — o
 * salto é invisível. O bloco repete as palavras até passar folgado da
 * coluna (480px), para nunca aparecer buraco no fim.
 *
 * ~38 px/s (ritmo de lanchonete), estimado pela contagem de caracteres. Com
 * "reduzir movimento" a faixa fica ESTÁTICA, como na RN.
 */
export function MarqueeSmash({ palavras }: { palavras: string[] }) {
  const limpas = palavras.map((p) => p.trim()).filter(Boolean)
  if (limpas.length === 0) return null

  // Repete até o bloco ter ~1000px estimados: ≥ 2× a coluna mais larga.
  const bloco: string[] = []
  let largura = 0
  while (largura < 1000 || bloco.length < limpas.length) {
    for (const p of limpas) {
      bloco.push(p)
      largura += larguraEstimada(p)
    }
  }
  const duracao = Math.max(8, Math.round(largura / 38))

  const Copia = ({ oculta }: { oculta?: boolean }) => (
    <span className="flex shrink-0 items-center" aria-hidden={oculta || undefined}>
      {bloco.map((palavra, i) => (
        <span key={`${palavra}-${i}`} className="flex items-center">
          <span className="font-display text-[13px] font-extrabold uppercase tracking-[1.4px] text-canvas">
            {palavra}
          </span>
          <span className="mx-4 text-[13px] text-canvas" style={{ opacity: 0.55 }}>
            •
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      className="overflow-hidden py-[11px]"
      style={{ backgroundColor: OURO }}
      role="marquee"
      aria-label={`Categorias: ${limpas.join(', ')}`}
    >
      <style>{`
        @keyframes smash-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .smash-marquee-trilho { animation: smash-marquee ${duracao}s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .smash-marquee-trilho { animation: none; } }
      `}</style>
      <div className="smash-marquee-trilho flex w-max">
        <Copia />
        <Copia oculta />
      </div>
    </div>
  )
}
