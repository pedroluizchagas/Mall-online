import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { createAudioPlayer } from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { usePedidosStore, SELECT_PEDIDO, type Pedido } from '@/store/usePedidosStore'

// Assinatura Realtime de `orders` (publication já inclui a tabela —
// supabase/migrations/20260606130000_realtime_orders.sql) + som/haptics de
// pedido novo + refetch no retorno do background (mobile perde socket).
// docs/partner-app/05-stage-3-pedidos.md

/** Toca o sino de pedido novo + vibração. Falha silenciosa (som nunca quebra fluxo). */
export function tocarSomPedidoNovo() {
  try {
    const player = createAudioPlayer(require('../assets/som-pedido.wav'))
    player.play()
    // libera o player após o áudio (~0.7s)
    setTimeout(() => player.release(), 2000)
  } catch {
    // sem áudio disponível — segue sem som
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

/**
 * Mantém a lista de pedidos viva: carga inicial, INSERT/UPDATE via
 * Realtime (refetch da linha com joins — o payload do Realtime não traz
 * relations) e reconciliação ao voltar do background.
 * Montar UMA vez (layout das tabs).
 */
export function usePedidosRealtime() {
  const tenantId = useAuthStore((s) => s.tenant?.id ?? null)
  const { carregarPedidos, aplicarPedido, limpar } = usePedidosStore()
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!tenantId) {
      limpar()
      return
    }

    carregarPedidos()

    async function refetchLinha(id: string, ehNovo: boolean) {
      // RLS garante o escopo; refetch traz itens/consumer/entregador.
      const { data } = await supabase
        .from('orders')
        .select(SELECT_PEDIDO)
        .eq('id', id)
        .single()
      if (data) {
        aplicarPedido(data as unknown as Pedido)
        if (ehNovo) tocarSomPedidoNovo()
      }
    }

    const canal = supabase
      .channel(`orders-partner-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          void refetchLinha((payload.new as { id: string }).id, true)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          void refetchLinha((payload.new as { id: string }).id, false)
        }
      )
      .subscribe()

    canalRef.current = canal

    // Socket morre em background: ao voltar, refetch completo reconcilia.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void carregarPedidos()
    })

    return () => {
      sub.remove()
      if (canalRef.current) supabase.removeChannel(canalRef.current)
      canalRef.current = null
    }
  }, [tenantId])
}
