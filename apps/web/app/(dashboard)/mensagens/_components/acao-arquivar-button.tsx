'use client'

import { useTransition } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { arquivarThread, desarquivarThread } from '../actions'
import { showToast } from '@/components/ui/toast'

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-bg-2 transition-colors disabled:opacity-50'

export function AcaoArquivarButton({ threadId, arquivada }: { threadId: string; arquivada: boolean }) {
  const [pending, startTransition] = useTransition()

  function alternar() {
    startTransition(() => {
      void (async () => {
        const r = arquivada
          ? await desarquivarThread(threadId)
          : await arquivarThread(threadId)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível atualizar', descricao: r.erro })
          return
        }
        showToast({
          tipo: 'sucesso',
          titulo: arquivada ? 'Conversa desarquivada' : 'Conversa arquivada',
        })
      })()
    })
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pending}
      className={BTN}
      style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
    >
      {arquivada ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
      {pending ? 'Salvando...' : arquivada ? 'Desarquivar' : 'Arquivar'}
    </button>
  )
}
