import type { Config } from 'tailwindcss'

/**
 * Tokens traduzidos de apps/mobile-consumer/lib/consumer-design.ts.
 * Copiados e adaptados (não compartilhados): RN elevation/shadowOffset não
 * mapeia para web — convertido para CSS box-shadow. Storefront é uma superfície
 * isolada (D1/D5), com seu próprio bundle e tema.
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        // Dirigidas por StoreTheme: fora da loja caem no Jakarta (:root).
        display: ['var(--font-display)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Tokens dirigidos por StoreTheme: `var(--token, <fallback Mallevo>)`.
        // Sem tema injetado, o fallback reproduz exatamente a paleta Mallevo
        // (ver app/globals.css :root). Lojas com preset v2 sobrescrevem as vars
        // no wrapper StoreThemeRoot. Ver docs/store-theme/04 §4.3.
        canvas: 'var(--bg, #F3F3F1)',
        canvasAlt: 'var(--surface-alt, #E8E8E3)',
        surface: 'var(--surface, #FFFFFF)',
        surfaceMuted: 'var(--surface-alt, #ECECE9)',
        // Superfícies escuras fixas (banner/auth) — fora do escopo de tema.
        surfaceDark: '#2F3034',
        surfaceDarkSoft: '#3A3B40',
        // Texto
        ink: {
          DEFAULT: 'var(--ink, #111216)',
          muted: 'var(--ink-muted, #5E6168)',
          soft: '#8B8E94',
        },
        // Linhas
        line: {
          DEFAULT: 'var(--line, #E5E5E0)',
          dark: '#4A4B50',
        },
        // Accent (CTA primário) + cor de texto legível sobre ele (accent-ink).
        accent: {
          DEFAULT: 'var(--accent, #D8FF3E)',
          strong: 'var(--accent, #C8F22E)',
          soft: 'var(--accent-soft, rgba(216, 255, 62, 0.18))',
          ink: 'var(--accent-ink, #111216)',
        },
        // Status
        warning: 'var(--warning, #F2B84B)',
        success: 'var(--success, #8ED14F)',
        danger: 'var(--danger, #FF6D5E)',
        info: '#5BB7FF',
      },
      borderRadius: {
        // consumer-design.radius (px) → web
        sm: '14px',
        md: '20px',
        lg: '28px',
        xl: '34px',
        pill: '999px',
      },
      boxShadow: {
        // consumer-design.shadow (RN) → CSS box-shadow
        // offset {0,h} radius r opacity o, cor #000
        none: 'none',
        soft: '0 4px 12px rgba(0, 0, 0, 0.06)',
        medium: '0 8px 18px rgba(0, 0, 0, 0.10)',
        floating: '0 12px 24px rgba(0, 0, 0, 0.18)',
      },
    },
  },
  plugins: [],
}

export default config
