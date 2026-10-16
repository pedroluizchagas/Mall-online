import type { StatusPedido } from '@/lib/status-pedido'

/** Pedido como `getPedidos`/`getPedidoPorId` o devolvem (com os embeds). */
export interface PedidoCompleto {
  id: string
  status: StatusPedido
  payment_status?: string | null
  forma_pagamento: string
  subtotal: number
  taxa_entrega: number
  total: number
  platform_fee_amount?: number | null
  criado_em: string
  endereco_entrega: {
    rua?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
  } | null
  observacoes: string | null
  cancelado_em?: string | null
  motivo_cancelamento?: string | null
  tipo?: 'entrega' | 'agendamento' | null
  agendamento_inicio_at?: string | null
  agendamento_fim_at?: string | null
  staff_id?: string | null
  service_staff?: { id: string; nome: string; cor: string | null } | null
  consumers?: { id: string; nome: string; telefone: string | null } | null
  order_items?: Array<{
    id: string
    nome: string
    quantidade: number
    preco_unit: number
    subtotal: number
    observacoes?: string | null
    modifiers?: Array<{ modifier_id: string; nome: string; preco_extra: number }> | null
    variant_id?: string | null
    product_variants?: {
      product_variant_options?: Array<{
        product_options?: {
          valor: string | null
          product_option_groups?: { nome: string | null } | null
        } | null
      }> | null
    } | null
  }>
  delivery_assignments?: Array<{
    id?: string
    status?: string
    valor_entrega?: number
    couriers?: { id?: string; nome: string; telefone: string | null; foto_url?: string | null } | null
  }>
}

/** Os 6 primeiros caracteres do fim do id — o "número" do pedido. */
export function codigoDoPedido(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`
}

const PAGAMENTO: Record<string, string> = {
  online_pix: 'Pix online',
  online_cartao: 'Cartão online',
  dinheiro: 'Dinheiro',
  cartao_maquininha: 'Cartão na entrega',
}

export function rotuloPagamento(forma: string): string {
  return PAGAMENTO[forma] ?? forma
}

export function pagoOnline(forma: string): boolean {
  return forma === 'online_pix' || forma === 'online_cartao'
}

/** O que o lojista recebe: total − taxa de entrega (do entregador) − comissão. */
export function liquidoDoPedido(p: Pick<PedidoCompleto, 'total' | 'taxa_entrega' | 'platform_fee_amount'>): number {
  const comissao = Number(p.platform_fee_amount ?? 100)
  return Math.max(0, Number(p.total) - Number(p.taxa_entrega ?? 0) - comissao)
}

export function quantidadeDeItens(p: Pick<PedidoCompleto, 'order_items'>): number {
  return (p.order_items ?? []).reduce((s, it) => s + Number(it.quantidade ?? 1), 0)
}

const DIAS_CURTOS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "qui 15/10 às 19:00 — 20:00 (60 min)" para pedidos agendados. */
export function formatarAgendamento(inicioIso: string, fimIso: string | null): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const ini = new Date(inicioIso)
  const dia = ini.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
  const sem = DIAS_CURTOS_PT[new Date(ini.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay()]
  if (!fimIso) return `${sem} ${dia} às ${fmt(ini)}`
  const fim = new Date(fimIso)
  const duracao = Math.max(0, Math.round((fim.getTime() - ini.getTime()) / 60000))
  return `${sem} ${dia} às ${fmt(ini)} — ${fmt(fim)} (${duracao} min)`
}

/** "15 de out., 20:52" no relógio da loja. */
export function momentoDoPedido(iso: string): string {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `${data}, ${hora}`
}
