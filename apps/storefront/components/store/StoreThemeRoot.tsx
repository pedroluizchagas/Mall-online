import type { ReactNode } from 'react'
import {
  googleFontsHref,
  hasExplicitPreset,
  resolveTheme,
  toCssVars,
} from '@mallevo/lib'

/**
 * Raiz tematizada da loja. Resolve o `stores.theme` para CSS custom properties
 * no `:root` do documento — todos os componentes que usam classes Tailwind
 * (`bg-canvas`, `text-ink`, `bg-accent`, `font-display`, …) passam a respeitar
 * a pele da loja sem mudança de markup (ver docs/store-theme/04 §4.3, 05).
 *
 * Por que `:root` e não um wrapper: o `body` (overscroll, área fora da coluna
 * central no desktop) e qualquer portal precisam da mesma pele. Montado UMA
 * vez no layout do grupo `(loja)`, cobre catálogo, produto, checkout, pedido
 * e auth — decisão de produto (2026-09-19): no storefront o checkout veste a
 * loja.
 *
 * Só sobrescreve quando a loja tem preset v2 EXPLÍCITO. Loja sem tema ou com
 * tema legado (v1) renderiza com a paleta/tipografia Mallevo padrão
 * (globals.css :root).
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
    return <div className={className}>{children}</div>
  }

  const vars = toCssVars(tokens)
  // Fontes do arquétipo: resolvidas para family + fallback de sistema. O
  // `<link>` carrega APENAS as famílias desta loja (eficiente por tenant),
  // não as 12 famílias dos 21 arquétipos.
  vars['--font-display'] = `"${tokens.typography.display.family}", system-ui, sans-serif`
  vars['--font-body'] = `"${tokens.typography.body.family}", system-ui, sans-serif`

  const css = `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`
  const fontsHref = googleFontsHref(tokens)

  return (
    <div className={className} data-theme={tokens.mode}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {fontsHref && (
        <>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {children}
    </div>
  )
}
