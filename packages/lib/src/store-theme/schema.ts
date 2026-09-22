/**
 * Schema do `StoreThemeConfig` — o portão único por onde todo tema passa
 * antes de virar CSS.
 *
 * Por que existe (achado A-01 da auditoria de 2026-09-21): `resolveTheme`
 * espalhava `color`, `fonts` e `shape` CRUS do JSON para os `ThemeTokens`, e o
 * `StoreThemeRoot` do storefront concatena esses tokens num `<style>`. Um tema
 * com `color.accent = 'red}</style><script>…'` — vindo do `?draft=` do preview,
 * que é entrada do usuário — saía literal no HTML servido em
 * `<slug>.mallevo.com.br`. XSS refletido no domínio da loja.
 *
 * Regra R1 do plano: tema é entrada NÃO CONFIÁVEL, venha do banco ou da URL.
 * `hasExplicitPreset` (que só olha o `preset`) não é validação.
 *
 * Estratégia: recuperação campo a campo, como `normalizeStoreConteudo` faz com
 * `stores.conteudo`. Um override inválido é DESCARTADO (cai no default do
 * arquétipo) em vez de derrubar o tema inteiro — o lojista com um hex torto num
 * campo não perde a pele escolhida, e o payload hostil simplesmente não passa.
 */
import { z } from 'zod'

import { ARQUETIPOS } from './presets'
import type { ArquetipoCodigo, ColorTokens, StoreThemeConfig } from './types'

/** `#rgb` ou `#rrggbb`. É o que `hexToRgba`/CSS aceitam — nada mais entra. */
export const RE_HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Chaves de `ColorTokens` que o lojista pode sobrescrever. */
export const CHAVES_DE_COR = [
  'bg',
  'surface',
  'surfaceAlt',
  'ink',
  'inkMuted',
  'line',
  'accent',
  'accentInk',
  'success',
  'warning',
  'danger',
] as const satisfies readonly (keyof ColorTokens)[]

/**
 * Famílias de fonte aceitas em `fonts.display`/`fonts.body`: exatamente as que
 * os 21 arquétipos usam. Derivada da tabela — arquétipo novo entra sozinho, e
 * nome arbitrário (que iria para o `<link>` do Google Fonts e para a CSS var)
 * não entra nunca.
 */
export const FAMILIAS_DE_FONTE: readonly string[] = Object.freeze(
  [
    ...new Set(
      Object.values(ARQUETIPOS).flatMap((a) => [
        a.tokens.typography.display.family,
        a.tokens.typography.body.family,
      ]),
    ),
  ].sort(),
)

const FAMILIAS = new Set(FAMILIAS_DE_FONTE)

const hexSchema = z.string().regex(RE_HEX)
const presetSchema = z.string().refine((v): v is ArquetipoCodigo => v in ARQUETIPOS)
const fonteSchema = z.string().refine((v) => FAMILIAS.has(v), {
  message: 'família de fonte fora do catálogo dos arquétipos',
})

// Enums literais: `RadiusScale`/`DensityScale` dos types. Um teste de guarda
// (schema.test.ts) confere que continuam batendo com RADIUS_STEPS_PX e
// DENSITY_SPACE_PX — escala nova na lib sem entrar aqui quebra o teste.
const radiusSchema = z.enum(['sharp', 'soft', 'round'])
const densitySchema = z.enum(['compact', 'comfortable'])

/**
 * Forma persistida em `stores.theme` (v2). Cada campo é opcional e validado
 * isoladamente — ver `parseStoreTheme`, que faz a recuperação campo a campo.
 * Útil também para validar na ESCRITA (dashboard) antes de gravar.
 */
export const storeThemeConfigSchema = z.object({
  v: z.literal(2).optional(),
  preset: presetSchema,
  palette: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  color: z
    .object(
      Object.fromEntries(CHAVES_DE_COR.map((k) => [k, hexSchema.optional()])),
    )
    .optional(),
  fonts: z
    .object({ display: fonteSchema.optional(), body: fonteSchema.optional() })
    .optional(),
  shape: z
    .object({ radius: radiusSchema.optional(), density: densitySchema.optional() })
    .optional(),
  mode: z.enum(['light', 'dark']).optional(),
})

/**
 * Valida um `stores.theme` cru (ou um tema de rascunho vindo da URL) e devolve
 * um `StoreThemeConfig` seguro, ou `null` quando não há nem `preset` válido.
 *
 * Campo a campo: `color.accent` torto some e o resto do tema fica; `fonts.body`
 * fora do catálogo some; `shape.radius` desconhecido some (era isso que
 * derrubava o `/preview` em 500 — achado A-02). Nunca lança.
 */
export function parseStoreTheme(raw: unknown): StoreThemeConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>

  const preset = presetSchema.safeParse(obj.preset)
  if (!preset.success) return null

  const config: StoreThemeConfig = { v: 2, preset: preset.data }

  const palette = storeThemeConfigSchema.shape.palette.safeParse(obj.palette)
  if (palette.success && palette.data !== undefined) config.palette = palette.data

  // Cores: cada chave sozinha, para um hex torto não levar as outras junto.
  if (obj.color && typeof obj.color === 'object' && !Array.isArray(obj.color)) {
    const bruto = obj.color as Record<string, unknown>
    const cor: Partial<ColorTokens> = {}
    for (const chave of CHAVES_DE_COR) {
      const v = hexSchema.safeParse(bruto[chave])
      if (v.success) cor[chave] = v.data
    }
    if (Object.keys(cor).length > 0) config.color = cor
  }

  if (obj.fonts && typeof obj.fonts === 'object' && !Array.isArray(obj.fonts)) {
    const bruto = obj.fonts as Record<string, unknown>
    const fonts: { display?: string; body?: string } = {}
    const display = fonteSchema.safeParse(bruto.display)
    if (display.success) fonts.display = display.data
    const body = fonteSchema.safeParse(bruto.body)
    if (body.success) fonts.body = body.data
    if (fonts.display || fonts.body) config.fonts = fonts
  }

  if (obj.shape && typeof obj.shape === 'object' && !Array.isArray(obj.shape)) {
    const bruto = obj.shape as Record<string, unknown>
    const shape: NonNullable<StoreThemeConfig['shape']> = {}
    const radius = radiusSchema.safeParse(bruto.radius)
    if (radius.success) shape.radius = radius.data
    const density = densitySchema.safeParse(bruto.density)
    if (density.success) shape.density = density.data
    if (Object.keys(shape).length > 0) config.shape = shape
  }

  if (obj.mode === 'light' || obj.mode === 'dark') config.mode = obj.mode

  return config
}
