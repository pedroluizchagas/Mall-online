import type { CampoExtraDef, DashboardTemplate } from './types'

type ModuloName = keyof DashboardTemplate['modulos']

/**
 * Indica se o módulo (rota/menu) está habilitado pelo template.
 * Uso típico: `if (isModuloHabilitado(template, 'agenda')) { ... }`.
 */
export function isModuloHabilitado(
  template: DashboardTemplate,
  modulo: ModuloName,
): boolean {
  return template.modulos[modulo] === true
}

/**
 * Busca a definição de um campo extra pelo código.
 * Retorna `undefined` se o template não declara esse campo.
 */
export function getCampoExtra(
  template: DashboardTemplate,
  codigo: string,
): CampoExtraDef | undefined {
  return template.produto.camposExtras.find((c) => c.codigo === codigo)
}
