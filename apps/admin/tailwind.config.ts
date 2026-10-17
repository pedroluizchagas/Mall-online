import type { Config } from 'tailwindcss'

/**
 * Cor de token que ACEITA o modificador de opacidade (`bg-ink/5`,
 * `ring-ink/10`). Com a var crua o Tailwind não tem canal alfa onde injetar
 * e DESCARTA a classe em silêncio; com modificador vira `color-mix`. Sem
 * modificador, a classe continua sendo a var pura (mesmo helper do painel
 * web e do storefront).
 *
 * O tipo do Tailwind só declara `string`, mas o runtime aceita cor como
 * função (`{ opacityValue }`) — daí o cast.
 */
function tema(cssVar: string): string {
  // Os degradês (`from-*`/`via-*`) chamam a cor com opacidade NUMÉRICA (0)
  // para montar a parada transparente — por isso o String().
  const cor = ({ opacityValue }: { opacityValue?: string | number }) => {
    const opacidade = opacityValue === undefined ? undefined : String(opacityValue)
    return opacidade === undefined || opacidade.startsWith('var(')
      ? cssVar
      : `color-mix(in srgb, ${cssVar} calc(${opacidade} * 100%), transparent)`
  }
  return cor as unknown as string
}

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Toda var() de fonte leva reserva: sem ela, uma classe do next/font
        // divergente invalida a declaração e a página cai em Times New Roman.
        sans: ['var(--font-jakarta, system-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono, ui-monospace)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Marquise (fachada)
        marquee: tema('var(--marquee)'),
        glow: tema('var(--glow)'),
        shell: tema('var(--shell)'),
        sidebar: {
          DEFAULT: tema('var(--sidebar)'),
          line: 'var(--sidebar-line)',
          ink: tema('var(--sidebar-ink)'),
          'ink-2': 'var(--sidebar-ink-2)',
          'ink-3': 'var(--sidebar-ink-3)',
        },
        // Folha (salão)
        canvas: tema('var(--canvas)'),
        bg: {
          DEFAULT: tema('var(--bg)'),
          2: tema('var(--bg-2)'),
          3: tema('var(--bg-3)'),
        },
        ink: {
          DEFAULT: tema('var(--ink)'),
          2: tema('var(--ink-2)'),
          3: tema('var(--ink-3)'),
          4: tema('var(--ink-4)'),
        },
        line: {
          DEFAULT: tema('var(--line)'),
          2: tema('var(--line-2)'),
        },
        // Ação
        brick: {
          DEFAULT: tema('var(--brick)'),
          dk: tema('var(--brick-dk)'),
          lt: tema('var(--brick-lt)'),
          ink: tema('var(--brick-ink)'),
        },
        sky: tema('var(--sky)'),
        ok: tema('var(--ok)'),
        warn: tema('var(--warn)'),
        err: tema('var(--err)'),
      },
      // Fio padrão (`border` sem cor) = --line: acompanha o modo escuro.
      borderColor: {
        DEFAULT: 'var(--line)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        card: 'var(--shadow-card)',
      },
      transitionTimingFunction: {
        entrada: 'cubic-bezier(0.16, 1, 0.3, 1)',
        saida: 'cubic-bezier(0.3, 0, 1, 1)',
        suave: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
