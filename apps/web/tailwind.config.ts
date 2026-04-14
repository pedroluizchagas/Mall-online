import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#dcf0e6',
          200: '#bbe2cf',
          300: '#8ecdb1',
          400: '#5cb38d',
          500: '#4CAF82',
          600: '#2d8a60',
          700: '#266f4e',
          800: '#1A4D3A',
          900: '#163d2e',
          950: '#0c2a1f',
        },
        surface: {
          base: '#FFF8ED',
          card: '#FFFFFF',
          muted: '#EFEFEF',
          main: '#EFEFEF',
        },
        sidebar: {
          bg:      '#151515',
          hover:   '#1f1f1f',
          search:  '#1f1f1f',
          card:    '#1c1c1c',
          border:  '#1e1e1e',
          section: '#383838',
          item:    '#555555',
          'item-hover': '#888888',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / .06), 0 1px 2px -1px rgb(0 0 0 / .06)',
        'card-hover': '0 4px 16px 0 rgb(0 0 0 / .08), 0 1px 3px -1px rgb(0 0 0 / .06)',
        sidebar: '1px 0 0 0 rgb(255 255 255 / .06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        '180': '180ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
