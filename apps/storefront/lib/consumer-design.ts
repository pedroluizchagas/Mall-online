/**
 * Tokens de design do storefront — cópia de
 * apps/mobile-consumer/lib/consumer-design.ts (referência de tokens em TS).
 *
 * Copiado, não compartilhado: o storefront é uma superfície isolada (D1/D5)
 * com seu próprio bundle e tema. A tradução para CSS/Tailwind vive em
 * tailwind.config.ts e app/globals.css; este arquivo mantém os tokens em TS
 * para uso programático (ex.: cálculos de cor, badges de status).
 *
 * Regra: nenhum hex literal pode existir em código de UI fora deste arquivo.
 */
export const consumerDesign = {
  colors: {
    // Backgrounds claros
    canvas: '#F3F3F1',
    canvasAlt: '#E8E8E3',
    surface: '#FFFFFF',
    surfaceMuted: '#ECECE9',

    // Backgrounds escuros (destaque)
    surfaceDark: '#2F3034',
    surfaceDarkSoft: '#3A3B40',

    // Texto
    ink: '#111216',
    inkMuted: '#5E6168',
    inkSoft: '#8B8E94',

    // Linhas
    line: '#E5E5E0',
    lineDark: '#4A4B50',

    // Accent (CTA primário)
    accent: '#D8FF3E',
    accentStrong: '#C8F22E',
    accentSoft: 'rgba(216, 255, 62, 0.18)',

    // Neutro
    white: '#FFFFFF',

    // Status
    warning: '#F2B84B',
    success: '#8ED14F',
    danger: '#FF6D5E',
    info: '#5BB7FF',
  },
  radius: {
    sm: 14,
    md: 20,
    lg: 28,
    xl: 34,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },
  typography: {
    display: { size: 32, weight: '800', tracking: -0.5 },
    h1: { size: 28, weight: '800', tracking: -0.5 },
    h2: { size: 22, weight: '800', tracking: -0.3 },
    h3: { size: 18, weight: '700', tracking: -0.2 },
    bodyLg: { size: 16, weight: '500', tracking: 0 },
    body: { size: 14, weight: '500', tracking: 0 },
    bodySm: { size: 13, weight: '500', tracking: 0 },
    label: { size: 12, weight: '700', tracking: 0.5, uppercase: true },
    micro: { size: 11, weight: '700', tracking: 1.2, uppercase: true },
  },
  motion: {
    fast: 150,
    base: 220,
    slow: 360,
    pulse: 1300,
  },
  shadow: {
    none: 'none',
    soft: '0 4px 12px rgba(0, 0, 0, 0.06)',
    medium: '0 8px 18px rgba(0, 0, 0, 0.10)',
    floating: '0 12px 24px rgba(0, 0, 0, 0.18)',
  },
  opacity: {
    pressed: 0.85,
    pressedSoft: 0.75,
    disabled: 0.4,
    overlay: 0.4,
  },
} as const

/**
 * Aplica alpha 18% em uma cor hex sólida.
 * Usado em backgrounds de status badge: `softColor(colors.warning)`.
 */
export function softColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.18)`
}
