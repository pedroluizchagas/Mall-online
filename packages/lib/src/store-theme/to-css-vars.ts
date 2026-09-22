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
  // Defensivo (achado A-02): escala desconhecida NÃO pode virar `undefined.sm`
  // — era isso que derrubava o `/preview` em 500 com `shape.radius:'nope'`.
  // Desde o `parseStoreTheme` o valor já chega saneado; isto é a segunda linha.
  const r = RADIUS_STEPS_PX[t.shape.radius] ?? RADIUS_STEPS_PX.soft
  const s = DENSITY_SPACE_PX[t.shape.density] ?? DENSITY_SPACE_PX.comfortable
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
    '--radius': RADIUS_PX[t.shape.radius] ?? RADIUS_PX.soft,
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

/**
 * Caracteres aceitos num VALOR de CSS var gerado por nós: letras, dígitos,
 * `#`, espaço, `,`, `.`, `%`, `(`, `)`, `-`, `_`, `/`, aspas simples e duplas.
 * De fora ficam os que quebram o contexto: `<`, `>`, `;`, `{`, `}`, `\`, `:` e
 * `@`. Cobre tudo o que os tokens produzem (`#RRGGBB`, `rgba(…)`, `20px`,
 * `"Plus Jakarta Sans", system-ui, sans-serif`, `1.05`).
 */
const RE_VALOR_CSS = /^[\w\s#,.%()/'"-]+$/

/**
 * `:root{--a:x;--b:y}` a partir das vars — com sanitização (achado A-01).
 *
 * O storefront injeta este texto num `<style dangerouslySetInnerHTML>`; era
 * por aqui que um `color.accent` hostil (`red}</style><script>…`) escapava do
 * CSS e virava HTML. O `parseStoreTheme` já barra na entrada; esta é a defesa
 * em profundidade, no ponto exato da concatenação: valor fora do alfabeto é
 * DESCARTADO (a var some e o CSS/Tailwind cai no fallback), nunca escapado
 * pela metade.
 */
export function textoCssDasVars(
  vars: Record<string, string>,
  seletor = ':root',
): string {
  const decl = Object.entries(vars)
    .filter(([k, v]) => /^--[\w-]+$/.test(k) && typeof v === 'string' && RE_VALOR_CSS.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  return `${seletor}{${decl}}`
}
