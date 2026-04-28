export const courierDesign = {
  colors: {
    canvas: '#F3F3F1',
    canvasAlt: '#E8E8E3',
    surface: '#FFFFFF',
    surfaceMuted: '#ECECE9',
    surfaceDark: '#2F3034',
    surfaceDarkSoft: '#3A3B40',
    ink: '#111216',
    inkMuted: '#5E6168',
    inkSoft: '#8B8E94',
    line: '#E5E5E0',
    lineDark: '#4A4B50',
    accent: '#D8FF3E',
    accentStrong: '#C8F22E',
    accentSoft: 'rgba(216, 255, 62, 0.18)',
    white: '#FFFFFF',
    warning: '#F2B84B',
    success: '#8ED14F',
    danger: '#FF6D5E',
  },
  radius: {
    sm: 14,
    md: 20,
    lg: 28,
    xl: 34,
    pill: 999,
  },
} as const

export function saudacaoPorHorario() {
  const hora = new Date().getHours()

  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function abreviarNome(nome?: string | null) {
  if (!nome) return 'Entregador'

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
