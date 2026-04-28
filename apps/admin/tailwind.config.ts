import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mallora: {
          dark: '#1A4D3A',
          green: '#4CAF82',
          amber: '#F5A623',
          cream: '#FFF8ED',
        },
        sidebar: {
          DEFAULT: '#0D1117',
          surface: '#161B22',
          border: '#21262D',
          muted: '#8B949E',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.07)',
      },
    },
  },
  plugins: [],
}

export default config
