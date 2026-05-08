'use client'

import { useState, useTransition } from 'react'
import { formatarReais } from '@mallora/lib'
import { atualizarStatusPedido } from '@/lib/actions/pedidos'
import { ModalAtribuirEntregador } from './modal-atribuir-entregador'
import Link from 'next/link'

const LABELS_STATUS: Record<string, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  em_preparo: 'Em preparo',
  aguardando_entregador: 'Aguardando entregador',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const CORES_STATUS: Record<string, { bg: string; color: string }> = {
  novo: { bg: '#fef3c7', color: '#92400e' },
  confirmado: { bg: '#dbeafe', color: '#1e40af' },
  em_preparo: { bg: '#ede9fe', color: '#5b21b6' },
  aguardando_entregador: { bg: '#ffedd5', color: '#9a3412' },
  saiu_para_entrega: { bg: '#cffafe', color: '#155e75' },
  entregue: { bg: '#dcfce7', color: '#166534' },
  cancelado: { bg: '#fee2e2', color: '#991b1b' },
}

function rotuloVariantDoItem(item: any): string | null {
  const refs = item?.product_variants?.product_variant_options
  if (!Array.isArray(refs) || refs.length === 0) return null
  const valores = refs
    .map((vo: any) => vo?.product_options?.valor)
    .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
  return valores.length > 0 ? valores.join(' × ') : null
}

const DIAS_CURTOS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function formatarRangeAgendamento(inicioIso: string, fimIso: string | null): string {
  const ini = new Date(inicioIso)
  const dia = String(ini.getDate()).padStart(2, '0')
  const mes = String(ini.getMonth() + 1).padStart(2, '0')
  const sem = DIAS_CURTOS_PT[ini.getDay()]
  const horaIni = `${String(ini.getHours()).padStart(2, '0')}:${String(ini.getMinutes()).padStart(2, '0')}`
  if (!fimIso) return `${sem} ${dia}/${mes} às ${horaIni}`
  const fim = new Date(fimIso)
  const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`
  const duracao = Math.max(0, Math.round((fim.getTime() - ini.getTime()) / 60000))
  return `${sem} ${dia}/${mes} às ${horaIni} — ${horaFim} (${duracao} min)`
}

const PROXIMAS_ACOES: Record<string, { label: string; status: string }[]> = {
  novo: [
    { label: 'Confirmar pedido', status: 'confirmado' },
    { label: 'Cancelar', status: 'cancelado' },
  ],
  confirmado: [
    { label: 'Iniciar preparo', status: 'em_preparo' },
    { label: 'Cancelar', status: 'cancelado' },
  ],
  em_preparo: [{ label: 'Cancelar', status: 'cancelado' }],
  aguardando_entregador: [{ label: 'Cancelar', status: 'cancelado' }],
  saiu_para_entrega: [],
  entregue: [],
  cancelado: [],
}

export function PedidoCard({
  pedido,
  expandidoInicial,
}: {
  pedido: any
  expandidoInicial?: boolean
}) {
  const [expandido, setExpandido] = useState(expandidoInicial ?? pedido.status === 'novo')
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const acoes = PROXIMAS_ACOES[pedido.status] ?? []
  const horario = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const corStatus = CORES_STATUS[pedido.status]

  function handleAcao(status: string) {
    setErro(null)
    startTransition(() => {
      void atualizarStatusPedido(pedido.id, status as any).then((resultado) => {
        if (resultado.erro) setErro(resultado.erro)
      })
    })
  }

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: 'var(--bg)',
        border: pedido.status === 'novo'
          ? '1px solid var(--warn)'
          : '1px solid var(--line)',
      }}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpandido(!expandido)}
      >
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/pedidos/${pedido.id}`}
              className="font-semibold text-ink hover:text-brick-dk transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              #{pedido.id.slice(-6).toUpperCase()}
            </Link>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={corStatus}
            >
              {LABELS_STATUS[pedido.status]}
            </span>
          </div>
          <p className="text-sm text-ink-3 mt-0.5">
            {pedido.consumers?.nome} — {horario}
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold text-ink">{formatarReais(pedido.total)}</p>
          <p className="text-xs text-ink-3">
            {pedido.forma_pagamento === 'online_cartao' && 'Cartão online'}
            {pedido.forma_pagamento === 'online_pix' && 'PIX'}
            {pedido.forma_pagamento === 'dinheiro' && 'Dinheiro'}
            {pedido.forma_pagamento === 'cartao_maquininha' && 'Cartão na entrega'}
          </p>
        </div>
      </div>

      {expandido && (
        <div
          className="px-4 pb-4 space-y-4 pt-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {erro}
            </p>
          )}

          {pedido.tipo === 'agendamento' && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">
                📅 Agendamento
              </p>
              <p className="text-sm text-ink font-medium">
                {formatarRangeAgendamento(
                  pedido.agendamento_inicio_at,
                  pedido.agendamento_fim_at,
                )}
              </p>
              {pedido.service_staff?.nome && (
                <p className="text-sm text-ink-2 mt-1">
                  👤 Profissional: {pedido.service_staff.nome}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Itens</p>
            <div className="space-y-1">
              {pedido.order_items?.map((item: any) => {
                const modifiers = (item.modifiers ?? []) as Array<{
                  modifier_id: string
                  nome: string
                  preco_extra: number
                }>
                const rotuloVariant = rotuloVariantDoItem(item)
                return (
                  <div key={item.id} className="flex justify-between text-sm gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-ink">
                        {item.quantidade}x {item.nome}
                      </span>
                      {rotuloVariant && (
                        <div className="text-xs text-ink-2 font-medium mt-0.5">
                          {rotuloVariant}
                        </div>
                      )}
                      {modifiers.length > 0 && (
                        <div className="text-xs text-ink-3 mt-0.5">
                          {modifiers.map((m) => m.nome).join(', ')}
                        </div>
                      )}
                      {item.observacoes && (
                        <div className="text-xs text-ink-3 italic mt-0.5">
                          &ldquo;{item.observacoes}&rdquo;
                        </div>
                      )}
                    </div>
                    <span className="text-ink-2 whitespace-nowrap">{formatarReais(item.subtotal)}</span>
                  </div>
                )
              })}
            </div>
            <div className="pt-2 mt-2 space-y-0.5" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex justify-between text-sm text-ink-3">
                <span>Subtotal</span>
                <span>{formatarReais(pedido.subtotal)}</span>
              </div>
              {pedido.taxa_entrega > 0 && (
                <div className="flex justify-between text-sm text-ink-3">
                  <span>Taxa de entrega</span>
                  <span>{formatarReais(pedido.taxa_entrega)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span className="text-ink">Total</span>
                <span className="text-ink">{formatarReais(pedido.total)}</span>
              </div>
            </div>
          </div>

          {pedido.tipo !== 'agendamento' && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">Entrega</p>
              <p className="text-sm text-ink">
                {pedido.endereco_entrega?.rua}, {pedido.endereco_entrega?.numero}
                {pedido.endereco_entrega?.complemento && ` — ${pedido.endereco_entrega.complemento}`}
              </p>
              <p className="text-sm text-ink-3">
                {pedido.endereco_entrega?.bairro} — {pedido.endereco_entrega?.cidade}
              </p>
            </div>
          )}

          {pedido.observacoes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">Observações</p>
              <p
                className="text-sm text-ink px-3 py-2 rounded-xl"
                style={{ background: 'var(--bg-2)' }}
              >
                {pedido.observacoes}
              </p>
            </div>
          )}

          {pedido.delivery_assignments?.[0] && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-1">Entregador</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                  style={{ background: 'var(--bg-2)' }}
                >
                  {pedido.delivery_assignments[0].couriers?.foto_url ? (
                    <img
                      src={pedido.delivery_assignments[0].couriers.foto_url}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-3 text-xs">?</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {pedido.delivery_assignments[0].couriers?.nome}
                  </p>
                  <p className="text-xs text-ink-3">
                    {pedido.delivery_assignments[0].couriers?.telefone}
                  </p>
                </div>
              </div>
            </div>
          )}

          {pedido.status === 'em_preparo' && !pedido.delivery_assignments?.[0] && (
            <ModalAtribuirEntregador pedidoId={pedido.id} valorEntrega={pedido.taxa_entrega} />
          )}

          {acoes.length > 0 && (
            <div className="flex gap-2 pt-1">
              {acoes.map((acao) => (
                <button
                  key={acao.status}
                  onClick={() => handleAcao(acao.status)}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-full text-sm font-bold transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={
                    acao.status === 'cancelado'
                      ? { border: '1px solid var(--err)', color: 'var(--err)', background: 'transparent' }
                      : { background: 'var(--brick)', color: 'var(--brick-ink)' }
                  }
                >
                  {isPending ? 'Aguarde...' : acao.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
