import type { DensityScale, RadiusScale, TypeScale } from './types'

/**
 * Escalas numéricas derivadas dos tokens de forma/densidade/tipografia.
 *
 * São a fonte única consumida pelas TRÊS superfícies:
 * - storefront (web): via `toCssVars` → `--radius-*`, `--space-*`, `--type-factor`;
 * - mobile-consumer (RN): via `designFromTheme` (apps/mobile-consumer/lib/store-theme.tsx);
 * - editor/preview (dashboard web): via `temaFromTokens`.
 *
 * Faixas seguem docs/store-theme/03 §3.2: sharp 0–4px | soft 8–12px |
 * round 16–24px (valores base; a escala completa cresce proporcionalmente).
 */

/** Passos de raio (px) usados pelos componentes: card, imagem, sheet, CTA. */
export interface RadiusSteps {
  sm: number
  md: number
  lg: number
  xl: number
  /** Botões/chips "stadium". Em `sharp` vira canto reto suave (não-pill). */
  pill: number
}

export const RADIUS_STEPS_PX: Record<RadiusScale, RadiusSteps> = {
  sharp: { sm: 2, md: 4, lg: 6, xl: 8, pill: 8 },
  soft: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  round: { sm: 14, md: 20, lg: 26, xl: 32, pill: 999 },
}

/** Espaçamentos de ritmo (px) por densidade. */
export interface DensitySpace {
  /** Padding horizontal de tela (gutter). */
  screenX: number
  /** Padding vertical interno de cards/linhas de lista. */
  card: number
  /** Respiro entre seções do catálogo. */
  section: number
  /** Padding interno de sheets/modais. */
  sheet: number
}

export const DENSITY_SPACE_PX: Record<DensityScale, DensitySpace> = {
  compact: { screenX: 16, card: 12, section: 12, sheet: 16 },
  comfortable: { screenX: 24, card: 16, section: 16, sheet: 20 },
}

/**
 * Fator multiplicativo aplicado aos tamanhos de display (títulos).
 * Corpo NÃO escala (docs/store-theme/05 §5.5: tamanhos mínimos preservados).
 */
export const TYPE_SCALE_FACTOR: Record<TypeScale, number> = {
  compact: 0.93,
  regular: 1,
  spacious: 1.08,
}
