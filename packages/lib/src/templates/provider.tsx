'use client'

import { createContext, createElement, useContext, type ReactNode } from 'react'
import type { DashboardTemplate } from './types'
import { TEMPLATES } from './registry'

const TemplateContext = createContext<DashboardTemplate | null>(null)

export interface TemplateProviderProps {
  value: DashboardTemplate
  children: ReactNode
}

/**
 * Disponibiliza o template resolvido para a árvore de componentes.
 * Compatível com Next.js (web) e Expo/React Native (consumer).
 *
 * Uso:
 *   const template = getTemplateByStore(store)
 *   <TemplateProvider value={template}>
 *     <App />
 *   </TemplateProvider>
 */
export function TemplateProvider({ value, children }: TemplateProviderProps) {
  return createElement(TemplateContext.Provider, { value }, children)
}

/**
 * Hook que retorna o template atual. Lança se usado fora de
 * `TemplateProvider` (não fazemos fallback silencioso para evitar bugs).
 */
export function useTemplate(): DashboardTemplate {
  const template = useContext(TemplateContext)
  if (!template) {
    throw new Error(
      '[templates] useTemplate() chamado fora de <TemplateProvider>. ' +
        'Garanta que o layout do dashboard envolve a árvore com TemplateProvider.',
    )
  }
  return template
}

/**
 * Variante segura para chamadas em componentes opcionais — retorna o
 * template `generic` quando não há provider. Use com parcimônia.
 */
export function useTemplateOrGeneric(): DashboardTemplate {
  const template = useContext(TemplateContext)
  return template ?? TEMPLATES.generic
}
