'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { PedidoCard } from './pedido-card'
import { FiltroPedidos } from './filtro-pedidos'

type StatusFiltro = 'todos' | 'ativos' | 'entregues' | 'cancelados'

export function PainelPedidosRealtime({
  pedidosIniciais,
}: {
  pedidosIniciais: any[]
}) {
  const [pedidos, setPedidos] = useState(pedidosIniciais)
  const [filtro, setFiltro] = useState<StatusFiltro>('ativos')
  const supabase = createSupabaseClient()
  const audioRef = useRef<AudioContext | null>(null)

  // AudioContext requer interação prévia do usuário
  useEffect(() => {
    const init = () => {
      if (!audioRef.current) {
        audioRef.current = new AudioContext()
      }
    }
    document.addEventListener('click', init, { once: true })
    return () => document.removeEventListener('click', init)
  }, [])

  function tocarSom() {
    const ctx = audioRef.current
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  }

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null

    async function iniciar() {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .single()

      if (!tenant) return

      canal = supabase
        .channel(`pedidos-${tenant.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `tenant_id=eq.${tenant.id}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              // Buscar pedido completo com joins
              const { data } = await supabase
                .from('orders')
                .select(`
                  id, status, payment_status, forma_pagamento,
                  subtotal, taxa_entrega, total, criado_em,
                  endereco_entrega, observacoes,
                  consumers (id, nome, telefone),
                  order_items (id, nome, quantidade, preco_unit, subtotal, observacoes),
                  delivery_assignments (
                    id, status, valor_entrega,
                    couriers (id, nome, telefone, foto_url)
                  )
                `)
                .eq('id', payload.new.id)
                .single()

              if (data) {
                setPedidos((prev) => [data, ...prev])
                tocarSom()
              }
            }

            if (payload.eventType === 'UPDATE') {
              setPedidos((prev) =>
                prev.map((p) =>
                  p.id === payload.new.id ? { ...p, ...payload.new } : p
                )
              )
            }
          }
        )
        .subscribe()
    }

    iniciar()
    return () => {
      if (canal) supabase.removeChannel(canal)
    }
  }, [])

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtro === 'todos') return true
    if (filtro === 'ativos') return !['entregue', 'cancelado'].includes(p.status)
    if (filtro === 'entregues') return p.status === 'entregue'
    if (filtro === 'cancelados') return p.status === 'cancelado'
    return true
  })

  const contadores = {
    novos: pedidos.filter((p) => p.status === 'novo').length,
    em_preparo: pedidos.filter((p) => p.status === 'em_preparo').length,
    saindo: pedidos.filter((p) => p.status === 'saiu_para_entrega').length,
  }

  return (
    <div className="flex flex-col flex-1 gap-4">
      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{contadores.novos}</p>
          <p className="text-xs text-amber-600 mt-0.5">Novos</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{contadores.em_preparo}</p>
          <p className="text-xs text-blue-600 mt-0.5">Em preparo</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{contadores.saindo}</p>
          <p className="text-xs text-green-600 mt-0.5">Saindo</p>
        </div>
      </div>

      <FiltroPedidos filtroAtivo={filtro} onChange={setFiltro} />

      <div className="flex flex-col gap-3 overflow-auto pb-4">
        {pedidosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Nenhum pedido encontrado.
          </div>
        ) : (
          pedidosFiltrados.map((pedido) => (
            <PedidoCard key={pedido.id} pedido={pedido} />
          ))
        )}
      </div>
    </div>
  )
}
