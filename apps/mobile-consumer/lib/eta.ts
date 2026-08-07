/**
 * ETA da entrega em faixa (docs/31-logistica-de-entrega.md §5).
 *
 * A promessa ao consumidor é uma FAIXA, nunca um minuto exato: a estimativa
 * carrega o preparo da loja, o deslocamento e o handling de cada parada
 * anterior da rota — incerteza demais para fingir precisão de minuto.
 *
 * Em rota agrupada o consumidor vê o ETA do PRÓPRIO drop, não o da rota
 * inteira. É o que sustenta a proteção de experiência de docs/31 §4.3:
 * agrupar não pode piorar o que o cliente vê.
 */

export interface FaixaEta {
  texto: string
  /** Minutos até o limite superior — útil para ordenar/alertar. */
  minutosAte: number
}

const MINUTOS_HANDLING_POR_PARADA = 4

function formatarHora(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Faixa a partir do ETA calculado no servidor para a parada do pedido.
 * `larguraMin` é a folga aplicada dos dois lados da estimativa.
 */
export function faixaDeEta(eta: string | null | undefined, larguraMin = 7): FaixaEta | null {
  if (!eta) return null

  const alvo = new Date(eta)
  if (Number.isNaN(alvo.getTime())) return null

  const inicio = new Date(alvo.getTime() - larguraMin * 60_000)
  const fim = new Date(alvo.getTime() + larguraMin * 60_000)

  return {
    texto: `${formatarHora(inicio)} – ${formatarHora(fim)}`,
    minutosAte: Math.round((fim.getTime() - Date.now()) / 60_000),
  }
}

/**
 * Fallback quando o servidor ainda não calculou o ETA da parada: estima a
 * partir da duração da rota e da posição do drop na sequência.
 */
export function estimarFaixaPelaRota(params: {
  duracaoEstimadaS?: number | null
  ordemDoDrop?: number | null
  tempoPreparoMin?: number | null
}): FaixaEta | null {
  const { duracaoEstimadaS, ordemDoDrop, tempoPreparoMin } = params
  if (!duracaoEstimadaS) return null

  // ordem 0 é a coleta; o primeiro drop é 1. Cada parada anterior adiciona
  // o handling de entrega (tocar campainha, conferir código, retomar).
  const paradasAntes = Math.max(0, (ordemDoDrop ?? 1) - 1)

  const minutos =
    (tempoPreparoMin ?? 0) +
    duracaoEstimadaS / 60 +
    paradasAntes * MINUTOS_HANDLING_POR_PARADA

  const alvo = new Date(Date.now() + minutos * 60_000)
  return faixaDeEta(alvo.toISOString())
}

/** Rótulo da posição do pedido numa rota agrupada. */
export function rotuloPosicaoNaRota(
  ordemDoDrop?: number | null,
  totalDrops?: number | null,
): string | null {
  if (!totalDrops || totalDrops <= 1 || !ordemDoDrop) return null
  if (ordemDoDrop === 1) return 'Você é a primeira entrega da rota'
  if (ordemDoDrop === totalDrops) return `Você é a última de ${totalDrops} entregas`
  return `Entrega ${ordemDoDrop} de ${totalDrops} na rota`
}
