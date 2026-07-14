import { DENSITY_SPACE_PX, RADIUS_STEPS_PX, TYPE_SCALE_FACTOR } from './scales'
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
 * O `tailwind.config.ts` aponta cores, raios, espaçamentos e tamanhos de
 * display para essas vars (ex.: `accent: 'var(--accent)'`,
 * `borderRadius.md: 'var(--radius-md, 20px)'`) — assim TODAS as famílias de
 * token (cor, forma, densidade, tipografia) têm efeito real na vitrine.
 */
export function toCssVars(t: ThemeTokens): Record<string, string> {
  const c = t.color
  const r = RADIUS_STEPS_PX[t.shape.radius]
  const s = DENSITY_SPACE_PX[t.shape.density]
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
    // Forma — escala completa de raios do arquétipo.
    '--radius': RADIUS_PX[t.shape.radius],
    '--radius-sm': `${r.sm}px`,
    '--radius-md': `${r.md}px`,
    '--radius-lg': `${r.lg}px`,
    '--radius-xl': `${r.xl}px`,
    '--radius-pill': `${r.pill}px`,
    // Densidade — ritmo de paddings/gaps.
    '--space-screen-x': `${s.screenX}px`,
    '--space-card': `${s.card}px`,
    '--space-section': `${s.section}px`,
    '--space-sheet': `${s.sheet}px`,
    // Tipografia — famílias + fator de escala dos títulos (display).
    '--font-display': t.typography.display.family,
    '--font-body': t.typography.body.family,
    '--type-factor': String(TYPE_SCALE_FACTOR[t.typography.scale]),
  }
}
