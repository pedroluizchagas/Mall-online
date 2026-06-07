import type { CSSProperties, ReactNode } from 'react'
import { hasExplicitPreset, resolveTheme, toCssVars } from '@mallevo/lib'

/**
 * Raiz tematizada da loja. Resolve o `stores.theme` para CSS custom properties
 * e as injeta no subtree — todos os componentes que usam classes Tailwind
 * (`bg-canvas`, `text-ink`, `bg-accent`, …) passam a respeitar a pele da loja
 * sem mudança de markup (ver docs/store-theme/04 §4.3, 05).
 *
 * Só sobrescreve quando a loja tem preset v2 EXPLÍCITO. Loja sem tema ou com
 * tema legado (v1) renderiza com a paleta Mallevo padrão (globals.css :root) —
 * nenhuma loja em produção muda de aparência até optar por um preset.
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

  return (
    <main
      className={className}
      style={tokens ? (toCssVars(tokens) as CSSProperties) : undefined}
      data-theme={tokens?.mode}
    >
      {children}
    </main>
  )
}
