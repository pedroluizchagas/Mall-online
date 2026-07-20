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
        },
        ambar: '#F5A623',
        creme: '#FFF8ED',
      },
    },
  },
  plugins: [],
}
