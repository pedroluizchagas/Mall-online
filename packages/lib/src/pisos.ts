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

/** Piso pelo slug; `undefined` para slug desconhecido. */
export function getPiso(slug: string): Piso | undefined {
  return PISOS.find((p) => p.slug === slug)
}

/**
 * Fallback de piso: 'casa-vida' — o mais abrangente (decoração, eletrônicos,
 * ferramentas, plantas, automotivo) e o único que absorve a categoria
 * 'outros', que não pertence a piso nenhum. Loja sem categoria ou com slug
 * desconhecido aparece ali em vez de sumir do saguão.
 */
export const PISO_FALLBACK = 'casa-vida'

/**
 * O piso em que uma loja ENTRA — um só, o de menor `ordem` entre os que
 * agregam a categoria (veterinária está em Saúde e Pet, mas a loja aparece
 * uma vez, em Saúde). É a regra do home do consumer, agora compartilhada
 * com o saguão web.
 */
export function pisoDaCategoria(categoriaSlug: string | null | undefined): Piso {
  const candidatos = categoriaSlug ? getPisosByCategoria(categoriaSlug) : []
  const escolhido = [...candidatos].sort((a, b) => a.ordem - b.ordem)[0]
  return escolhido ?? (getPiso(PISO_FALLBACK) as Piso)
}

export interface CorredorDePiso<T> {
  piso: Piso
  itens: T[]
}

/**
 * Distribui lojas pelos pisos (cada uma em UM piso só), na ordem dos pisos,
 * devolvendo apenas os pisos com pelo menos uma loja — piso vazio não vira
 * corredor. Preserva a ordem de entrada dentro de cada piso.
 */
export function agruparPorPiso<T extends { categoria_slug: string | null }>(itens: T[]): CorredorDePiso<T>[] {
  const porSlug = new Map<string, T[]>()
  for (const item of itens) {
    const piso = pisoDaCategoria(item.categoria_slug)
    const lista = porSlug.get(piso.slug) ?? []
    lista.push(item)
    porSlug.set(piso.slug, lista)
  }
  return [...PISOS]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((p) => (porSlug.get(p.slug)?.length ?? 0) > 0)
    .map((piso) => ({ piso, itens: porSlug.get(piso.slug)! }))
}

// ─────────────────────────────────────────────────────────────
// Vocabulário dos pisos — o mesmo do consumer (Diretorio, SecaoLojas e
// FachadaLoja), compartilhado para o saguão web dizer as mesmas coisas.
// ─────────────────────────────────────────────────────────────

/** Nome curto para a placa do diretório ("Alimentação", não "Praça de Alimentação"). */
export const NOME_CURTO_POR_PISO: Record<string, string> = {
  'praca-alimentacao': 'Alimentação',
  'moda-estilo': 'Moda',
  saude: 'Saúde',
  beleza: 'Beleza',
  pet: 'Pet',
  'casa-vida': 'Casa & Vida',
  mercado: 'Mercado',
  servicos: 'Serviços',
  'presentes-diversao': 'Presentes',
}

/** Subtítulo do letreiro: o que o consumidor encontra no piso (curadoria, não andar). */
export const SUBTITULO_POR_PISO: Record<string, string> = {
  'praca-alimentacao': 'Restaurantes, lanches e cafés',
  'moda-estilo': 'Roupas, calçados e acessórios',
  saude: 'Farmácias, clínicas e bem-estar',
  beleza: 'Salões, estética e cosméticos',
  pet: 'Ração, acessórios e cuidados do pet',
  'casa-vida': 'Decoração, eletrônicos e ferramentas',
  mercado: 'Mercado, hortifrúti e conveniência',
  servicos: 'Oficinas, manutenção e cursos',
  'presentes-diversao': 'Brinquedos, papelaria e presentes',
}

export interface VozDoPiso {
  /** Rótulo da vitrine na fachada ("Frescos do dia"). */
  vitrine: string
  /** Link para o catálogo ("Cardápio"). */
  link: string
  /** Convite do CTA — verbos honestos: "Pedir agora" só onde se pede. */
  cta: string
}

export const VOZ_POR_PISO: Record<string, VozDoPiso> = {
  'praca-alimentacao': { vitrine: 'Frescos do dia', link: 'Cardápio', cta: 'Pedir agora' },
  'moda-estilo': { vitrine: 'Peças na vitrine', link: 'Entrar na loja', cta: 'Passear' },
  saude: { vitrine: 'Cuidados em destaque', link: 'Ver tudo', cta: 'Ver loja' },
  beleza: { vitrine: 'Rituais da casa', link: 'Ver tudo', cta: 'Ver loja' },
  pet: { vitrine: 'Para o seu pet', link: 'Ver tudo', cta: 'Pedir agora' },
  'casa-vida': { vitrine: 'Para a sua casa', link: 'Entrar na loja', cta: 'Passear' },
  mercado: { vitrine: 'Na cesta hoje', link: 'Ver tudo', cta: 'Pedir agora' },
  servicos: { vitrine: 'Serviços em destaque', link: 'Ver tudo', cta: 'Conhecer' },
  'presentes-diversao': { vitrine: 'Para presentear', link: 'Entrar na loja', cta: 'Passear' },
}

export const VOZ_PADRAO_PISO: VozDoPiso = { vitrine: 'Destaques da loja', link: 'Ver tudo', cta: 'Ver loja' }

/**
 * Nome de exibição das categorias globais (`categories` com tenant NULL,
 * migration 014 / seed) — as views públicas expõem só o slug, e o saguão é
 * anônimo. Slugs = `CATEGORIA_SLUG_TO_TEMPLATE`.
 */
export const NOME_POR_CATEGORIA: Record<string, string> = {
  'alimentos-bebidas': 'Alimentos e bebidas',
  'vestuario-calcados': 'Vestuário e calçados',
  'acessorios-joias': 'Acessórios e joias',
  'farmacia-medicamentos': 'Farmácia e medicamentos',
  'beleza-cosmeticos': 'Beleza e cosméticos',
  'saloes-estetica': 'Salões e estética',
  'saude-bem-estar': 'Saúde e bem-estar',
  'pet-shop': 'Pet shop',
  veterinaria: 'Veterinária',
  'eletronicos-tecnologia': 'Eletrônicos e tecnologia',
  'casa-decoracao': 'Casa e decoração',
  'construcao-ferramentas': 'Construção e ferramentas',
  'papelaria-livraria': 'Papelaria e livraria',
  'brinquedos-presentes': 'Brinquedos e presentes',
  'floricultura-plantas': 'Floricultura e plantas',
  automotivo: 'Automotivo',
  'mercado-conveniencia': 'Mercado e conveniência',
  'oficinas-manutencao': 'Oficinas e manutenção',
  'aulas-cursos': 'Aulas e cursos',
  outros: 'Outros',
}
