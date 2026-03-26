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

const CORES_STATUS: Record<string, string> = {
  novo: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-purple-100 text-purple-800',
  aguardando_entregador: 'bg-orange-100 text-orange-800',
  saiu_para_entrega: 'bg-cyan-100 text-cyan-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
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
  const [expandido, setExpandido] = useState(
    expandidoInicial ?? pedido.status === 'novo'
  )
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const acoes = PROXIMAS_ACOES[pedido.status] ?? []
  const horario = new Date(pedido.criado_em).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  function handleAcao(status: string) {
    setErro(null)
    startTransition(async () => {
      const resultado = await atualizarStatusPedido(pedido.id, status as any)
      if (resultado.erro) setErro(resultado.erro)
    })
  }

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        pedido.status === 'novo'
          ? 'border-amber-300 shadow-md shadow-amber-50'
          : 'border-gray-100'
      }`}
    >
      {/* Cabeçalho — sempre visível */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpandido(!expandido)}
      >
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/pedidos/${pedido.id}`}
              className="font-semibold text-gray-800 hover:text-[#4CAF82] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              #{pedido.id.slice(-6).toUpperCase()}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CORES_STATUS[pedido.status]}`}>
              {LABELS_STATUS[pedido.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {pedido.consumers?.nome} — {horario}
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold text-[#1A4D3A]">{formatarReais(pedido.total)}</p>
          <p className="text-xs text-gray-400">
            {pedido.forma_pagamento === 'online_cartao' && 'Cartão online'}
            {pedido.forma_pagamento === 'online_pix' && 'PIX'}
            {pedido.forma_pagamento === 'dinheiro' && 'Dinheiro'}
            {pedido.forma_pagamento === 'cartao_maquininha' && 'Cartão na entrega'}
          </p>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-3">

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {erro}
            </p>
          )}

          {/* Itens */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Itens</p>
            <div className="space-y-1">
              {pedido.order_items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.quantidade}x {item.nome}
                    {item.observacoes && (
                      <span className="text-gray-400 ml-1">({item.observacoes})</span>
                    )}
                  </span>
                  <span className="text-gray-600">{formatarReais(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-0.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatarReais(pedido.subtotal)}</span>
              </div>
              {pedido.taxa_entrega > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de entrega</span>
                  <span>{formatarReais(pedido.taxa_entrega)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-[#1A4D3A]">{formatarReais(pedido.total)}</span>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Entrega</p>
            <p className="text-sm text-gray-700">
              {pedido.endereco_entrega?.rua}, {pedido.endereco_entrega?.numero}
              {pedido.endereco_entrega?.complemento &&
                ` — ${pedido.endereco_entrega.complemento}`}
            </p>
            <p className="text-sm text-gray-500">
              {pedido.endereco_entrega?.bairro} — {pedido.endereco_entrega?.cidade}
            </p>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Observações</p>
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                {pedido.observacoes}
              </p>
            </div>
          )}

          {/* Entregador atribuído */}
          {pedido.delivery_assignments?.[0] && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Entregador</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  {pedido.delivery_assignments[0].couriers?.foto_url ? (
                    <img
                      src={pedido.delivery_assignments[0].couriers.foto_url}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {pedido.delivery_assignments[0].couriers?.nome}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pedido.delivery_assignments[0].couriers?.telefone}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botão de atribuir entregador */}
          {pedido.status === 'em_preparo' && !pedido.delivery_assignments?.[0] && (
            <ModalAtribuirEntregador
              pedidoId={pedido.id}
              valorEntrega={pedido.taxa_entrega}
            />
          )}

          {/* Ações de status */}
          {acoes.length > 0 && (
            <div className="flex gap-2 pt-1">
              {acoes.map((acao) => (
                <button
                  key={acao.status}
                  onClick={() => handleAcao(acao.status)}
                  disabled={isPending}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                    disabled:opacity-50 ${
                    acao.status === 'cancelado'
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'bg-[#1A4D3A] text-white hover:bg-[#163d2e]'
                  }`}
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
