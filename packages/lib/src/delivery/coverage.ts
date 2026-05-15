// ============================================================
// Entrega / cobertura — regras PURAS compartilhadas (D4)
// Referência: docs/storefront/01-arquitetura-e-decisoes.md D4
//             docs/storefront/02-stage-0-preflight.md 0c.1
//
// Funções puras (sem React Native / sem I/O), consumidas por
// mobile-consumer e (futuramente) storefront. Valores monetários
// em CENTAVOS (consistente com stores.taxa_entrega / products.preco).
//
// Modelo atual extraído de apps/mobile-consumer:
//  - Modalidade: 'agendamento' (serviço, sem entrega), 'entrega'
//    (delivery com endereço) ou 'retirada' (sem taxa).
//  - taxa_entrega: taxa fixa da loja; ZERO quando agendamento ou
//    retirada (não há cálculo por distância/raio hoje — ver TODO).
//  - platform_fee_amount: fixo (PLATFORM_FEE_PADRAO).
// ============================================================

/** Taxa da plataforma por pedido, em centavos (valor fixo atual). */
export const PLATFORM_FEE_PADRAO = 100

export type ModalidadeEntrega = 'entrega' | 'retirada' | 'agendamento'

export interface ContextoEntrega {
  /** Carrinho contém pelo menos um item com agendamento (serviço). */
  temAgendamento: boolean
  /** Cliente optou por retirar no local (sem entrega). */
  retiradaNoLocal?: boolean
}

/**
 * Decide a modalidade do pedido a partir do contexto do carrinho.
 * Agendamento (serviço) tem precedência: nunca há entrega.
 */
export function resolverModalidade(ctx: ContextoEntrega): ModalidadeEntrega {
  if (ctx.temAgendamento) return 'agendamento'
  if (ctx.retiradaNoLocal) return 'retirada'
  return 'entrega'
}

/** True quando o pedido exige endereço de entrega. */
export function exigeEnderecoEntrega(ctx: ContextoEntrega): boolean {
  return resolverModalidade(ctx) === 'entrega'
}

/**
 * Calcula a taxa de entrega (centavos) para o pedido.
 * Só há taxa na modalidade 'entrega'; agendamento e retirada = 0.
 */
export function calcularTaxaEntrega(
  ctx: ContextoEntrega,
  taxaEntregaLoja: number
): number {
  return resolverModalidade(ctx) === 'entrega' ? taxaEntregaLoja : 0
}

/** Taxa da plataforma (centavos) cobrada por pedido. */
export function calcularPlatformFee(): number {
  return PLATFORM_FEE_PADRAO
}

/**
 * Total do pedido (centavos) = subtotal + taxa de entrega aplicável.
 * Em agendamento/retirada não há taxa, então total = subtotal.
 */
export function calcularTotalPedido(
  ctx: ContextoEntrega,
  subtotal: number,
  taxaEntregaLoja: number
): number {
  return subtotal + calcularTaxaEntrega(ctx, taxaEntregaLoja)
}

// TODO(storefront/D4): cobertura geográfica real. Hoje a taxa é um
// valor fixo por loja (stores.taxa_entrega); stores.raio_entrega_km
// existe no schema mas NÃO é usado em apps/mobile-consumer/app/checkout.tsx
// nem no useCartStore. Quando houver cálculo por distância/cidade
// ("essa venda é entregável pela Mallevo?"), a regra de cobertura
// (lat/long da loja x endereço, raio_entrega_km) entra aqui como
// função pura — fora do escopo do Stage 0.
