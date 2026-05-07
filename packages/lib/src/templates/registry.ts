import type { DashboardTemplate, TemplateCodigo } from './types'
import { templateFood } from './food'
import { templateFashion } from './fashion'
import { templatePharmacy } from './pharmacy'
import { templatePet } from './pet'
import { templateServices } from './services'
import { templateGeneric } from './generic'

/**
 * Registry imutável de todos os templates de dashboard.
 *
 * Adicionar um template novo: criar `<codigo>.ts`, importar acima e
 * incluir aqui. O `satisfies` garante que todos os 6 codigos do union
 * estejam mapeados.
 */
export const TEMPLATES = {
  food: templateFood,
  fashion: templateFashion,
  pharmacy: templatePharmacy,
  pet: templatePet,
  services: templateServices,
  generic: templateGeneric,
} as const satisfies Record<TemplateCodigo, DashboardTemplate>
