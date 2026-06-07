import type { CategoriaSlug } from '../templates/mapping'
import { ARQUETIPOS, ARQUETIPO_FALLBACK } from './presets'
import type { Archetype, ArquetipoCodigo, ArquetipoSugestao } from './types'

/**
 * Sugestão de PELE por categoria — `default` é o que o onboarding pré-seleciona;
 * `alternativas` são as peles compatíveis também oferecidas (modelo híbrido:
 * o lojista escolhe a aparência, mas dentro de um conjunto coerente).
 *
 * Fonte da verdade: docs/store-theme/02-arquetipos-de-design.md (§2.3).
 * As 20 categorias do seed precisam estar presentes — o `satisfies
 * Record<CategoriaSlug, ...>` garante cobertura total (zero lacunas).
 */
export const CATEGORIA_SLUG_TO_ARQUETIPO = {
  'alimentos-bebidas': { default: 'heritage', alternativas: ['market', 'soft'] },
  'vestuario-calcados': { default: 'editorial', alternativas: ['raw', 'noir'] },
  'acessorios-joias': { default: 'noir', alternativas: ['editorial'] },
  'farmacia-medicamentos': { default: 'clinic', alternativas: ['market'] },
  'beleza-cosmeticos': { default: 'editorial', alternativas: ['noir', 'soft'] },
  'saloes-estetica': { default: 'soft', alternativas: ['noir', 'editorial'] },
  'saude-bem-estar': { default: 'clinic', alternativas: ['soft'] },
  'pet-shop': { default: 'soft', alternativas: ['playful'] },
  veterinaria: { default: 'clinic', alternativas: ['soft'] },
  'eletronicos-tecnologia': { default: 'tech', alternativas: ['editorial'] },
  'casa-decoracao': { default: 'artisan', alternativas: ['editorial'] },
  'construcao-ferramentas': { default: 'utility', alternativas: ['market'] },
  'papelaria-livraria': { default: 'playful', alternativas: ['editorial'] },
  'brinquedos-presentes': { default: 'playful', alternativas: ['soft'] },
  'floricultura-plantas': { default: 'artisan', alternativas: ['soft', 'editorial'] },
  automotivo: { default: 'utility', alternativas: ['noir'] },
  'mercado-conveniencia': { default: 'market', alternativas: ['utility'] },
  'oficinas-manutencao': { default: 'utility', alternativas: ['market'] },
  'aulas-cursos': { default: 'editorial', alternativas: ['playful', 'soft'] },
  outros: { default: 'editorial', alternativas: ['market', 'soft'] },
} as const satisfies Record<CategoriaSlug, ArquetipoSugestao>

/**
 * Sugestão de pele a partir do slug da categoria.
 * - `null`/`undefined` ou slug desconhecido → fallback neutro `editorial`.
 */
export function getArquetipoSugestao(
  slug: string | null | undefined,
): ArquetipoSugestao {
  if (!slug) {
    return { default: ARQUETIPO_FALLBACK, alternativas: [] }
  }
  const sugestao = (
    CATEGORIA_SLUG_TO_ARQUETIPO as Record<string, ArquetipoSugestao>
  )[slug]
  return sugestao ?? { default: ARQUETIPO_FALLBACK, alternativas: [] }
}

/** Arquétipo default sugerido para uma categoria (atalho do onboarding). */
export function getDefaultArquetipo(
  slug: string | null | undefined,
): ArquetipoCodigo {
  return getArquetipoSugestao(slug).default
}

/**
 * Conjunto de peles oferecidas para uma categoria (default + alternativas),
 * já materializadas como `Archetype` para alimentar os cards de seleção.
 */
export function getArquetiposOferecidos(
  slug: string | null | undefined,
): Archetype[] {
  const { default: padrao, alternativas } = getArquetipoSugestao(slug)
  return [padrao, ...alternativas].map((codigo) => ARQUETIPOS[codigo])
}
