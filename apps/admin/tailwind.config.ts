import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        shell: 'var(--shell)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          2: 'var(--sidebar-2)',
          line: 'var(--sidebar-line)',
          ink: 'var(--sidebar-ink)',
          'ink-2': 'var(--sidebar-ink-2)',
          'ink-3': 'var(--sidebar-ink-3)',
        },
        bg: {
          DEFAULT: 'var(--bg)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        line: {
          DEFAULT: 'var(--line)',
          2: 'var(--line-2)',
        },
        brick: {
          DEFAULT: 'var(--brick)',
          dk: 'var(--brick-dk)',
          lt: 'var(--brick-lt)',
          ink: 'var(--brick-ink)',
        },
        mustard: 'var(--mustard)',
        leaf: 'var(--leaf)',
        berry: 'var(--berry)',
        sky: 'var(--sky)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        err: 'var(--err)',
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
      },
    },
  },
  plugins: [],
}

export default config
