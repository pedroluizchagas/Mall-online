/**
 * Utilidades de contraste (WCAG 2.1) — sem dependências.
 * Usadas no resolve para garantir que o texto sobre `accent` seja legível,
 * mesmo quando o lojista sobrescreve cores com um override ruim.
 */

/** Converte `#rgb`/`#rrggbb` em [r,g,b] (0–255). Retorna null se inválido. */
function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** Luminância relativa (0–1) conforme WCAG. */
function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste entre duas cores hex (1–21). Inválidas → 1. */
export function contrastRatio(a: string, b: string): number {
  const ra = parseHex(a)
  const rb = parseHex(b)
  if (!ra || !rb) return 1
  const la = relativeLuminance(ra)
  const lb = relativeLuminance(rb)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Preto ou branco — o que tiver maior contraste sobre `bg`. */
export function pickInkOn(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#000000')
    ? '#FFFFFF'
    : '#000000'
}

/**
 * Garante texto legível sobre `accent`: mantém `candidate` se passar em AA
 * (>= 4.5); senão recalcula com preto/branco. Hex inválido → recalcula.
 */
export function ensureAccentInk(accent: string, candidate: string): string {
  if (parseHex(candidate) && contrastRatio(accent, candidate) >= 4.5) {
    return candidate
  }
  return pickInkOn(accent)
}
