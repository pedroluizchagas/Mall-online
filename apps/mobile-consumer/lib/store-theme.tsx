import { createContext, useContext, type ReactNode } from 'react'
import { hasExplicitPreset, resolveTheme } from '@mallevo/lib'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Adaptador do StoreTheme (@mallevo/lib) para o mobile-consumer.
 *
 * O app é React Native — sem CSS vars. A pele da loja é entregue por um
 * contexto cujo VALOR tem exatamente a forma de `consumerDesign.colors`
 * (mais `accentInk`), para que componentes que já usam `colors.X` inline
 * passem a tematizar só trocando a ORIGEM de `colors` por `useStoreColors()`.
 *
 * Default do contexto = paleta Mallevo. Logo, qualquer componente fora de uma
 * loja (home/abas/checkout) — ou um compartilhado como <Botao> — renderiza
 * idêntico ao de hoje; só dentro de uma loja com preset v2 a pele muda.
 *
 * Ver docs/store-theme/04 §4.4 e 05.
 */

type ColorKeys = keyof typeof consumerDesign.colors
export type StoreColors = Record<ColorKeys, string> & { accentInk: string }

/** Paleta Mallevo padrão. `accentInk` = ink (texto escuro sobre o accent neon). */
export const MALLEVO_COLORS: StoreColors = {
  ...consumerDesign.colors,
  accentInk: consumerDesign.colors.ink,
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6) return hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Resolve o `stores.theme` para a paleta do mobile. Sem preset v2 explícito
 * (tema nulo ou legado v1) → paleta Mallevo intacta (zero regressão). Mantém
 * tokens neutros (surfaceDark do banner, inkSoft, white, info) fora do tema.
 */
export function colorsFromTheme(rawTheme: unknown): StoreColors {
  if (!hasExplicitPreset(rawTheme)) return MALLEVO_COLORS
  const t = resolveTheme(rawTheme)
  return {
    ...MALLEVO_COLORS,
    canvas: t.color.bg,
    canvasAlt: t.color.surfaceAlt,
    surface: t.color.surface,
    surfaceMuted: t.color.surfaceAlt,
    ink: t.color.ink,
    inkMuted: t.color.inkMuted,
    line: t.color.line,
    accent: t.color.accent,
    accentStrong: t.color.accent,
    accentSoft: hexToRgba(t.color.accent, 0.18),
    success: t.color.success,
    warning: t.color.warning,
    danger: t.color.danger,
    accentInk: t.color.accentInk,
  }
}

const StoreColorsContext = createContext<StoreColors>(MALLEVO_COLORS)

export function StoreColorsProvider({
  value,
  children,
}: {
  value: StoreColors
  children: ReactNode
}) {
  return (
    <StoreColorsContext.Provider value={value}>
      {children}
    </StoreColorsContext.Provider>
  )
}

/** Paleta ativa. Fora de um StoreColorsProvider → paleta Mallevo. */
export function useStoreColors(): StoreColors {
  return useContext(StoreColorsContext)
}
