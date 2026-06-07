'use client'

import { createContext, createElement, useContext, type ReactNode } from 'react'
import { resolveTheme } from './resolve'
import { ARQUETIPOS, ARQUETIPO_FALLBACK } from './presets'
import type { ThemeTokens } from './types'

const StoreThemeContext = createContext<ThemeTokens | null>(null)

export interface StoreThemeProviderProps {
  /** Tokens já resolvidos (via `resolveTheme`) — preferível no web/SSR. */
  value?: ThemeTokens
  /** Alternativa: valor cru de `stores.theme`; é resolvido aqui (útil no RN). */
  theme?: unknown
  children: ReactNode
}

/**
 * Disponibiliza os tokens da loja para a subárvore. Compatível com Next.js
 * (web) e Expo/React Native (consumer) — mesmo padrão de templates/provider.tsx.
 *
 * Uso (mobile, ao entrar na loja):
 *   <StoreThemeProvider theme={loja.theme}>
 *     <TelaDaLoja />
 *   </StoreThemeProvider>
 */
export function StoreThemeProvider({
  value,
  theme,
  children,
}: StoreThemeProviderProps) {
  const tokens = value ?? resolveTheme(theme)
  return createElement(StoreThemeContext.Provider, { value: tokens }, children)
}

/**
 * Hook com os tokens da loja atual. Fora de um `StoreThemeProvider`, cai no
 * arquétipo neutro (`editorial`) — nunca lança, para não quebrar telas fora de
 * loja (home/abas) que importem componentes tematizados por engano.
 */
export function useStoreTheme(): ThemeTokens {
  const tokens = useContext(StoreThemeContext)
  return tokens ?? ARQUETIPOS[ARQUETIPO_FALLBACK].tokens
}
