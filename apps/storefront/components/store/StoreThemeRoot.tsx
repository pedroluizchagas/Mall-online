import type { CSSProperties, ReactNode } from 'react'
import {
  googleFontsHref,
  hasExplicitPreset,
  resolveTheme,
  toCssVars,
} from '@mallevo/lib'

/**
 * Raiz tematizada da loja. Resolve o `stores.theme` para CSS custom properties
 * e as injeta no subtree — todos os componentes que usam classes Tailwind
 * (`bg-canvas`, `text-ink`, `bg-accent`, `font-display`, …) passam a respeitar
 * a pele da loja sem mudança de markup (ver docs/store-theme/04 §4.3, 05).
 *
 * Só sobrescreve quando a loja tem preset v2 EXPLÍCITO. Loja sem tema ou com
 * tema legado (v1) renderiza com a paleta/tipografia Mallevo padrão
 * (globals.css :root) — nenhuma loja em produção muda de aparência até optar
 * por um preset.
 *
 * Renderiza um `<main>` para preservar o landmark da página.
 */
export function StoreThemeRoot({
  theme,
  className,
  children,
}: {
  theme: unknown
  className?: string
  children: ReactNode
}) {
  const tokens = hasExplicitPreset(theme) ? resolveTheme(theme) : null

  if (!tokens) {
    return <main className={className}>{children}</main>
  }

  const vars = toCssVars(tokens)
  // Fontes do arquétipo: resolvidas para family + fallback de sistema. O
  // `<link>` carrega APENAS as famílias desta loja (eficiente por tenant),
  // não as 8 dos 11 arquétipos.
  vars['--font-display'] = `"${tokens.typography.display.family}", system-ui, sans-serif`
  vars['--font-body'] = `"${tokens.typography.body.family}", system-ui, sans-serif`

  const fontsHref = googleFontsHref(tokens)

  return (
    <main
      className={className}
      style={{ ...(vars as CSSProperties), fontFamily: 'var(--font-body)' }}
      data-theme={tokens.mode}
    >
      {fontsHref && (
        <>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {children}
    </main>
  )
}
