/**
 * Agregações puras dos Relatórios — fonte única consumida pelo Dashboard
 * (apps/web/app/(dashboard)/relatorios/page.tsx) e pelo Partner App
 * (apps/mobile-partner). Extraídas do page.tsx na entrada do app mobile
 * (docs/partner-app/07-stage-5-financeiro-relatorios.md: "nunca duplicar
 * a agregação"). Valores em centavos.
 */

export interface PedidoLinhaRelatorio {
  id: string
  status: string
  total: number
  subtotal: number | null
  taxa_entrega: number | null
  platform_fee_amount: number | null
  forma_pagamento: string | null
  tipo: string | null
  criado_em: string
  cancelado_em: string | null
  consumer_id: string | null
  endereco_entrega: { bairro?: string } | null
}

export interface ItemLinhaRelatorio {
  product_id: string | null
  nome: string
  quantidade: number
  subtotal: number
}

export interface ResumoMetricas {
  faturamentoBruto: number
  faturamentoLiquido: number
  pedidosConcluidos: number
  ticketMedio: number
}

export interface ItemDistribuicao {
  rotulo: string
  valor: number
}

export interface ProdutoAgregado {
  productId: string | null
  nome: string
  quantidade: number
  receita: number
}

export const STATUS_CONCLUIDO_RELATORIO = 'entregue'

export const ROTULOS_PAGAMENTO_RELATORIO: Record<string, string> = {
  pix: 'PIX',
  cartao: 'Cartão',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
}

export const ROTULOS_TIPO_RELATORIO: Record<string, string> = {
  entrega: 'Entrega',
  agendamento: 'Agendamento',
}

export function rotuloRelatorio(mapa: Record<string, string>, valor: string | null): string {
  if (!valor) return 'Não informado'
  return mapa[valor] ?? valor
}

export function calcularResumo(pedidos: PedidoLinhaRelatorio[]): ResumoMetricas {
  const concluidos = pedidos.filter(
    (p) => p.status === STATUS_CONCLUIDO_RELATORIO && p.cancelado_em === null
  )
  const bruto = concluidos.reduce((s, p) => s + (p.total ?? 0), 0)
  const liquido = concluidos.reduce(
    (s, p) => s + (p.total ?? 0) - (p.platform_fee_amount ?? 0) - (p.taxa_entrega ?? 0),
    0,
  )
  const count = concluidos.length
  return {
    faturamentoBruto: bruto,
    faturamentoLiquido: liquido,
    pedidosConcluidos: count,
    ticketMedio: count > 0 ? Math.round(bruto / count) : 0,
  }
}

export function distribuirPor<K extends string>(
  pedidos: PedidoLinhaRelatorio[],
  chave: (p: PedidoLinhaRelatorio) => K,
  rotulador: (k: K) => string,
): ItemDistribuicao[] {
  const mapa = new Map<K, number>()
  for (const p of pedidos) {
    const k = chave(p)
    mapa.set(k, (mapa.get(k) ?? 0) + 1)
  }
  return Array.from(mapa.entries()).map(([k, valor]) => ({ rotulo: rotulador(k), valor }))
}

export function agregarItens(itens: ItemLinhaRelatorio[]): Map<string, ProdutoAgregado> {
  const mapa = new Map<string, ProdutoAgregado>()
  for (const item of itens) {
    const chave = item.product_id ?? `nome:${item.nome}`
    const atual = mapa.get(chave) ?? {
      productId: item.product_id,
      nome: item.nome,
      quantidade: 0,
      receita: 0,
    }
    atual.quantidade += item.quantidade ?? 0
    atual.receita += item.subtotal ?? 0
    mapa.set(chave, atual)
  }
  return mapa
}
