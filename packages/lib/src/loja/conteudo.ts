/**
 * Conteúdo editorial da loja (`stores.conteudo` JSONB, v1).
 *
 * As vitrines precisam de voz — campanha do hero, manifesto da casa, fotos do
 * espaço, destaques escolhidos — e até aqui essa voz era texto fixo dentro dos
 * componentes ("Nova coleção", "A nova temporada chegou"). Este módulo dá ao
 * lojista o controle desse texto, com limites que cabem em qualquer vitrine.
 *
 * Toda vitrine, em toda superfície, lê via `normalizeStoreConteudo` e cai nos
 * seus fallbacks atuais quando um campo não vier — zero regressão para lojas
 * que nunca preencheram nada.
 */
import { z } from 'zod'

export const CONTEUDO_LIMITES = {
  eyebrow: 40,
  titulo: 80,
  subtitulo: 140,
  cta: 24,
  manifesto: 600,
  galeriaCasa: 8,
  destaques: 6,
} as const

const texto = (max: number) => z.string().trim().max(max)

export const campanhaSchema = z.object({
  /** Sobrelinha curta ("Nova coleção", "Só hoje"). */
  eyebrow: texto(CONTEUDO_LIMITES.eyebrow).optional(),
  titulo: texto(CONTEUDO_LIMITES.titulo).min(1),
  subtitulo: texto(CONTEUDO_LIMITES.subtitulo).optional(),
  /** Rótulo do botão do hero ("Ver cardápio"). */
  cta: texto(CONTEUDO_LIMITES.cta).optional(),
})

export const storeConteudoSchema = z.object({
  v: z.literal(1),
  campanha: campanhaSchema.optional(),
  /** Texto da casa — statement, manifesto, "sobre". */
  manifesto: texto(CONTEUDO_LIMITES.manifesto).optional(),
  /** Fotos do espaço/da casa (URLs públicas do bucket `store-assets`). */
  galeria_casa: z.array(z.string().url()).max(CONTEUDO_LIMITES.galeriaCasa).optional(),
  /** IDs de produtos que o lojista quer em destaque, na ordem. */
  destaques: z.array(z.string().uuid()).max(CONTEUDO_LIMITES.destaques).optional(),
})

export type StoreConteudo = z.infer<typeof storeConteudoSchema>
export type CampanhaLoja = z.infer<typeof campanhaSchema>

export const CONTEUDO_VAZIO: StoreConteudo = { v: 1 }

/**
 * JSON do banco → `StoreConteudo`. Nunca lança. Recupera campo a campo: um
 * campo inválido não descarta os demais (a campanha fica, mesmo se um id de
 * destaque veio corrompido).
 */
export function normalizeStoreConteudo(raw: unknown): StoreConteudo {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return CONTEUDO_VAZIO
  const inteiro = storeConteudoSchema.safeParse(raw)
  if (inteiro.success) return inteiro.data

  const obj = raw as Record<string, unknown>
  const out: StoreConteudo = { v: 1 }
  const campanha = campanhaSchema.safeParse(obj.campanha)
  if (campanha.success) out.campanha = campanha.data
  const manifesto = storeConteudoSchema.shape.manifesto.safeParse(obj.manifesto)
  if (manifesto.success && manifesto.data) out.manifesto = manifesto.data
  const galeria = storeConteudoSchema.shape.galeria_casa.safeParse(obj.galeria_casa)
  if (galeria.success && galeria.data) out.galeria_casa = galeria.data
  const destaques = storeConteudoSchema.shape.destaques.safeParse(obj.destaques)
  if (destaques.success && destaques.data) out.destaques = destaques.data
  return out
}

/** A loja preencheu algo além do envelope? */
export function hasConteudo(c: StoreConteudo): boolean {
  return Boolean(
    c.campanha ||
      c.manifesto ||
      (c.galeria_casa && c.galeria_casa.length > 0) ||
      (c.destaques && c.destaques.length > 0),
  )
}
