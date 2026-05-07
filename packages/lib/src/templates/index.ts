/**
 * Entrada pública dos Templates de Dashboard por Nicho.
 * Ver docs/dashboard-templates/ para o contrato completo.
 */
export type {
  CampoExtraDef,
  CampoExtraTipo,
  DashboardTemplate,
  StoreParaTemplate,
  TemplateCodigo,
  WizardStepDef,
  WizardStepTipo,
} from './types'

export { TEMPLATES } from './registry'
export {
  CATEGORIA_SLUG_TO_TEMPLATE,
  getTemplateBySlug,
  getTemplateByStore,
} from './mapping'
export type { CategoriaSlug } from './mapping'
export { getCampoExtra, isModuloHabilitado } from './helpers'
export {
  TemplateProvider,
  useTemplate,
  useTemplateOrGeneric,
} from './provider'
export type { TemplateProviderProps } from './provider'

export { templateFood } from './food'
export { templateFashion } from './fashion'
export { templatePharmacy } from './pharmacy'
export { templatePet } from './pet'
export { templateServices } from './services'
export { templateGeneric } from './generic'
