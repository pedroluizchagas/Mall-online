'use client'

import { useTransition } from 'react'
import type { SupportTicketStatus } from '@mallevo/types'
import { marcarResolvido, reabrirTicket } from '../actions'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'

interface Props {
  ticketId: string
  status: SupportTicketStatus
}

export function AcaoStatusButton({ ticketId, status }: Props) {
  const [pending, startTransition] = useTransition()
  const resolvido = status === 'resolvido' || status === 'fechado'

  async function executar() {
    const r = resolvido ? await reabrirTicket(ticketId) : await marcarResolvido(ticketId)
    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível atualizar', descricao: r.erro })
      return
    }
    showToast({ tipo: 'sucesso', titulo: resolvido ? 'Ticket reaberto' : 'Marcado como resolvido' })
  }

  return (
    <button
      type="button"
      onClick={() => startTransition(() => { void executar() })}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50"
      style={{ background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }}
    >
      {resolvido
        ? <><PartnerIcon name="undo" size={14} /> Reabrir</>
        : <><PartnerIcon name="check-circle" size={14} /> Marcar resolvido</>}
    </button>
  )
}
