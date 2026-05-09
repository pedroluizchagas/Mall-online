'use client'

import { useTransition } from 'react'
import { Pause, Play } from 'lucide-react'
import { alternarAtivoEntregador } from '../actions'
import { showToast } from '@/components/ui/toast'

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-bg-2 transition-colors disabled:opacity-50'

export function AlternarAtivoButton({ courierId, ativo }: { courierId: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition()

  async function executar() {
    const r = await alternarAtivoEntregador({ courierId, ativo: !ativo })
    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível atualizar', descricao: r.erro })
      return
    }
    showToast({
      tipo: 'sucesso',
      titulo: ativo ? 'Entregador desativado' : 'Entregador reativado',
    })
  }

  function alternar() {
    startTransition(() => { void executar() })
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pending}
      className={BTN}
      style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
    >
      {ativo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      {pending ? 'Salvando...' : ativo ? 'Desativar' : 'Reativar'}
    </button>
  )
}
