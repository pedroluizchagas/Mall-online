import type { RadiusScale, ThemeTokens } from './types'

/** Raio base (px) por escala — consumido como `var(--radius)` no web. */
export const RADIUS_PX: Record<RadiusScale, string> = {
  sharp: '4px',
  soft: '12px',
  round: '20px',
}

/**
 * Converte `ThemeTokens` em CSS custom properties para o storefront (web).
 * Aplicar no nível da loja: `<div style={toCssVars(tokens)} data-theme={tokens.mode}>`.
 * O `tailwind.config.ts` aponta as cores para essas vars (ex.: `accent: 'var(--accent)'`).
 */
export function toCssVars(t: ThemeTokens): Record<string, string> {
  const c = t.color
  return {
    '--bg': c.bg,
    '--surface': c.surface,
    '--surface-alt': c.surfaceAlt,
    '--ink': c.ink,
    '--ink-muted': c.inkMuted,
    '--line': c.line,
    '--accent': c.accent,
    '--accent-ink': c.accentInk,
    '--success': c.success,
    '--warning': c.warning,
    '--danger': c.danger,
    '--radius': RADIUS_PX[t.shape.radius],
    '--font-display': t.typography.display.family,
    '--font-body': t.typography.body.family,
    '--type-scale': t.typography.scale,
    '--density': t.shape.density,
  }
}
