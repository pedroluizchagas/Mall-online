import { googleFontsHref, hasExplicitPreset, resolveTheme } from '@mallevo/lib'

/**
 * As fontes de display/corpo das lojas que estão na página, carregadas UMA
 * vez cada (fachadas de peles diferentes pedem famílias diferentes). O
 * mesmo `googleFontsHref` do `StoreThemeRoot`, deduplicado.
 */
export function FontesDasLojas({ themes }: { themes: unknown[] }) {
  const hrefs = new Set<string>()
  for (const theme of themes) {
    if (!hasExplicitPreset(theme)) continue
    const href = googleFontsHref(resolveTheme(theme))
    if (href) hrefs.add(href)
  }
  if (hrefs.size === 0) return null
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {[...hrefs].map((href) => (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  )
}
