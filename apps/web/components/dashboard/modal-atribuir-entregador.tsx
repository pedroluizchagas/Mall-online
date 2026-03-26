'use client'

import { useEffect, useState, useTransition } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { atribuirEntregador } from '@/lib/actions/pedidos'
import { formatarReais } from '@mallora/lib'

interface Props {
  pedidoId: string
  valorEntrega: number
}

export function ModalAtribuirEntregador({ pedidoId, valorEntrega }: Props) {
  const [aberto, setAberto] = useState(false)
  const [entregadores, setEntregadores] = useState<any[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!aberto) return

    async function carregar() {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .single()

      if (!tenant) return

      const { data } = await supabase
        .from('couriers')
        .select('id, nome, telefone, foto_url, tipo, online')
        .eq('status', 'aprovado')
        .or(`tenant_id.eq.${tenant.id},and(tipo.eq.autonomo,online.eq.true)`)
        .order('tipo')

      setEntregadores(data ?? [])
    }

    carregar()
  }, [aberto])

  function handleAtribuir() {
    if (!selecionado) return
    startTransition(async () => {
      const resultado = await atribuirEntregador(pedidoId, selecionado, valorEntrega)
      if (resultado.sucesso) setAberto(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="w-full border border-[#4CAF82] text-[#4CAF82] py-2 rounded-lg
          text-sm font-medium hover:bg-green-50 transition-colors"
      >
        Atribuir entregador
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-[#1A4D3A] mb-1">
              Selecionar entregador
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Valor da entrega: {formatarReais(valorEntrega)}
            </p>

            {entregadores.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum entregador disponível no momento.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {entregadores.map((courier) => (
                  <button
                    key={courier.id}
                    onClick={() => setSelecionado(courier.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border
                      transition-colors text-left ${
                      selecionado === courier.id
                        ? 'border-[#4CAF82] bg-green-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                      {courier.foto_url ? (
                        <img
                          src={courier.foto_url}
                          alt={courier.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center
                          justify-center text-gray-300 text-sm">?</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {courier.nome}
                      </p>
                      <p className="text-xs text-gray-400">
                        {courier.tipo === 'proprio'
                          ? 'Entregador próprio'
                          : 'Autônomo'}
                        {courier.online && (
                          <span className="ml-1 text-green-500">· Online</span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setAberto(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtribuir}
                disabled={!selecionado || isPending}
                className="flex-1 py-2 bg-[#1A4D3A] text-white rounded-lg text-sm
                  font-medium disabled:opacity-50"
              >
                {isPending ? 'Atribuindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
