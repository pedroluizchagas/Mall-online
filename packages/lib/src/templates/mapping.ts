import type { DashboardTemplate, StoreParaTemplate, TemplateCodigo } from './types'
import { TEMPLATES } from './registry'

/**
 * Mapeamento canônico: slug de categoria → código do template.
 *
 * Fonte da verdade: docs/dashboard-templates/07-categorias-e-pisos.md.
 * As 20 categorias do seed (`apps/web/seed-categories.js`) precisam estar
 * presentes aqui. O `satisfies Record<string, TemplateCodigo>` garante que
 * só códigos válidos sejam usados.
 */
export const CATEGORIA_SLUG_TO_TEMPLATE = {
  'alimentos-bebidas': 'food',
  'vestuario-calcados': 'fashion',
  'acessorios-joias': 'fashion',
  'farmacia-medicamentos': 'pharmacy',
  'beleza-cosmeticos': 'generic',
  'saloes-estetica': 'services',
  'saude-bem-estar': 'services',
  'pet-shop': 'pet',
  'veterinaria': 'services',
  'eletronicos-tecnologia': 'generic',
  'casa-decoracao': 'generic',
  'construcao-ferramentas': 'generic',
  'papelaria-livraria': 'generic',
  'brinquedos-presentes': 'generic',
  'floricultura-plantas': 'generic',
  'automotivo': 'generic',
  'mercado-conveniencia': 'generic',
  'oficinas-manutencao': 'services',
  'aulas-cursos': 'services',
  'outros': 'generic',
} as const satisfies Record<string, TemplateCodigo>

export type CategoriaSlug = keyof typeof CATEGORIA_SLUG_TO_TEMPLATE

/**
 * Resolve o `DashboardTemplate` a partir do slug da categoria.
 * - `null`/`undefined` → fallback `generic` (loja sem categoria ainda).
 * - Slug não mapeado → fallback `generic` + warning (defesa em profundidade).
 */
export function getTemplateBySlug(
  slug: string | null | undefined,
): DashboardTemplate {
  if (!slug) {
    return TEMPLATES.generic
  }

  const codigo = (CATEGORIA_SLUG_TO_TEMPLATE as Record<string, TemplateCodigo>)[slug]
  if (!codigo) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `[templates] slug de categoria não mapeado: "${slug}". Usando template generic como fallback.`,
      )
    }
    return TEMPLATES.generic
  }

  return TEMPLATES[codigo]
}

/**
 * Resolve o template a partir de uma store enriquecida com a categoria.
 * Aceita tanto `categoria.slug` ausente quanto `categoria` null.
 */
export function getTemplateByStore(store: StoreParaTemplate): DashboardTemplate {
  return getTemplateBySlug(store.categoria?.slug ?? null)
}
