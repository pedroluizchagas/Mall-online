/**
 * Pisos curatoriais do consumer (vitrine do app mobile).
 *
 * Fonte da verdade: docs/dashboard-templates/07-categorias-e-pisos.md.
 * Pisos são INDEPENDENTES de categoria-lojista — uma categoria pode
 * aparecer em múltiplos pisos (ex: Veterinária aparece em Saúde e Pet).
 * Editáveis livremente pela equipe; categorias-lojista são técnicas e
 * imutáveis em auto-serviço.
 */

export interface Piso {
  slug: string
  nome: string
  icone: string
  categoriasSlugs: readonly string[]
  ordem: number
}

export const PISOS: readonly Piso[] = [
  {
    slug: 'praca-alimentacao',
    nome: 'Praça de Alimentação',
    icone: '🍽️',
    ordem: 1,
    categoriasSlugs: ['alimentos-bebidas'],
  },
  {
    slug: 'moda-estilo',
    nome: 'Moda & Estilo',
    icone: '👗',
    ordem: 2,
    categoriasSlugs: ['vestuario-calcados', 'acessorios-joias'],
  },
  {
    slug: 'saude',
    nome: 'Saúde',
    icone: '❤️',
    ordem: 3,
    categoriasSlugs: ['farmacia-medicamentos', 'saude-bem-estar', 'veterinaria'],
  },
  {
    slug: 'beleza',
    nome: 'Beleza',
    icone: '💅',
    ordem: 4,
    categoriasSlugs: ['saloes-estetica', 'beleza-cosmeticos'],
  },
  {
    slug: 'pet',
    nome: 'Pet',
    icone: '🐾',
    ordem: 5,
    categoriasSlugs: ['pet-shop', 'veterinaria'],
  },
  {
    slug: 'casa-vida',
    nome: 'Casa & Vida',
    icone: '🏠',
    ordem: 6,
    categoriasSlugs: [
      'casa-decoracao',
      'construcao-ferramentas',
      'eletronicos-tecnologia',
      'floricultura-plantas',
      'automotivo',
    ],
  },
  {
    slug: 'mercado',
    nome: 'Mercado',
    icone: '🛒',
    ordem: 7,
    categoriasSlugs: ['mercado-conveniencia'],
  },
  {
    slug: 'servicos',
    nome: 'Serviços',
    icone: '🛠️',
    ordem: 8,
    categoriasSlugs: [
      'oficinas-manutencao',
      'aulas-cursos',
      'saloes-estetica',
      'saude-bem-estar',
    ],
  },
  {
    slug: 'presentes-diversao',
    nome: 'Presentes & Diversão',
    icone: '🎁',
    ordem: 9,
    categoriasSlugs: [
      'brinquedos-presentes',
      'papelaria-livraria',
      'floricultura-plantas',
    ],
  },
] as const

/**
 * Retorna todos os pisos que agregam a categoria informada.
 * Uma categoria pode aparecer em mais de um piso (curadoria).
 */
export function getPisosByCategoria(categoriaSlug: string): Piso[] {
  return PISOS.filter((p) => p.categoriasSlugs.includes(categoriaSlug))
}
