/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ─────────────────────────────────────────────────────────
        // Tokens novos (consumer-design.ts) — ver
        // docs/system-design/consumer/01-tokens.md
        // ─────────────────────────────────────────────────────────
        canvas: '#F3F3F1',
        'canvas-alt': '#E8E8E3',
        surface: '#FFFFFF',
        'surface-muted': '#ECECE9',
        'surface-dark': '#2F3034',
        'surface-dark-soft': '#3A3B40',
        'ink-muted': '#5E6168',
        'ink-soft': '#8B8E94',
        line: '#E5E5E0',
        'line-dark': '#4A4B50',
        accent: '#D8FF3E',
        'accent-strong': '#C8F22E',
        success: '#8ED14F',
        warning: '#F2B84B',
        danger: '#FF6D5E',
        info: '#5BB7FF',

        // ─────────────────────────────────────────────────────────
        // Tokens antigos (deprecated) — preservados para que telas
        // ainda não migradas continuem funcionando durante a
        // transição. Removidos na Fase 9 (cleanup) — ver
        // docs/system-design/consumer/08-roadmap.md.
        // ─────────────────────────────────────────────────────────
        verde: {
          profundo: '#1A4D3A',
          medio: '#4CAF82',
          500: '#287D5C',
          100: '#E8F5EE',
        },
        ambar: '#D4A04A',
        coral: '#C75B3A',
        gold: '#C5975B',
        creme: '#F4F0EB',
        warm: '#E8E0D4',

        // 'ink' tem dois usos:
        // - novo: cor sólida #111216 (ink puro, igual courier).
        // - antigo: escala 200..900.
        // Para coexistir, mantemos o objeto antigo + adicionamos a
        // chave DEFAULT que torna `bg-ink` / `text-ink` resolverem
        // para o ink novo. Telas antigas que usam `text-ink-700` etc.
        // continuam funcionando. Fase 9 simplifica para hex sólido.
        ink: {
          DEFAULT: '#111216',
          900: '#1C1C19',
          700: '#3D3D36',
          500: '#6B6B60',
          400: '#8A8A7E',
          300: '#B0B0A5',
          200: '#D0D0C5',
        },
      },
      borderRadius: {
        sm: '14px',
        md: '20px',
        lg: '28px',
        xl: '34px',
      },
    },
  },
  plugins: [],
}
