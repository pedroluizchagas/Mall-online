import type { RadiusScale, ThemeTokens } from './types'

/** Raio base (px) por escala — consumido como `var(--radius)` no web. */
export const RADIUS_PX: Record<RadiusScale, string> = {
  sharp: '4px',
  soft: '12px',
  round: '20px',
}

/** `#rrggbb`/`#rgb` → `rgba(r,g,b,alpha)`. Hex inválido → a própria cor (sem alpha). */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.trim().replace(/^#/, '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
    '--accent-soft': hexToRgba(c.accent, 0.18),
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
