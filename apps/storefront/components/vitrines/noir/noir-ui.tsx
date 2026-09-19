import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Vocabulário gráfico da vitrine noir (arquétipo `noir`, fine dining) — port
 * DOM/CSS dos gestos de apps/mobile-consumer/components/loja/LojaNoir.tsx.
 *
 * A referência (The Obscura) fala baixo: preto profundo, MARFIM e o dourado do
 * tema; serifa de alto contraste (Cormorant) com os ITÁLICOS verdadeiros como
 * assinatura; caps espaçadas em corpo mínimo; fios finos; setas circuladas de
 * traço fino. Nada é chapado além do preto — o que brilha é a foto.
 *
 * As cores da pele (`--accent`, `--ink-muted`, `--line`) continuam vindo do
 * tema; só o MARFIM é DNA fixo do layout, porque é a tinta de tudo que se
 * escreve sobre a foto e sobre o preto, nas três paletas (ouro, prata, rubi).
 */

/** Marfim da referência: a tinta sobre a foto e sobre o preto. */
export const MARFIM = 'rgba(248, 244, 236, 0.97)'
export const MARFIM_HEX = '#F8F4EC'

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
 * Alfa sobre um token da pele (`--accent`, `--ink`…), que só existe como CSS
 * var: `color-mix` faz o papel do `comAlfa` quando o hex não é conhecido em
 * tempo de render. Fallback hex para motores sem `color-mix`.
 */
export function tokenComAlfa(token: string, alpha: number, fallbackHex = '#C9A24B'): string {
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
 * A serifa do tema em ITÁLICO verdadeiro — o `fontStyleItalico` da RN. A pele
 * carrega só os pesos romanos do Cormorant; os itálicos entram pela
 * `FonteItalicaNoir` abaixo. Se a pele trocar a display, o navegador sintetiza
 * a inclinação — muda a voz, nunca o layout.
 */
export const ITALICO: CSSProperties = {
  fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif',
  fontStyle: 'italic',
}

/** A display do tema em romano — atalho para `style` quando a classe não basta. */
export const SERIFA: CSSProperties = {
  fontFamily: 'var(--font-display), "Cormorant Garamond", Georgia, serif',
}

/**
 * Véu do hero: a foto escurece em direção ao pé, onde vive o texto — o
 * GRADIENTE_HERO da RN em CSS puro.
 */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.02) 28%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.92) 100%)'

/**
 * Itálicos verdadeiros do Cormorant Garamond (500 e 600): são DNA desta
 * vitrine, não token do tema — o `FONTES_ITALICO` de lib/store-fonts.ts no web.
 */
export function FonteItalicaNoir() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&display=swap"
      />
    </>
  )
}

/**
 * Keyframes da vitrine: a foto do hero RESPIRA (o parallax de 10% da RN vira
 * um zoom lento) enquanto o slide está em cena. Sob "reduzir movimento" nada
 * se mexe — a cortina fica parada no primeiro slide.
 */
export function EstilosNoir() {
  return (
    <style>{`
      @keyframes noir-respirar {
        from { transform: scale(1); }
        to { transform: scale(1.07); }
      }
      .noir-respirar {
        animation: noir-respirar 7.4s cubic-bezier(0.4, 0, 0.2, 1) both;
      }
      /* A cena que acabou de sair fica no ponto final enquanto a cortina fecha. */
      .noir-respirado { transform: scale(1.07); }
      @media (prefers-reduced-motion: reduce) {
        .noir-respirar { animation: none; }
        .noir-respirado { transform: none; }
      }
    `}</style>
  )
}

/** Sobrelinha em caps espaçadas — a voz pequena da referência. */
export function Eyebrow({
  children,
  className = '',
  style,
  as: Tag = 'p',
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  as?: 'p' | 'h2' | 'span'
}) {
  return (
    <Tag className={`font-body text-[11px] font-medium uppercase tracking-[3px] ${className}`} style={style}>
      {children}
    </Tag>
  )
}

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
} as const

export type IconeNoir = keyof typeof ICONES

/** Ícone de traço FINO, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 22,
  cor = 'currentColor',
  espessura = 1.8,
  className,
}: {
  nome: IconeNoir
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
 * Ação do topo: ícone marfim SEM fundo — legível sobre a foto e sobre o
 * preto sem trocar de estado. Contador em dourado (a única cor viva do chrome).
 * `children` substitui o ícone (a logo da casa no lugar do "voltar").
 */
export function AcaoNoir({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeNoir
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
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} cor={MARFIM} /> : null)}
      {contador > 0 && (
        <span
          className="absolute right-0 top-[3px] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 font-body text-[10px] font-bold leading-none text-accent-ink"
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
 * Seta circulada de traço fino sobre o carrossel — fio marfim, véu preto
 * atrás para valer sobre qualquer foto. Apagada no fim do trilho.
 */
export function SetaCircular({
  lado,
  ativa,
  aoTocar,
}: {
  lado: 'esquerda' | 'direita'
  ativa: boolean
  aoTocar: () => void
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={!ativa}
      aria-label={lado === 'esquerda' ? 'Prato anterior' : 'Próximo prato'}
      className={`absolute top-1/2 z-[2] flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-full border transition-opacity ${
        lado === 'esquerda' ? 'left-[14px]' : 'right-[14px]'
      }`}
      style={{
        borderColor: comAlfa(MARFIM_HEX, ativa ? 0.75 : 0.25),
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        color: comAlfa(MARFIM_HEX, ativa ? 0.97 : 0.3),
      }}
    >
      <IconeTraco nome={lado === 'esquerda' ? 'arrow-left' : 'arrow-right'} tamanho={18} espessura={1.4} />
    </button>
  )
}

/**
 * Indicadores do hero: LINHAS, não pontos — a ativa alonga em dourado, as
 * demais são fios marfim apagados. Botões: quem prefere menos movimento troca
 * de slide por aqui.
 */
export function LinhasDoHero({
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
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Cenas do hero">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === ativo}
          aria-label={`${i + 1} de ${total}: ${rotulos[i] ?? ''}`}
          onClick={() => irPara(i)}
          className="flex h-4 items-center transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: i === ativo ? 20 : 8 }}
        >
          <span
            className="block h-[2px] w-full"
            style={{ backgroundColor: i === ativo ? 'var(--accent, #C9A24B)' : 'rgba(255,255,255,0.4)' }}
          />
        </button>
      ))}
    </div>
  )
}

