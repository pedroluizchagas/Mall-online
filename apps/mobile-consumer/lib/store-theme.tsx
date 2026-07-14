import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  DENSITY_SPACE_PX,
  RADIUS_STEPS_PX,
  TYPE_SCALE_FACTOR,
  hasExplicitPreset,
  resolveTheme,
  type DensitySpace,
  type FontSpec,
  type RadiusSteps,
  type ThemeTokens,
} from '@mallevo/lib'
import { consumerDesign } from '@/lib/consumer-design'
import { useThemeFonts } from '@/lib/store-fonts'

/**
 * Adaptador do StoreTheme (@mallevo/lib) para o mobile-consumer.
 *
 * O app é React Native — sem CSS vars. A pele da loja é entregue por um
 * contexto `StoreDesign` com TODAS as famílias de token:
 * - `colors`: exatamente a forma de `consumerDesign.colors` (+ `accentInk`),
 *   para que componentes que já usam `colors.X` inline tematizem só trocando
 *   a ORIGEM de `colors` por `useStoreColors()`;
 * - `radius`/`spacing`: escalas numéricas do arquétipo (RADIUS_STEPS_PX /
 *   DENSITY_SPACE_PX — as MESMAS consumidas pelo storefront via CSS vars);
 * - `display`/`body` + `typeFactor`: tipografia do arquétipo (fontes
 *   carregadas por `useThemeFonts`; null → sistema).
 *
 * Default do contexto = design Mallevo (paleta atual + radius/spacing de
 * consumer-design + fontes de sistema). Logo, qualquer componente fora de uma
 * loja (home/abas/checkout) — ou um compartilhado como <Botao> — renderiza
 * idêntico ao de hoje; só dentro de uma loja com preset v2 a pele muda.
 *
 * Ver docs/store-theme/04 §4.4 e 05.
 */

type ColorKeys = keyof typeof consumerDesign.colors
export type StoreColors = Record<ColorKeys, string> & { accentInk: string }

export interface StoreDesign {
  colors: StoreColors
  radius: RadiusSteps
  spacing: DensitySpace
  /** Multiplicador dos tamanhos de display (títulos). Corpo não escala. */
  typeFactor: number
  /** Fontes do arquétipo já carregadas; null → tipografia de sistema. */
  display: FontSpec | null
  body: FontSpec | null
}

/** Paleta Mallevo padrão. `accentInk` = ink (texto escuro sobre o accent neon). */
export const MALLEVO_COLORS: StoreColors = {
  ...consumerDesign.colors,
  accentInk: consumerDesign.colors.ink,
}

/** Design Mallevo padrão — idêntico ao comportamento pré-tema. */
export const MALLEVO_DESIGN: StoreDesign = {
  colors: MALLEVO_COLORS,
  radius: { ...consumerDesign.radius },
  // comfortable == ritmo atual do app (gutter 24, card 16, seção 16, sheet 20).
  spacing: DENSITY_SPACE_PX.comfortable,
  typeFactor: 1,
  display: null,
  body: null,
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

function colorsFromTokens(t: ThemeTokens): StoreColors {
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

/**
 * Resolve o `stores.theme` para a paleta do mobile. Sem preset v2 explícito
 * (tema nulo ou legado v1) → paleta Mallevo intacta (zero regressão). Mantém
 * tokens neutros (surfaceDark do banner, inkSoft, white, info) fora do tema.
 */
export function colorsFromTheme(rawTheme: unknown): StoreColors {
  if (!hasExplicitPreset(rawTheme)) return MALLEVO_COLORS
  return colorsFromTokens(resolveTheme(rawTheme))
}

/**
 * Resolve o `stores.theme` para o design completo do mobile (cores + forma +
 * densidade + tipografia), carregando as fontes do arquétipo em background.
 * Enquanto as fontes não chegam, `display`/`body` ficam null (sistema) — o
 * resto da pele aplica de imediato.
 */
export function useStoreDesignFromTheme(rawTheme: unknown): StoreDesign {
  const tokens = useMemo(
    () => (hasExplicitPreset(rawTheme) ? resolveTheme(rawTheme) : null),
    [rawTheme],
  )
  const fontesProntas = useThemeFonts(tokens)

  return useMemo(() => {
    if (!tokens) return MALLEVO_DESIGN
    return {
      colors: colorsFromTokens(tokens),
      radius: RADIUS_STEPS_PX[tokens.shape.radius],
      spacing: DENSITY_SPACE_PX[tokens.shape.density],
      typeFactor: TYPE_SCALE_FACTOR[tokens.typography.scale],
      display: fontesProntas ? tokens.typography.display : null,
      body: fontesProntas ? tokens.typography.body : null,
    }
  }, [tokens, fontesProntas])
}

const StoreDesignContext = createContext<StoreDesign>(MALLEVO_DESIGN)

export function StoreDesignProvider({
  value,
  children,
}: {
  value: StoreDesign
  children: ReactNode
}) {
  return (
    <StoreDesignContext.Provider value={value}>
      {children}
    </StoreDesignContext.Provider>
  )
}

/** Design ativo. Fora de um StoreDesignProvider → design Mallevo. */
export function useStoreDesign(): StoreDesign {
  return useContext(StoreDesignContext)
}

/** Paleta ativa (atalho compatível). Fora de loja → paleta Mallevo. */
export function useStoreColors(): StoreColors {
  return useStoreDesign().colors
}
