/**
 * Entrada pública do StoreTheme — o design visual premium por loja.
 * Ver docs/store-theme/ para o contrato completo.
 *
 * Complementa (não substitui) os Templates de Dashboard: aquele é funcional
 * por nicho; este é visual por arquétipo. Ver docs/store-theme/01.
 */
export type {
  Archetype,
  ArquetipoCodigo,
  ArquetipoSugestao,
  ColorTokens,
  DensityScale,
  FontSpec,
  RadiusScale,
  ShapeTokens,
  StoreThemeConfig,
  StoreThemeV1,
  ThemeMode,
  ThemeTokens,
  TypeScale,
  TypographyTokens,
} from './types'

export { ARQUETIPOS, ARQUETIPO_FALLBACK } from './presets'

export {
  CATEGORIA_SLUG_TO_ARQUETIPO,
  getArquetipoSugestao,
  getDefaultArquetipo,
  getArquetiposOferecidos,
} from './mapping'

export { hasExplicitPreset, normalizeThemeConfig, resolveTheme } from './resolve'
export { toCssVars, RADIUS_PX } from './to-css-vars'
export { contrastRatio, ensureAccentInk, pickInkOn } from './contrast'

export {
  StoreThemeProvider,
  useStoreTheme,
} from './provider'
export type { StoreThemeProviderProps } from './provider'
