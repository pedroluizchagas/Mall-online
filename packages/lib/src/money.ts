// Converter centavos para real formatado
export function formatarReais(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}

// Converter real para centavos (para armazenar no banco)
export function reaisParaCentavos(valor: number): number {
  return Math.round(valor * 100)
}

// Calcular taxa de antecipação
export function calcularTaxaAntecipacao(totalPedidos: number): number {
  return totalPedidos * 75 // R$0,75 em centavos por pedido
}
