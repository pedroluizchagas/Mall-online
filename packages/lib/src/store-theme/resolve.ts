import { ensureAccentInk } from './contrast'
import { getPaleta } from './palettes'
import { ARQUETIPOS, ARQUETIPO_FALLBACK } from './presets'
import type {
  ArquetipoCodigo,
  StoreThemeConfig,
  ThemeTokens,
} from './types'

/**
 * Mapa de migração da pele v1 (`stores.theme.template`) para os arquétipos v2.
 * v1 `market` era um preset boutique genérico — NÃO é o novo arquétipo `market`
 * (mercearia); por isso mapeia para `editorial`.
 */
const V1_TEMPLATE_TO_ARQUETIPO: Record<string, ArquetipoCodigo> = {
  market: 'editorial',
  boutique: 'editorial',
  artesanal: 'artisan',
  neon: 'raw',
}

function isArquetipo(value: unknown): value is ArquetipoCodigo {
  return typeof value === 'string' && value in ARQUETIPOS
}

/**
 * `true` apenas quando o valor cru de `stores.theme` é um StoreThemeConfig v2
 * com `preset` válido — ou seja, o lojista ESCOLHEU uma pele explicitamente.
 *
 * Use para decidir se vale sobrescrever os tokens default da plataforma: tema
 * nulo ou legado (v1) → `false`, mantém a aparência Mallevo padrão; só presets
 * v2 explícitos disparam a tematização da loja.
 */
export function hasExplicitPreset(raw: unknown): boolean {
  return (
    !!raw &&
    typeof raw === 'object' &&
    isArquetipo((raw as Record<string, unknown>).preset)
  )
}

/**
 * Normaliza qualquer valor cru de `stores.theme` (null, v1 ou v2) num
 * `StoreThemeConfig` v2 válido. Defensivo: nunca lança.
 */
export function normalizeThemeConfig(raw: unknown): StoreThemeConfig {
  if (!raw || typeof raw !== 'object') {
    return { v: 2, preset: ARQUETIPO_FALLBACK }
  }
  const obj = raw as Record<string, unknown>

  // v2 — tem `preset` reconhecível.
  if (isArquetipo(obj.preset)) {
    return {
      v: 2,
      preset: obj.preset,
      palette: typeof obj.palette === 'string' ? obj.palette : undefined,
      color: (obj.color as StoreThemeConfig['color']) ?? undefined,
      fonts: (obj.fonts as StoreThemeConfig['fonts']) ?? undefined,
      shape: (obj.shape as StoreThemeConfig['shape']) ?? undefined,
      mode: obj.mode === 'dark' || obj.mode === 'light' ? obj.mode : undefined,
    }
  }

  // v1 — tem `template` legado.
  if (typeof obj.template === 'string') {
    return {
      v: 2,
      preset: V1_TEMPLATE_TO_ARQUETIPO[obj.template] ?? ARQUETIPO_FALLBACK,
    }
  }

  return { v: 2, preset: ARQUETIPO_FALLBACK }
}

/**
 * Resolve o valor persistido em `stores.theme` para os `ThemeTokens` completos,
 * em camadas: default do arquétipo → paleta curada (se houver) → overrides do
 * lojista → correção de contraste do `accentInk`. Esta é a ÚNICA porta de
 * entrada usada pelo storefront, pelo app e pelo preview do onboarding —
 * garante "o que vejo é o que publico".
 */
export function resolveTheme(raw: unknown): ThemeTokens {
  const config = normalizeThemeConfig(raw)
  const base = ARQUETIPOS[config.preset] ?? ARQUETIPOS[ARQUETIPO_FALLBACK]
  const t = base.tokens

  // Paleta curada do arquétipo — código desconhecido/ausente → original.
  const paleta = getPaleta(config.preset, config.palette)
  const color = { ...t.color, ...(paleta?.color ?? {}), ...(config.color ?? {}) }
  // accentInk sempre validado contra o accent final (preset ou override).
  color.accentInk = ensureAccentInk(color.accent, color.accentInk)

  const typography = {
    ...t.typography,
    display: config.fonts?.display
      ? { ...t.typography.display, family: config.fonts.display }
      : t.typography.display,
    body: config.fonts?.body
      ? { ...t.typography.body, family: config.fonts.body }
      : t.typography.body,
  }

  return {
    mode: config.mode ?? t.mode,
    color,
    typography,
    shape: { ...t.shape, ...(config.shape ?? {}) },
  }
}
