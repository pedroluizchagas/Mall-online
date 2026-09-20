'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { showToast } from '@/components/ui/toast'
import { descartarOrfaosConteudo } from '@/lib/actions/conteudo'

/** Uploads que não viraram post (falha entre o envio e o registro) ocupando espaço. */
export function OrfaosCard({ caminhos }: { caminhos: string[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const n = caminhos.length

  function descartar() {
    startTransition(() => {
      void (async () => {
        const r = await descartarOrfaosConteudo(caminhos)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível descartar', descricao: r.erro })
          return
        }
        showToast({ tipo: 'sucesso', titulo: 'Arquivos descartados' })
        router.refresh()
      })()
    })
  }

  return (
    <div
      className="rounded-md p-4 border flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: 'var(--warn-lt)', borderColor: 'rgba(224,166,26,0.30)' }}
      role="status"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bg)' }}>
        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warn)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">
          {n} upload{n === 1 ? '' : 's'} incompleto{n === 1 ? '' : 's'} ocupando espaço
        </p>
        <p className="text-xs text-ink-2 mt-0.5">
          Arquivos enviados cuja publicação não foi concluída. Pode descartá-los sem afetar seus posts.
        </p>
      </div>
      <button
        type="button"
        onClick={descartar}
        disabled={pending}
        className="px-4 py-2 rounded-full text-xs font-bold border transition-colors hover:bg-bg disabled:opacity-50 shrink-0"
        style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}
      >
        {pending ? 'Descartando…' : 'Descartar arquivos'}
      </button>
    </div>
  )
}
