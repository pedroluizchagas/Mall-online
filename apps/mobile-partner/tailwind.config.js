/** @type {import('tailwindcss').Config} */
// Espelho dos tokens de lib/partner-design.ts. Tudo que não está aqui NÃO
// existe como classe. (O app usa StyleSheet inline; o config fica em
// sincronia com o consumer por disciplina — ver docs/system-design/partner.)
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#F1F1F3',
        'canvas-alt': '#E7E7EA',
        surface: '#FFFFFF',
        'surface-muted': '#ECECEF',
        'surface-dark': '#2F3034',
        'surface-dark-soft': '#3A3B40',
        marquee: '#18181B',
        ink: '#111216',
        'ink-muted': '#5E6168',
        'ink-soft': '#8B8E94',
        line: '#E4E4E7',
        'line-dark': '#4A4B50',
        accent: '#D8FF3E',
        'accent-strong': '#C8F22E',
        success: '#8ED14F',
        warning: '#F2B84B',
        danger: '#FF6D5E',
        info: '#5BB7FF',
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
