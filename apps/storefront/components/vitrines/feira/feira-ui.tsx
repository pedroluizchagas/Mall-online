import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine feira (arquétipo `fresh`) — port DOM/SVG de
 * apps/mobile-consumer/components/loja/feira-ui.tsx.
 *
 * A referência é um app de hortifruti: página clara, HERO-CARTÃO verde-mata
 * com colagem de frescos, CHIPS CIRCULARES de foto para as categorias,
 * OFERTAS com cronômetro e preço POR UNIDADE. A cor de ação (o lima do tema)
 * aparece só como FUNDO — nunca como tinta de texto.
 *
 * As cores da pele entram por classe Tailwind (`bg-accent`, `text-ink`…); as
 * constantes de DNA (verde-mata, creme) moram aqui, fixas.
 */

/**
 * Verde-mata do hero-cartão e do fecho. Fixo (e não `--accent`) porque a cor
 * de ação muda com a paleta e o verde é a âncora da feira nas três peles.
 * 11,47:1 com o creme abaixo. Também é a TINTA dos títulos e do preço sobre a
 * página clara: o lima só existe como fundo (reprova AA como texto).
 */
export const VERDE_MATA = '#22392B'

/** Tinta ÚNICA de tudo que é escrito sobre o verde-mata. */
export const CREME_FEIRA = '#F4F7EC'

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
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#111216'): string {
  return `color-mix(in srgb, var(${token}, ${fallbackHex}) ${Math.round(alpha * 100)}%, transparent)`
}

/** `03:32:29` — o relógio do chip de ofertas. Negativo vira zero. */
export function formatarContagem(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  'chevron-down': <path d="M5 9l7 7 7-7" />,
  /** Folha: o glifo da casa quando não há logo. */
  folha: (
    <>
      <path d="M5 19C5 11 10 5 19 5c0 9-6 14-14 14Z" />
      <path d="M5 19c3-4 6-7 10-10" />
    </>
  ),
} as const

export type IconeFeira = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 19,
  cor = 'currentColor',
  espessura = 1.9,
  className,
}: {
  nome: IconeFeira
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
 * Botão circular claro com fio e sombra — o chrome de TOPO desta vitrine (a
 * casa e a sacola). Sem FAB: a sacola daqui é a porta do carrinho. `children`
 * substitui o ícone (a logo da casa no lugar do "voltar", que não existe no
 * web — a loja é a raiz do host).
 */
export function BotaoFeira({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeFeira
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — o chip da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-full border bg-surface text-ink shadow-soft transition-opacity hover:opacity-80 active:opacity-70'
  const estilo: CSSProperties = { borderColor: tokenComAlfa('--ink', 0.1) }
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} /> : null)}
      {contador > 0 && (
        <span
          className="absolute -right-[3px] -top-[3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-surface bg-accent px-1 font-body text-[10px] font-bold leading-none text-accent-ink"
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
 * Selo de oferta no canto do card. Ocupa o lugar do coração de favorito da
 * referência: a loja não tem lista de desejos, e um coração que não guarda
 * nada mentiria para o cliente — aqui o canto carrega informação verdadeira.
 */
export function SeloOferta({ texto = 'Oferta', className }: { texto?: string; className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-flex rounded-full bg-accent px-[9px] py-1 font-body text-[10px] font-bold uppercase tracking-[0.8px] text-accent-ink ${className ?? ''}`}
    >
      {texto}
    </span>
  )
}

/**
 * Pill de contagem regressiva das ofertas — o relógio da referência. `null`
 * é o instante antes da hidratação: a pill já ocupa o lugar, com traços.
 */
export function ChipCronometro({ segundos, className }: { segundos: number | null; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-accent px-[11px] py-[5px] font-body text-[12px] font-bold tracking-[0.6px] text-accent-ink ${className ?? ''}`}
      // Algarismos de largura fixa: o `padStart` fixa a CONTAGEM de dígitos,
      // não a largura — sem isto a pill mudaria de largura a cada segundo.
      style={{ fontVariantNumeric: 'tabular-nums' }}
      role="timer"
      aria-live="off"
      suppressHydrationWarning
    >
      {segundos == null ? '--:--:--' : formatarContagem(segundos)}
    </span>
  )
}

/**
 * Chip circular de categoria — a assinatura da referência. Foto em disco com
 * o rótulo embaixo; sem foto, o disco leva a inicial da seção, e nunca fica
 * um buraco cinza na fileira. É um `<a href="#secao">`: rola até o corredor
 * e funciona sem JS.
 */
export function DiscoCategoria({
  src,
  rotulo,
  href,
  aoTocar,
}: {
  src: string | null
  rotulo: string
  href: string
  aoTocar: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={href}
      onClick={aoTocar}
      className="flex w-[78px] shrink-0 flex-col items-center transition-opacity hover:opacity-85 active:opacity-80"
    >
      <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surfaceMuted">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-[22px] font-bold text-ink">{rotulo.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="mt-2 line-clamp-2 text-center font-body text-[11.5px] font-semibold leading-[15px] text-ink">
        {rotulo}
      </span>
    </a>
  )
}

/**
 * Disco de foto da colagem do hero — a fruta "saindo" do cartão. `largura`
 * em fração do cartão (`'52%'`); o disco é sempre quadrado. `aro` desenha o
 * fio da cor do cartão que separa o disco menor do maior.
 *
 * `carregamento` como em Forno e Horta: a primeira foto da colagem é o LCP
 * da Feira e entra `eager` + `fetchPriority="high"` (A-09); as demais ficam
 * `lazy`.
 */
export function DiscoFoto({
  src,
  largura,
  aro,
  carregamento = 'lazy',
  className,
  style,
}: {
  src: string
  largura: string
  aro?: string
  carregamento?: 'lazy' | 'eager'
  className?: string
  style?: CSSProperties
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={carregamento}
      fetchPriority={carregamento === 'eager' ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={`block rounded-full object-cover ${className ?? ''}`}
      style={{
        width: largura,
        height: 'auto',
        aspectRatio: '1',
        boxShadow: aro ? `0 0 0 3px ${aro}` : undefined,
        ...style,
      }}
    />
  )
}
