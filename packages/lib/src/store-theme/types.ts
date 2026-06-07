/**
 * Contratos do StoreTheme — o DESIGN VISUAL premium de cada loja parceira,
 * aplicado tanto no storefront (web) quanto no app consumidor (mobile).
 *
 * Fonte da verdade: docs/store-theme/02-arquetipos-de-design.md e
 * docs/store-theme/03-design-tokens-e-schema.md.
 *
 * NÃO confundir com `DashboardTemplate` (packages/lib/src/templates): aquele é
 * FUNCIONAL (quais módulos/campos o lojista opera), indexado por nicho. Este é
 * VISUAL (a aparência da loja pro cliente), indexado por arquétipo + paleta.
 * Modelo híbrido: a ESTRUTURA segue o nicho (DashboardTemplate.layoutPdp);
 * a PELE (arquétipo/cores/tipografia) vive aqui.
 */

/** Os 11 arquétipos que cobrem 100% das 20 categorias do Mallevo. */
export type ArquetipoCodigo =
  | 'heritage' // restaurantes/alimentação premium — serifa, neutros quentes
  | 'raw' // streetwear/moda sport — dark, sans pesada, alto contraste
  | 'editorial' // moda elegante/cosméticos/neutro default — clean, whitespace
  | 'noir' // luxo (joias, auto premium) — preto, acentos metálicos
  | 'soft' // pet/salões/beleza-serviço — arredondado, acolhedor
  | 'artisan' // móveis/decoração/flores — neutros naturais, tátil
  | 'clinic' // farmácia/saúde/veterinária — clínico, confiança, legível
  | 'tech' // eletrônicos/tecnologia — sharp, preciso, acento elétrico
  | 'market' // mercado/conveniência — denso, escaneável, ofertas
  | 'utility' // construção/oficinas/autopeças — robusto, industrial
  | 'playful' // brinquedos/papelaria — vibrante, lúdico

export type ThemeMode = 'light' | 'dark'
export type RadiusScale = 'sharp' | 'soft' | 'round'
export type DensityScale = 'compact' | 'comfortable'
export type TypeScale = 'compact' | 'regular' | 'spacious'

/** Cores resolvidas. Nomes alinhados a `consumer-design.ts` para minimizar refactor. */
export interface ColorTokens {
  bg: string // fundo da página (era 'canvas')
  surface: string // cards, sheets
  surfaceAlt: string // fundo secundário / hover
  ink: string // texto principal
  inkMuted: string // texto secundário
  line: string // divisores / bordas
  accent: string // CTA / destaque
  accentInk: string // texto sobre accent (contraste garantido no resolve)
  success: string
  warning: string
  danger: string
}

export interface FontSpec {
  family: string
  weights: readonly number[]
}

export interface TypographyTokens {
  display: FontSpec // títulos/hero
  body: FontSpec // corpo
  scale: TypeScale
}

export interface ShapeTokens {
  radius: RadiusScale
  density: DensityScale
}

/** Tokens resolvidos, prontos para virar CSS vars (web) ou context (RN). */
export interface ThemeTokens {
  mode: ThemeMode
  color: ColorTokens
  typography: TypographyTokens
  shape: ShapeTokens
}

/** Definição declarativa de um arquétipo: tokens default + metadados de UI. */
export interface Archetype {
  codigo: ArquetipoCodigo
  /** Nome humano exibido no onboarding/editor. */
  nome: string
  descricao: string
  /** Mood em poucas palavras — usado nos cards de seleção. */
  mood: readonly string[]
  /** Referências-âncora (URLs) que destilaram este DNA. Vazio = arquétipo desenhado internamente. */
  referencias: readonly string[]
  tokens: ThemeTokens
}

/**
 * Forma PERSISTIDA em `stores.theme` (JSONB), versão 2.
 * `preset` é obrigatório; o resto são overrides parciais do lojista sobre o
 * default do arquétipo. Ausência → usa o default. Mantém o JSON enxuto e
 * resiliente à evolução dos presets.
 */
export interface StoreThemeConfig {
  v: 2
  preset: ArquetipoCodigo
  color?: Partial<ColorTokens>
  fonts?: { display?: string; body?: string }
  shape?: Partial<ShapeTokens>
  mode?: ThemeMode
}

/** Forma legada (v1) ainda presente em lojas antigas — migrada no resolve. */
export interface StoreThemeV1 {
  template?: 'market' | 'boutique' | 'artesanal' | 'neon'
  paleta?: string | null
}

/** Sugestão de pele por categoria: default destacado + alternativas compatíveis. */
export interface ArquetipoSugestao {
  default: ArquetipoCodigo
  alternativas: readonly ArquetipoCodigo[]
}
