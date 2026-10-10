import type { Config } from 'tailwindcss'

/**
 * Tokens traduzidos de apps/mobile-consumer/lib/consumer-design.ts (neutros
 * sincronizados em 2026-09-19: canvas #F1F1F3, canvasAlt #E7E7EA, line #E4E4E7).
 * Copiados e adaptados (não compartilhados): RN elevation/shadowOffset não
 * mapeia para web — convertido para CSS box-shadow. Storefront é uma superfície
 * isolada (D1/D5), com seu próprio bundle e tema.
 */

/**
 * Cor dirigida por StoreTheme que ACEITA o modificador de opacidade
 * (`bg-canvas/90`, `text-ink/60`). Com a var crua o Tailwind não tem canal
 * alfa onde injetar e DESCARTA a classe em silêncio — era o caso de
 * `bg-warning/20` no aviso de receita e de `bg-canvas/90` na régua de seções.
 * Sem modificador, a classe continua sendo a var pura.
 *
 * O tipo do Tailwind só declara `string`, mas o runtime aceita cor como
 * função (`{ opacityValue }`) — daí o cast.
 */
function tema(cssVar: string): string {
  const cor = ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined || opacityValue.startsWith('var(')
      ? cssVar
      : `color-mix(in srgb, ${cssVar} calc(${opacityValue} * 100%), transparent)`
  return cor as unknown as string
}

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Toda `var()` de fonte leva valor de reserva: se a classe do next/font
        // no <html> divergir do CSS (cache de build da Vercel, 2026-10-10), a
        // var some e uma `var()` sem reserva invalida a declaração inteira — a
        // página caía em Times New Roman em vez de só perder o Jakarta.
        sans: ['var(--font-jakarta, system-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono, monospace)', 'JetBrains Mono', 'monospace'],
        // Dirigidas por StoreTheme: fora da loja caem no Jakarta (:root).
        display: ['var(--font-display, system-ui)', 'var(--font-jakarta, system-ui)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body, system-ui)', 'var(--font-jakarta, system-ui)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Tokens dirigidos por StoreTheme: `var(--token, <fallback Mallevo>)`.
        // Sem tema injetado, o fallback reproduz exatamente a paleta Mallevo
        // (ver app/globals.css :root). Lojas com preset v2 sobrescrevem as vars
        // no wrapper StoreThemeRoot. Ver docs/store-theme/04 §4.3.
        canvas: tema('var(--bg, #F1F1F3)'),
        canvasAlt: tema('var(--surface-alt, #E7E7EA)'),
        surface: tema('var(--surface, #FFFFFF)'),
        surfaceMuted: tema('var(--surface-alt, #E7E7EA)'),
        // Texto
        ink: {
          DEFAULT: tema('var(--ink, #111216)'),
          muted: tema('var(--ink-muted, #5E6168)'),
          soft: '#8B8E94',
        },
        // Linhas
        line: {
          DEFAULT: tema('var(--line, #E4E4E7)'),
        },
        // Accent (CTA primário) + cor de texto legível sobre ele (accent-ink).
        accent: {
          DEFAULT: tema('var(--accent, #D8FF3E)'),
          strong: tema('var(--accent, #C8F22E)'),
          soft: 'var(--accent-soft, rgba(216, 255, 62, 0.18))',
          ink: tema('var(--accent-ink, #111216)'),
        },
        // Status
        warning: tema('var(--warning, #F2B84B)'),
        success: tema('var(--success, #8ED14F)'),
        danger: tema('var(--danger, #FF6D5E)'),
        info: '#5BB7FF',
      },
      borderRadius: {
        // Dirigidos por StoreTheme (shape.radius → escala completa em
        // RADIUS_STEPS_PX, @mallevo/lib). Fallback = consumer-design.radius
        // (paleta Mallevo, fora de loja / loja sem preset v2). Círculos usam
        // `rounded-full` e ficam fora do tema.
        sm: 'var(--radius-sm, 14px)',
        md: 'var(--radius-md, 20px)',
        lg: 'var(--radius-lg, 28px)',
        xl: 'var(--radius-xl, 34px)',
        pill: 'var(--radius-pill, 999px)',
      },
      spacing: {
        // Dirigidos por StoreTheme (shape.density → DENSITY_SPACE_PX).
        // Uso semântico: px-screen-x (gutter), py-card (linhas/cards),
        // mt-section (entre seções), p-sheet (modais).
        'screen-x': 'var(--space-screen-x, 24px)',
        card: 'var(--space-card, 16px)',
        section: 'var(--space-section, 16px)',
        sheet: 'var(--space-sheet, 20px)',
      },
      fontSize: {
        // Títulos (display) escalam com o arquétipo (typography.scale →
        // TYPE_SCALE_FACTOR): spacious amplia, compact condensa. Corpo não
        // escala (acessibilidade — docs/store-theme/05 §5.5).
        'display-lg': ['calc(26px * var(--type-factor, 1))', { lineHeight: '1.2' }],
        'display-md': ['calc(20px * var(--type-factor, 1))', { lineHeight: '1.25' }],
        'display-sm': ['calc(18px * var(--type-factor, 1))', { lineHeight: '1.3' }],
      },
      boxShadow: {
        // consumer-design.shadow (RN) → CSS box-shadow
        // offset {0,h} radius r opacity o, cor #000
        none: 'none',
        soft: '0 4px 12px rgba(0, 0, 0, 0.06)',
        medium: '0 8px 18px rgba(0, 0, 0, 0.10)',
        floating: '0 12px 24px rgba(0, 0, 0, 0.18)',
      },
      keyframes: {
        // Dica "Role" do hero de computador: o ponto desce dentro do mouse.
        'dica-rolar': {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '25%': { opacity: '1' },
          '75%': { transform: 'translateY(11px)', opacity: '0' },
          '100%': { transform: 'translateY(11px)', opacity: '0' },
        },
        surgir: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'entrar-direita': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'subir-suave': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'dica-rolar': 'dica-rolar 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        // Curva de ENTRADA do sistema (bezier 0.16,1,0.3,1).
        surgir: 'surgir 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'entrar-direita': 'entrar-direita 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'subir-suave': 'subir-suave 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}

export default config
