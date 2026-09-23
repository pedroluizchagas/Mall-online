import type { ProdutoCatalogo, ProdutoDetalhe } from '@/lib/catalog'

/**
 * Leituras do catálogo compartilhadas pelas 18 vitrines (R8) — eram 17
 * cópias de `precoFinalDe`, 4 de `exigeEscolha` e 3 de `repartirDescricao`,
 * cada uma livre para divergir num fix. Só cálculo puro: nada aqui renderiza
 * nem inventa dado.
 */

/** Preço de venda exibido: a promoção quando existe, senão o cheio. Em CENTAVOS. */
export function precoFinalDe(p: ProdutoCatalogo): number {
  return p.preco_promocional ?? p.preco
}

/**
 * O produto precisa passar pelo detalhe antes de entrar na sacola? Sim
 * quando tem variação ou modificador — a adição rápida do cartão abre o
 * `ProdutoModalHost` em vez de somar direto.
 */
export function exigeEscolha(detalhe: ProdutoDetalhe | undefined): boolean {
  if (!detalhe) return false
  return detalhe.optionGroups.length + detalhe.modifierGroups.length > 0
}

/**
 * Parte a descrição do lojista em manchete (a primeira frase, quando ela tem
 * tamanho de manchete) e o resto. Fora da faixa, não há manchete e o texto
 * inteiro vira detalhe — a vitrine nunca corta frase do lojista no meio.
 *
 * `maxManchete` muda por vitrine: a Passarela e a Feira aceitam até 64
 * caracteres; o Forno, que escreve em caixa alta, para em 54.
 */
export function repartirDescricao(
  descricao: string | null | undefined,
  { maxManchete = 64 }: { maxManchete?: number } = {},
): { manchete: string | null; detalhe: string | null } {
  const texto = descricao?.trim() ?? ''
  if (!texto) return { manchete: null, detalhe: null }

  const corte = texto.search(/[—.!?]/)
  const primeira = (corte === -1 ? texto : texto.slice(0, corte)).trim()
  if (primeira.length < 8 || primeira.length > maxManchete) {
    return { manchete: null, detalhe: texto }
  }
  const resto = corte === -1 ? '' : texto.slice(corte + 1).trim()
  return { manchete: primeira, detalhe: resto || null }
}
