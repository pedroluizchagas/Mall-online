import type { ComponentType } from 'react'
import type { VitrineCodigo } from '@mallevo/lib'

import type { Store } from '@/lib/tenant'
import { resolveVitrineDaLoja } from '@/lib/vitrine'
import { VitrinePadrao } from './Padrao'
import { VitrineEditorial } from './editorial/VitrineEditorial'
import { VitrineFeira } from './feira/VitrineFeira'
import { VitrineForno } from './forno/VitrineForno'
import { VitrineHorta } from './horta/VitrineHorta'
import { VitrineNoir } from './noir/VitrineNoir'
import { VitrinePassarela } from './passarela/VitrinePassarela'
import { VitrineRaw } from './raw/VitrineRaw'
import { VitrineSerena } from './serena/VitrineSerena'
import { VitrineRitual } from './ritual/VitrineRitual'
import { VitrineSmash } from './smash/VitrineSmash'
import { VitrineTorra } from './torra/VitrineTorra'
import { VitrineVolt } from './volt/VitrineVolt'
import type { VitrineWebProps } from './tipos'

export type { VitrineWebProps } from './tipos'
export { VitrinePadrao }

/**
 * Registro das vitrines web por código (`VITRINES` de @mallevo/lib). Vitrine
 * ausente aqui → a loja veste o layout padrão. As 15 vitrines do consumer
 * entram em ondas (plano de convergência, Fase 2b): alimentação e mercado,
 * depois moda e beleza, depois as demais.
 */
export const VITRINES_WEB: Partial<Record<VitrineCodigo, ComponentType<VitrineWebProps>>> = {
  // Onda 1 — alimentação e mercado
  forno: VitrineForno,
  smash: VitrineSmash,
  torra: VitrineTorra,
  noir: VitrineNoir,
  horta: VitrineHorta,
  ritual: VitrineRitual,
  feira: VitrineFeira,
  // Onda 2 — moda e beleza
  editorial: VitrineEditorial,
  passarela: VitrinePassarela,
  raw: VitrineRaw,
  volt: VitrineVolt,
  serena: VitrineSerena,
}

/** O componente que esta loja veste: vitrine do arquétipo ou o padrão. */
export function escolherVitrineWeb(store: Store): ComponentType<VitrineWebProps> {
  const codigo = resolveVitrineDaLoja(store)
  return (codigo && VITRINES_WEB[codigo]) || VitrinePadrao
}
