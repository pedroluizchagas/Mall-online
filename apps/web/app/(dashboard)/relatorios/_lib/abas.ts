/** Abas do relatório (dashboard-redesign 04 §4.2) — persistidas em ?aba=. */
export type AbaRelatorio = 'visao-geral' | 'produtos' | 'pedidos' | 'clientes' | 'bairros'

export const ABAS_VALIDAS: AbaRelatorio[] = [
  'visao-geral',
  'produtos',
  'pedidos',
  'clientes',
  'bairros',
]

export const ROTULOS_ABA: Record<AbaRelatorio, string> = {
  'visao-geral': 'Visão geral',
  produtos: 'Produtos',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  bairros: 'Bairros',
}

export function abaValida(v: string | undefined): AbaRelatorio {
  return (ABAS_VALIDAS as string[]).includes(v ?? '') ? (v as AbaRelatorio) : 'visao-geral'
}
