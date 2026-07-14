'use client'

import { useTransition } from 'react'
import { Download } from 'lucide-react'
import { exportarProdutosCsv } from '@/lib/actions/produtos'
import { showToast } from '@/components/ui/toast'
import { baixarCsv } from '@/lib/baixar-csv'

/** Exporta o catálogo em CSV (mesmo formato aceito pelo import). */
export function ExportarProdutosButton({ storeId }: { storeId: string }) {
  const [pending, startTransition] = useTransition()

  function disparar() {
    startTransition(() => {
      void (async () => {
        const r = await exportarProdutosCsv(storeId)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Falha ao exportar', descricao: r.erro })
          return
        }
        baixarCsv(r.csv, r.nomeArquivo)
        showToast({ tipo: 'sucesso', titulo: 'Catálogo exportado' })
      })()
    })
  }

  return (
    <button
      type="button"
      onClick={disparar}
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-bg text-xs font-semibold hover:bg-bg-2 transition-colors disabled:opacity-50"
    >
      <Download className="w-3.5 h-3.5" />
      {pending ? 'Exportando…' : 'Exportar CSV'}
    </button>
  )
}
