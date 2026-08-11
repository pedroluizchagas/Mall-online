import type { ThemeTokens } from './types'

/**
 * Monta a URL do Google Fonts css2 para as famílias display+body do tema,
 * deduplicando família e unindo os pesos. Retorna null se não houver família
 * a carregar.
 *
 * Consumidores web: `StoreThemeRoot` (storefront) e o preview do editor de
 * tema (dashboard) — carrega APENAS as famílias da loja/preset em questão,
 * não o conjunto inteiro de famílias do catálogo de arquétipos.
 */
export function googleFontsHref(tokens: ThemeTokens): string | null {
  const familias = new Map<string, Set<number>>()
  for (const spec of [tokens.typography.display, tokens.typography.body]) {
    const pesos = familias.get(spec.family) ?? new Set<number>()
    spec.weights.forEach((w) => pesos.add(w))
    familias.set(spec.family, pesos)
  }
  if (familias.size === 0) return null

  const partes = [...familias.entries()].map(([familia, pesos]) => {
    const wght = [...pesos].sort((a, b) => a - b).join(';')
    return `family=${familia.replace(/ /g, '+')}:wght@${wght}`
  })
  return `https://fonts.googleapis.com/css2?${partes.join('&')}&display=swap`
}
