import type { ComponentType } from 'react'
import type { VitrineCodigo } from '@mallevo/lib'

import type { Store } from '@/lib/tenant'
import { resolveVitrineDaLoja } from '@/lib/vitrine'
import { VitrinePadrao } from './Padrao'
import type { VitrineWebProps } from './tipos'

export type { VitrineWebProps } from './tipos'
export { VitrinePadrao }

/**
 * Registro das vitrines web por código (`VITRINES` de @mallevo/lib). Vitrine
 * ausente aqui → a loja veste o layout padrão. As 15 vitrines do consumer
 * entram em ondas (plano de convergência, Fase 2b): alimentação e mercado,
 * depois moda e beleza, depois as demais.
 */
export const VITRINES_WEB: Partial<Record<VitrineCodigo, ComponentType<VitrineWebProps>>> = {}

/** O componente que esta loja veste: vitrine do arquétipo ou o padrão. */
export function escolherVitrineWeb(store: Store): ComponentType<VitrineWebProps> {
  const codigo = resolveVitrineDaLoja(store)
  return (codigo && VITRINES_WEB[codigo]) || VitrinePadrao
}
