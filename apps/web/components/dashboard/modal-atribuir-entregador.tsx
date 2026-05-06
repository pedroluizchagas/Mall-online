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
      const { data: tenant } = await supabase.from('tenants').select('id').single()
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
        className="w-full py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        style={{ border: '1px solid var(--brick)', color: 'var(--brick-dk)' }}
      >
        Atribuir entregador
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--bg)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <h3 className="font-semibold text-ink mb-1">Selecionar entregador</h3>
            <p className="text-sm text-ink-3 mb-4">
              Valor da entrega: {formatarReais(valorEntrega)}
            </p>

            {entregadores.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-4">
                Nenhum entregador disponível no momento.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {entregadores.map((courier) => {
                  const sel = selecionado === courier.id
                  return (
                    <button
                      key={courier.id}
                      onClick={() => setSelecionado(courier.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                      style={{
                        border: sel ? '1px solid var(--brick)' : '1px solid var(--line)',
                        background: sel ? 'rgba(193,241,72,0.08)' : 'transparent',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden"
                        style={{ background: 'var(--bg-2)' }}
                      >
                        {courier.foto_url ? (
                          <img src={courier.foto_url} alt={courier.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ink-3 text-sm">?</div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{courier.nome}</p>
                        <p className="text-xs text-ink-3">
                          {courier.tipo === 'proprio' ? 'Entregador próprio' : 'Autônomo'}
                          {courier.online && <span className="ml-1" style={{ color: 'var(--ok)' }}>· Online</span>}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setAberto(false)}
                className="flex-1 py-2 rounded-full text-sm font-medium"
                style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAtribuir}
                disabled={!selecionado || isPending}
                className="flex-1 py-2 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
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
