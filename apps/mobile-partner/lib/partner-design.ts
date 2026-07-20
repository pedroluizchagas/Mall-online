/**
 * Tokens de design do mobile-partner (App do Lojista).
 * Single source of truth visual: cores, raio, tipografia, spacing, motion, shadow, opacity.
 *
 * Espelha apps/mobile-courier/lib/courier-design.ts e
 * apps/mobile-consumer/lib/consumer-design.ts para que os três apps
 * compartilhem a mesma DNA. Detalhamento e justificativas em
 * docs/system-design/consumer/01-tokens.md.
 *
 * Regra: nenhum hex literal pode existir em código de UI fora deste arquivo
 * (exceções documentadas em 01-tokens.md §11).
 */
export const partnerDesign = {
  colors: {
    // Backgrounds claros
    canvas: '#F3F3F1',
    canvasAlt: '#E8E8E3',
    surface: '#FFFFFF',
    surfaceMuted: '#ECECE9',

    // Backgrounds escuros (destaque; telas de captura/preview usam base ink)
    surfaceDark: '#2F3034',
    surfaceDarkSoft: '#3A3B40',
    splash: '#1A4D3A',

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
    tabBarHeight: 96, // 68 (altura) + 16 (bottom inset folga) + 12 (margem extra)
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
    none: {
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    soft: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOpacity: 0.10,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    floating: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
  },
  opacity: {
    pressed: 0.85,
    pressedSoft: 0.75,
    disabled: 0.4,
    overlay: 0.4,
  },
} as const

// — Helpers (mantidos por simetria com courier/consumer-design.ts)

export function saudacaoPorHorario() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function abreviarNome(nome?: string | null) {
  if (!nome) return 'Lojista'
  const [primeiro, segundo] = nome.trim().split(/\s+/)
  return segundo ? `${primeiro} ${segundo}` : primeiro
}

export function formatarMomentoCurto(data?: string | null) {
  if (!data) return 'Sem atualização'
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
