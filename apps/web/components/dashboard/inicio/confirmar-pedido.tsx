'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusPedido } from '@/lib/actions/pedidos'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * "Confirmar pedido" direto do cartão ao vivo (o mesmo atalho do app do
 * lojista): pílula accent; ao confirmar, o servidor redesenha o Início e o
 * cartão sai da marquise.
 */
export function ConfirmarPedido({ pedidoId }: { pedidoId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  function confirmar() {
    iniciar(async () => {
      const r = await atualizarStatusPedido(pedidoId, 'confirmado')
      if (r && 'erro' in r && r.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível confirmar', descricao: r.erro })
        return
      }
      showToast({ tipo: 'sucesso', titulo: 'Pedido confirmado', descricao: 'Ele segue para o preparo.' })
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={confirmar}
      disabled={pendente}
      className="pointer-events-auto relative z-[1] inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-[13.5px] font-bold transition-[background-color,transform] duration-200 active:scale-[0.97] disabled:opacity-60"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
    >
      <PartnerIcon name="check" size={15} strokeWidth={2.6} />
      {pendente ? 'Confirmando…' : 'Confirmar pedido'}
    </button>
  )
}
