/**
 * Status da plataforma vistos pela administração — fonte única de rótulo e
 * tom (o mesmo vocabulário que o painel web mostra ao lojista em Minha conta
 * e em Recebimentos). Badge, filtro e fila da marquise leem daqui; nenhuma
 * tela redefine cor de status.
 */

/** `vazio` = a ausência (sem assinatura): mais apagado que o neutro. */
export type Tom = 'ok' | 'aviso' | 'perigo' | 'info' | 'neutro' | 'vazio'

/** Soft 18% + texto no tom (folha); `vivo` = o tom aceso, para a marquise. */
export const CORES_TOM: Record<Tom, { texto: string; fundo: string; vivo: string }> = {
  ok: { texto: 'var(--ok)', fundo: 'var(--ok-lt)', vivo: 'var(--ok-vivo)' },
  aviso: { texto: 'var(--warn)', fundo: 'var(--warn-lt)', vivo: 'var(--warn-vivo)' },
  perigo: { texto: 'var(--err)', fundo: 'var(--err-lt)', vivo: 'var(--err-vivo)' },
  info: { texto: 'var(--sky)', fundo: 'var(--sky-lt)', vivo: 'var(--sky-vivo)' },
  neutro: { texto: 'var(--ink-2)', fundo: 'var(--bg-2)', vivo: 'rgba(255, 255, 255, 0.35)' },
  vazio: { texto: 'var(--ink-4)', fundo: 'var(--bg-2)', vivo: 'rgba(255, 255, 255, 0.2)' },
}

export interface MetaStatus {
  rotulo: string
  tom: Tom
}

/** `tenant_subscriptions.billing_status` (Stripe Billing). */
export const STATUS_ASSINATURA: Record<string, MetaStatus> = {
  trial: { rotulo: 'Em teste', tom: 'info' },
  ativa: { rotulo: 'Ativa', tom: 'ok' },
  em_atraso: { rotulo: 'Em atraso', tom: 'aviso' },
  cancelada: { rotulo: 'Cancelada', tom: 'perigo' },
  suspensa: { rotulo: 'Suspensa', tom: 'neutro' },
}

/** `pagarme_onboarding_status` (KYC do recebedor no Pagar.me). */
export const STATUS_RECEBIMENTOS: Record<string, MetaStatus> = {
  active: { rotulo: 'Verificado', tom: 'ok' },
  pending: { rotulo: 'Em verificação', tom: 'aviso' },
  registration: { rotulo: 'Em cadastro', tom: 'aviso' },
  affiliation: { rotulo: 'Em afiliação', tom: 'aviso' },
  refused: { rotulo: 'Recusado', tom: 'perigo' },
  blocked: { rotulo: 'Bloqueado', tom: 'perigo' },
  suspended: { rotulo: 'Suspenso', tom: 'perigo' },
  inactive: { rotulo: 'Inativo', tom: 'neutro' },
}

/**
 * Os filtros de recebimentos agrupam os status pelo que pedem da
 * administração: nada (verificado), paciência (em andamento) ou ação (com
 * problema). O badge de cada lojista continua mostrando o status exato.
 */
export const GRUPOS_RECEBIMENTOS = {
  verificado: { rotulo: 'Verificado', status: ['active'] },
  em_andamento: { rotulo: 'Em andamento', status: ['registration', 'pending', 'affiliation'] },
  com_problema: { rotulo: 'Com problema', status: ['refused', 'blocked', 'suspended'] },
  inativo: { rotulo: 'Inativo', status: ['inactive'] },
} as const

export type GrupoRecebimentos = keyof typeof GRUPOS_RECEBIMENTOS

export function grupoDosRecebimentos(status: string | null | undefined): GrupoRecebimentos {
  for (const [grupo, def] of Object.entries(GRUPOS_RECEBIMENTOS) as [GrupoRecebimentos, { status: readonly string[] }][]) {
    if (status && def.status.includes(status)) return grupo
  }
  return 'em_andamento'
}

/** `orders.forma_pagamento` (os mesmos rótulos do pedido no painel web). */
export const FORMA_PAGAMENTO: Record<string, string> = {
  online_pix: 'Pix online',
  online_cartao: 'Cartão online',
  dinheiro: 'Dinheiro',
  cartao_maquininha: 'Cartão na entrega',
}

/** `couriers.status`. */
export const STATUS_ENTREGADOR: Record<string, MetaStatus> = {
  pendente: { rotulo: 'Pendente', tom: 'aviso' },
  aprovado: { rotulo: 'Aprovado', tom: 'ok' },
  reprovado: { rotulo: 'Reprovado', tom: 'perigo' },
  suspenso: { rotulo: 'Suspenso', tom: 'neutro' },
}

export const TIPO_ENTREGADOR: Record<string, string> = {
  autonomo: 'Autônomo',
  proprio: 'Da loja',
}

/** `couriers.veiculo` (enum novo) — `veiculo_tipo` é o texto antigo. */
export const VEICULO: Record<string, string> = {
  a_pe: 'A pé',
  bicicleta: 'Bicicleta',
  moto: 'Moto',
  carro: 'Carro',
  utilitario: 'Utilitário',
}

function meta(tabela: Record<string, MetaStatus>, status: string | null | undefined, vazio: string): MetaStatus {
  if (!status) return { rotulo: vazio, tom: 'vazio' }
  return tabela[status] ?? { rotulo: status, tom: 'neutro' }
}

export const metaAssinatura = (s: string | null | undefined) => meta(STATUS_ASSINATURA, s, 'Sem assinatura')
export const metaRecebimentos = (s: string | null | undefined) => meta(STATUS_RECEBIMENTOS, s, 'Não iniciado')
export const metaEntregador = (s: string | null | undefined) => meta(STATUS_ENTREGADOR, s, 'Sem status')

/** "Moto · ABC1D23" — o veículo como o entregador cadastrou. */
export function rotuloVeiculo(veiculo: string | null, veiculoTipo: string | null, placa: string | null): string {
  const tipo = (veiculo && VEICULO[veiculo]) || (veiculoTipo ? VEICULO[veiculoTipo] ?? veiculoTipo.replace(/_/g, ' ') : null)
  if (!tipo) return 'Veículo não informado'
  return placa ? `${tipo} · ${placa}` : tipo
}
