/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
        surface: '#FFFFFF',
        warm: '#E8E0D4',
        ink: {
          900: '#1C1C19',
          700: '#3D3D36',
          500: '#6B6B60',
          400: '#8A8A7E',
          300: '#B0B0A5',
          200: '#D0D0C5',
        },
      },
    },
  },
  plugins: [],
}
