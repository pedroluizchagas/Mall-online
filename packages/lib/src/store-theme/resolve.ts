import { ensureAccentInk } from './contrast'
import { getPaleta } from './palettes'
import { ARQUETIPOS, ARQUETIPO_FALLBACK } from './presets'
import { parseStoreTheme } from './schema'
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

/** O `preset` escolhido pelo lojista, ou `null` (tema nulo/v1). Para gates. */
export function getPresetExplicito(raw: unknown): ArquetipoCodigo | null {
  return hasExplicitPreset(raw)
    ? ((raw as Record<string, unknown>).preset as ArquetipoCodigo)
    : null
}

/**
 * Normaliza qualquer valor cru de `stores.theme` (null, v1 ou v2) num
 * `StoreThemeConfig` v2 válido. Defensivo: nunca lança.
 *
 * Desde 2026-09-22 (achado A-01) a parte v2 passa pelo `parseStoreTheme`:
 * `color`, `fonts` e `shape` são validados campo a campo em vez de seguirem
 * crus para os tokens e, daí, para o `<style>` do storefront. Este é o ÚNICO
 * portão — banco e rascunho do preview entram pela mesma porta.
 */
export function normalizeThemeConfig(raw: unknown): StoreThemeConfig {
  const v2 = parseStoreTheme(raw)
  if (v2) return v2

  // v1 — tem `template` legado.
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    if (typeof obj.template === 'string') {
      return {
        v: 2,
        preset: V1_TEMPLATE_TO_ARQUETIPO[obj.template] ?? ARQUETIPO_FALLBACK,
      }
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
