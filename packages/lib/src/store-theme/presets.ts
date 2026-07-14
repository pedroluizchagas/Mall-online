import type { Archetype, ArquetipoCodigo, ColorTokens } from './types'

/**
 * Catálogo dos 11 arquétipos com seus tokens default.
 *
 * Valores iniciais destilados das referências (docs/store-theme/02) e
 * desenhados internamente para os nichos sem referência (clinic, tech, market,
 * utility, playful). Refináveis sem quebra: lojas guardam só overrides.
 *
 * Semânticos (success/warning/danger) são FIXOS em todos os arquétipos para
 * preservar consistência de status (ex.: estado de pedido) — só a pele muda.
 */

const SEMANTIC = {
  success: '#16A34A',
  warning: '#E8A33D',
  danger: '#E5544B',
} as const

/** Helper: completa as cores semânticas fixas, deixando o preset focar na pele. */
function pele(c: Omit<ColorTokens, 'success' | 'warning' | 'danger'>): ColorTokens {
  return { ...c, ...SEMANTIC }
}

export const ARQUETIPOS = {
  // ── Referências: alimentação premium / cafeterias boutique ─────────────────
  heritage: {
    codigo: 'heritage',
    nome: 'Heritage',
    descricao:
      'Clássico e acolhedor. Serifa de display, neutros quentes, foto de comida em destaque. Para restaurantes e cafés com história.',
    mood: ['sofisticado', 'atemporal', 'acolhedor'],
    referencias: [
      'https://veloriarestaurant.framer.website/',
      'https://bistora.framer.website/',
      'https://lapaloma.framer.website/',
    ],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#FBF7F0',
        surface: '#FFFFFF',
        surfaceAlt: '#F3EDE1',
        ink: '#1A1714',
        inkMuted: '#6B5E4F',
        line: '#E8DFD2',
        accent: '#8C5A2B',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Fraunces', weights: [400, 600, 700] },
        body: { family: 'Inter', weights: [400, 500, 600, 700] },
        scale: 'spacious',
      },
      shape: { radius: 'soft', density: 'comfortable' },
    },
  },

  // ── Referências: streetwear / moda masculina e sport ───────────────────────
  raw: {
    codigo: 'raw',
    nome: 'Raw',
    descricao:
      'Ousado e urbano. Fundo escuro, sans condensada pesada, alto contraste. Para streetwear e moda com atitude.',
    mood: ['ousado', 'urbano', 'rebelde'],
    referencias: [
      'https://rawline.framer.website/',
      'https://wearix.framer.website/',
      'https://wearvo.framer.website/',
    ],
    tokens: {
      mode: 'dark',
      color: pele({
        bg: '#0E0E10',
        surface: '#18181B',
        surfaceAlt: '#232327',
        ink: '#FAFAFA',
        inkMuted: '#A1A1AA',
        line: '#27272A',
        accent: '#E0FF4F',
        accentInk: '#0E0E10',
      }),
      typography: {
        display: { family: 'Archivo', weights: [600, 700, 800] },
        body: { family: 'Inter', weights: [400, 500, 600, 700] },
        scale: 'compact',
      },
      shape: { radius: 'sharp', density: 'compact' },
    },
  },

  // ── Referências: moda elegante / cosméticos / default neutro ───────────────
  editorial: {
    codigo: 'editorial',
    nome: 'Editorial',
    descricao:
      'Minimalista e curado. Sans clean, paleta neutra, muito respiro, foto de produto editorial. Default seguro para qualquer loja.',
    mood: ['minimalista', 'curado', 'sofisticado'],
    referencias: [
      'https://veonn.framer.website/',
      'https://marionshop.framer.website/',
      'https://zaro.framer.website/',
    ],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#FFFFFF',
        surface: '#FAFAFA',
        surfaceAlt: '#F2F2F2',
        ink: '#111111',
        inkMuted: '#767676',
        line: '#ECECEC',
        accent: '#111111',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Inter', weights: [500, 600, 700] },
        body: { family: 'Inter', weights: [400, 500, 700] },
        scale: 'regular',
      },
      shape: { radius: 'sharp', density: 'comfortable' },
    },
  },

  // ── Referências: joias/acessórios de luxo / automóveis premium ─────────────
  noir: {
    codigo: 'noir',
    nome: 'Noir Luxe',
    descricao:
      'Luxo dramático. Fundo preto, acentos metálicos, imagem domina o texto, tipografia de alto contraste. Para joias e premium.',
    mood: ['luxuoso', 'exclusivo', 'dramático'],
    referencias: [
      'https://caelora.framer.website/',
      'https://aurum-frameship-template.framer.website/',
      'https://esteem.framer.website/',
    ],
    tokens: {
      mode: 'dark',
      color: pele({
        bg: '#000000',
        surface: '#0C0C0C',
        surfaceAlt: '#161616',
        ink: '#F5F5F5',
        inkMuted: '#8A8A8A',
        line: '#1C1C1C',
        accent: '#C9A24B',
        accentInk: '#000000',
      }),
      typography: {
        display: { family: 'Cormorant Garamond', weights: [500, 600, 700] },
        body: { family: 'Inter', weights: [400, 500, 700] },
        scale: 'spacious',
      },
      shape: { radius: 'sharp', density: 'comfortable' },
    },
  },

  // ── Referências: petshop / salões / beleza-serviço ─────────────────────────
  soft: {
    codigo: 'soft',
    nome: 'Soft Care',
    descricao:
      'Caloroso e amigável. Cantos arredondados, acento quente, sans amigável. Para pet, salões e serviços de cuidado.',
    mood: ['caloroso', 'amigável', 'confiável'],
    referencias: [
      'https://groomerly.framer.website/',
      'https://petpals.framer.website/',
    ],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#FBF6F2',
        surface: '#FFFFFF',
        surfaceAlt: '#F6EDE6',
        ink: '#2A2A2A',
        inkMuted: '#7A7A7A',
        line: '#F0E6DE',
        accent: '#FF8A5B',
        // Coral é claro: tinta quente-escura (não branca) p/ AA real.
        accentInk: '#2A2A2A',
      }),
      typography: {
        display: { family: 'Nunito', weights: [600, 700, 800] },
        body: { family: 'Nunito', weights: [400, 500, 600, 700] },
        scale: 'regular',
      },
      shape: { radius: 'round', density: 'comfortable' },
    },
  },

  // ── Referências: móveis / decoração / floricultura ─────────────────────────
  artisan: {
    codigo: 'artisan',
    nome: 'Artisan Warm',
    descricao:
      'Refinado e tátil. Neutros naturais, tons de madeira, narrativa de materialidade. Para móveis, decoração e flores.',
    mood: ['refinado', 'calmo', 'artesanal'],
    referencias: ['https://graft.framer.website/'],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#F4F0E9',
        surface: '#FBF9F4',
        surfaceAlt: '#ECE5D8',
        ink: '#2B271F',
        inkMuted: '#6E6655',
        line: '#E3DCCD',
        accent: '#7C6A4E',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Spectral', weights: [400, 500, 600] },
        body: { family: 'Inter', weights: [400, 500, 700] },
        scale: 'spacious',
      },
      shape: { radius: 'soft', density: 'comfortable' },
    },
  },

  // ── Sem referência (desenhado internamente): farmácia / saúde / veterinária ─
  clinic: {
    codigo: 'clinic',
    nome: 'Clinic',
    descricao:
      'Clínico e confiável. Limpo, alta legibilidade, paleta verde-água que transmite saúde e credibilidade. Para farmácia, saúde e vet.',
    mood: ['clínico', 'confiável', 'sereno'],
    referencias: [],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#F4F9F8',
        surface: '#FFFFFF',
        surfaceAlt: '#E9F3F1',
        ink: '#14302C',
        inkMuted: '#5A716D',
        line: '#DCEAE7',
        // Teal aprofundado p/ sustentar tinta branca com AA real
        // (o #12A594 original reprovava e era corrigido p/ preto no resolve).
        accent: '#0D7A6E',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Inter', weights: [600, 700] },
        body: { family: 'Inter', weights: [400, 500, 600, 700] },
        scale: 'regular',
      },
      shape: { radius: 'soft', density: 'compact' },
    },
  },

  // ── Sem referência (desenhado internamente): eletrônicos / tecnologia ──────
  tech: {
    codigo: 'tech',
    nome: 'Tech',
    descricao:
      'Moderno e preciso. Cantos retos, grade densa, acento azul elétrico, foco em especificações. Para eletrônicos e gadgets.',
    mood: ['moderno', 'preciso', 'tecnológico'],
    referencias: [],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#FFFFFF',
        surface: '#F7F8FA',
        surfaceAlt: '#EEF1F5',
        ink: '#0B1220',
        inkMuted: '#5B6676',
        line: '#E4E8EE',
        accent: '#2563EB',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Space Grotesk', weights: [500, 600, 700] },
        body: { family: 'Inter', weights: [400, 500, 700] },
        scale: 'regular',
      },
      shape: { radius: 'sharp', density: 'compact' },
    },
  },

  // ── Sem referência (desenhado internamente): mercado / conveniência ────────
  market: {
    codigo: 'market',
    nome: 'Market',
    descricao:
      'Eficiente e escaneável. Brilhante, grade densa, ênfase em preço e ofertas, acento verde fresco. Para mercado e conveniência.',
    mood: ['eficiente', 'fresco', 'direto'],
    referencias: [],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceAlt: '#F4F6F3',
        ink: '#1B2519',
        inkMuted: '#5E6B59',
        line: '#E7EBE4',
        // Verde aprofundado p/ sustentar tinta branca com AA real
        // (o #2EA043 original reprovava e era corrigido p/ preto no resolve).
        accent: '#22863A',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Inter', weights: [600, 700, 800] },
        body: { family: 'Inter', weights: [400, 500, 600, 700] },
        scale: 'compact',
      },
      shape: { radius: 'soft', density: 'compact' },
    },
  },

  // ── Sem referência (desenhado internamente): construção / oficinas / autopeças
  utility: {
    codigo: 'utility',
    nome: 'Utility',
    descricao:
      'Robusto e funcional. Aço escuro com âmbar de segurança, cantos retos, alta densidade. Para construção, oficinas e autopeças.',
    mood: ['robusto', 'industrial', 'direto'],
    referencias: [],
    tokens: {
      mode: 'dark',
      color: pele({
        bg: '#14161A',
        surface: '#1D2025',
        surfaceAlt: '#262A31',
        ink: '#F4F5F7',
        inkMuted: '#9AA1AC',
        line: '#2D323A',
        accent: '#F5A623',
        accentInk: '#14161A',
      }),
      typography: {
        display: { family: 'Archivo', weights: [600, 700, 800] },
        body: { family: 'Inter', weights: [400, 500, 600, 700] },
        scale: 'compact',
      },
      shape: { radius: 'sharp', density: 'compact' },
    },
  },

  // ── Sem referência (desenhado internamente): brinquedos / papelaria ────────
  playful: {
    codigo: 'playful',
    nome: 'Playful',
    descricao:
      'Vibrante e lúdico. Cantos bem arredondados, acento violeta energético, sans amigável. Para brinquedos, presentes e papelaria.',
    mood: ['vibrante', 'lúdico', 'energético'],
    referencias: [],
    tokens: {
      mode: 'light',
      color: pele({
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceAlt: '#FFF3E6',
        ink: '#2A1A3E',
        inkMuted: '#6E5E80',
        line: '#F0E4F5',
        accent: '#7C3AED',
        accentInk: '#FFFFFF',
      }),
      typography: {
        display: { family: 'Baloo 2', weights: [500, 600, 700] },
        body: { family: 'Nunito', weights: [400, 500, 600, 700] },
        scale: 'regular',
      },
      shape: { radius: 'round', density: 'comfortable' },
    },
  },
} as const satisfies Record<ArquetipoCodigo, Archetype>

/** Arquétipo neutro usado como fallback quando o tema é nulo/inválido. */
export const ARQUETIPO_FALLBACK: ArquetipoCodigo = 'editorial'
