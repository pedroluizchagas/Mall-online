/**
 * Tokens de design do mobile-consumer.
 * Single source of truth visual: cores, raio, tipografia, spacing, motion, shadow, opacity.
 *
 * Espelha apps/mobile-courier/lib/courier-design.ts para que os dois apps
 * compartilhem a mesma DNA. Detalhamento e justificativas em
 * docs/system-design/consumer/01-tokens.md.
 *
 * Regra: nenhum hex literal pode existir em código de UI fora deste arquivo
 * (exceções documentadas em 01-tokens.md §11).
 */
export const consumerDesign = {
  colors: {
    // Backgrounds claros — família zinco ("vidro fumê"), casada com o
    // marquee #18181B e a escala do painel web do lojista. O fumê mora no
    // canvas; a surface branca acende sobre ele — elevação por
    // luminosidade, não por sombra.
    canvas: '#F1F1F3',
    canvasAlt: '#E7E7EA',
    surface: '#FFFFFF',
    surfaceMuted: '#ECECEF',

    // Backgrounds escuros (destaque)
    surfaceDark: '#2F3034',
    surfaceDarkSoft: '#3A3B40',

    // Marquise — fachada do home. Base zinco-quente + brilho lima-profundo:
    // o MESMO degradê do painel web do lojista (apps/web, (auth)/entrar) —
    // dois blobs de `marqueeGlow` (~20% topo-direito, ~10% pé-esquerdo)
    // difusos sobre `marquee` criam o verde-oliva da marca.
    marquee: '#18181B',
    // Lima-profundo do brand web (#C1F148) — SÓ para a atmosfera da fachada
    // (GlowNeon). O sinal de interação continua sendo `accent` (#D8FF3E);
    // no glow, a diferença de matiz é imperceptível (alpha ≤ 22%) e aquece
    // o fundo sem criar um segundo lima de UI.
    marqueeGlow: '#C1F148',
    marqueeGlass: 'rgba(255, 255, 255, 0.08)',
    marqueeGlassStrong: 'rgba(255, 255, 255, 0.13)',
    marqueeLine: 'rgba(255, 255, 255, 0.10)',
    marqueeInkSoft: 'rgba(255, 255, 255, 0.66)',
    marqueeInkMuted: 'rgba(255, 255, 255, 0.42)',

    // Ink translúcido — pílula da tab bar "vidro" sobre o conteúdo
    inkGlass: 'rgba(17, 18, 22, 0.95)',

    // Vidro claro — material das placas sobre o canvas fumê (diretório e
    // letreiros de corredor; componente ui/Vidro). Espelho CLARO do
    // marqueeGlass: no iOS o véu vem com BlurView por baixo; no Android o
    // véu forte simula o fosco (blur ao vivo em N placas é caro demais lá).
    glass: 'rgba(255, 255, 255, 0.55)',
    glassStrong: 'rgba(255, 255, 255, 0.78)',
    glassEdge: 'rgba(255, 255, 255, 0.85)',

    // Texto
    ink: '#111216',
    inkMuted: '#5E6168',
    inkSoft: '#8B8E94',

    // Linhas
    line: '#E4E4E7',
    lineDark: '#4A4B50',

    // Accent (CTA primário)
    accent: '#D8FF3E',
    accentStrong: '#C8F22E',
    accentSoft: 'rgba(216, 255, 62, 0.18)',
    accentRing: 'rgba(216, 255, 62, 0.34)',

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
    // Reserva de rolagem sob a tab bar, dimensionada pelo PIOR caso real:
    // iPhone com inset 34 → pé max(34-8,12)=26 + altura 70 = topo a 96px
    // do rodapé, + 12 de folga = 108. Em aparelho sem inset (pé 12) sobra
    // folga extra — inofensivo para padding de rolagem.
    tabBarHeight: 108,
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

// — Helpers (mantidos por simetria com courier-design.ts)

export function saudacaoPorHorario() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function abreviarNome(nome?: string | null) {
  if (!nome) return 'Cliente'
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
 * "agora", "12 min", "3 h", "5 d", "2 sem", "12 jun".
 *
 * Data no futuro (o dataset de demonstração tem ISOs fixos que podem estar
 * à frente do relógio do aparelho) cai em "agora" em vez de "-3 h".
 */
export function tempoRelativo(iso: string) {
  const instante = Date.parse(iso)
  if (!Number.isFinite(instante)) return ''

  const minutos = Math.floor((Date.now() - instante) / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `${minutos} min`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`

  const dias = Math.floor(horas / 24)
  if (dias < 7) return `${dias} d`
  if (dias < 30) return `${Math.floor(dias / 7)} sem`

  return new Date(instante).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
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
