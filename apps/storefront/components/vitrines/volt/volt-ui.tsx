import { type CSSProperties, type MouseEvent, type ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine volt (arquétipo `volt`) — port DOM/CSS do
 * apoio de apps/mobile-consumer/components/loja/LojaVolt.tsx.
 *
 * A referência (Nivest) fala em poucos gestos, todos de performance: a
 * FAIXA-ANÚNCIO preta de caps miúdas, o WORDMARK pesado no header branco,
 * o TICKER no accent (lima) com benefícios rolando sem parar, a PILL BRANCA
 * sólida do hero, os CHIPS "Popular" (preto) / "-N%" (vermelho) sobre o
 * palco cinza dos produtos e os dots-cápsula do carrossel.
 *
 * Toda cor entra por token da pele (`bg-ink`, `bg-accent`, `bg-canvasAlt`,
 * `text-danger`): as paletas do volt repintam a vitrine sem código novo. Só o
 * branco do hero é fixo — texto e pill sobre foto/véu escuro.
 */

/** Véu do hero: duas bandas (topo p/ o chrome, base p/ o texto), como o PNG da RN. */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.74) 100%)'

/** Glide do hero: 300ms com aterrissagem firme — o mais RÁPIDO do sistema. */
export const GLIDE_MS = 300
export const CURVA_GLIDE = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** Dwell por cena. */
export const DWELL_MS = 3800

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
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
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
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.3 2.3L15.5 9.6" />
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
  bolt: <path d="M13 3 5 13.5h6L10 21l9-11h-6l1-7Z" />,
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
} as const

export type IconeVolt = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 20,
  cor = 'currentColor',
  espessura = 2.2,
  className,
}: {
  nome: IconeVolt
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
// Chrome — faixa-anúncio, ação do header, wordmark
// ─────────────────────────────────────────────────────────────

/** Faixa-anúncio preta de caps miúdas espaçadas — a mensagem de oferta. */
export function FaixaAnuncio({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-center justify-center bg-ink px-screen-x py-[7px] text-center font-body text-[10px] font-semibold uppercase leading-[13px] tracking-[1.4px] text-white">
      <span className="truncate">{children}</span>
    </p>
  )
}

/**
 * Ação do header claro: ícone ink num quadrado de 40px, badge no accent.
 * `children` substitui o ícone (a logo da casa no lugar do "voltar", que não
 * existe no web); `href` vira `<a>`.
 */
export function AcaoVolt({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeVolt
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-opacity hover:opacity-75 active:opacity-60'
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} tamanho={22} /> : null)}
      {contador > 0 && (
        <span
          className="absolute right-0 top-[2px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-extrabold leading-none text-accent-ink"
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

/** Wordmark pesado: Archivo 800, tracking negativo, uma linha. */
export function WordmarkVolt({
  nome,
  tamanho,
  className,
  style,
}: {
  nome: string
  tamanho: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={`block min-w-0 max-w-full truncate font-display font-extrabold ${className ?? 'text-ink'}`}
      style={{ fontSize: tamanho, letterSpacing: -tamanho * 0.016, lineHeight: 1.15, ...style }}
    >
      {nome}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Ticker marquee — benefícios rolando em loop no accent
// ─────────────────────────────────────────────────────────────

export interface BeneficioVolt {
  icone: IconeVolt
  rotulo: string
}

/** Largura estimada de um item (ícone 14 + gap 7 + caps 11px/1px tracking + margem 28). */
function larguraEstimada(b: BeneficioVolt): number {
  return 14 + 7 + b.rotulo.length * 8.4 + 28
}

/**
 * Faixa no accent com os benefícios em loop contínuo. Só CSS: o trilho tem
 * DUAS cópias idênticas de um bloco e anda a largura de uma (-50%) — o salto
 * é invisível. O bloco repete os itens até passar folgado da coluna (480px),
 * para nunca aparecer buraco no fim.
 *
 * ~45 px/s (ritmo de performance), estimado pela contagem de caracteres. Com
 * "reduzir movimento" a faixa fica ESTÁTICA, como na RN.
 */
export function TickerVolt({ beneficios }: { beneficios: BeneficioVolt[] }) {
  const limpos = beneficios.filter((b) => b.rotulo.trim().length > 0)
  if (limpos.length === 0) return null

  const bloco: BeneficioVolt[] = []
  let largura = 0
  while (largura < 1000 || bloco.length < limpos.length) {
    for (const b of limpos) {
      bloco.push(b)
      largura += larguraEstimada(b)
    }
  }
  const duracao = Math.max(8, Math.round(largura / 45))

  const Copia = ({ oculta }: { oculta?: boolean }) => (
    <span className="flex shrink-0 items-center" aria-hidden={oculta || undefined}>
      {bloco.map((b, i) => (
        <span key={`${b.rotulo}-${i}`} className="mr-7 flex items-center gap-[7px] text-accent-ink">
          <IconeTraco nome={b.icone} tamanho={14} espessura={2.2} />
          <span className="font-body text-[11px] font-bold uppercase leading-none tracking-[1px]">{b.rotulo}</span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      className="overflow-hidden bg-accent py-[9px]"
      role="marquee"
      aria-label={`Benefícios: ${limpos.map((b) => b.rotulo).join(', ')}`}
    >
      <style>{`
        @keyframes volt-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .volt-ticker-trilho { animation: volt-ticker ${duracao}s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .volt-ticker-trilho { animation: none; } }
      `}</style>
      <div className="volt-ticker-trilho flex w-max">
        <Copia />
        <Copia oculta />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — pill branca sólida e dots-cápsula
// ─────────────────────────────────────────────────────────────

/** Pill branca sólida — o "Shop All" da referência. */
export function PillBranca({
  children,
  aoTocar,
  className,
  tabIndex,
}: {
  children: ReactNode
  aoTocar: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
  tabIndex?: number
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      tabIndex={tabIndex}
      className={`inline-flex items-center justify-center rounded-full bg-white px-[22px] py-[11px] font-body text-[14px] font-semibold leading-[18px] text-ink transition-opacity hover:opacity-90 active:opacity-80 ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Dots-cápsula do hero: o ativo vira uma barra de 20px no accent. */
export function DotsVolt({
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
    <div className="flex items-center gap-[6px]" role="tablist" aria-label="Cenas do destaque">
      {Array.from({ length: total }).map((_, i) => {
        const emFoco = i === ativo
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={emFoco}
            aria-label={rotulos[i] ?? `Cena ${i + 1} de ${total}`}
            onClick={() => irPara(i)}
            className="flex h-6 items-center"
          >
            <span
              className={`block h-[7px] rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
                emFoco ? 'w-5 bg-accent' : 'w-[7px] bg-white/55'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Card — chip Popular/desconto sobre o palco cinza
// ─────────────────────────────────────────────────────────────

/** Chip do card: desconto em vermelho manda sobre "Popular" em preto. */
export function ChipCard({ desconto, popular }: { desconto: number; popular: boolean }) {
  if (desconto <= 0 && !popular) return null
  const promo = desconto > 0
  return (
    <span
      className={`absolute left-[10px] top-[10px] rounded-full px-[10px] py-[5px] font-body text-[11px] font-semibold leading-none text-white ${
        promo ? 'bg-danger' : 'bg-ink'
      }`}
    >
      {promo ? `-${desconto}%` : 'Popular'}
    </span>
  )
}

/** Link de seção com o prefixo "↳" da referência. */
export function LinkSeta({
  children,
  aoTocar,
  expandido,
  controla,
}: {
  children: ReactNode
  aoTocar: () => void
  expandido?: boolean
  controla?: string
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-expanded={expandido}
      aria-controls={controla}
      className="self-start py-1 pr-3 font-body text-[14px] font-medium text-ink-muted transition-colors hover:text-ink"
    >
      <span aria-hidden>↳ </span>
      {children}
    </button>
  )
}
