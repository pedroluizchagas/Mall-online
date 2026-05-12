'use client'

import { useTransition } from 'react'
import { Download } from 'lucide-react'
import { exportarRelatorioCsv } from '../actions'
import { showToast } from '@/components/ui/toast'
import type { Periodo } from '../_lib/periodo'

export function ExportarCsvButton({ periodo }: { periodo: Periodo }) {
  const [pending, startTransition] = useTransition()

  function disparar() {
    startTransition(() => {
      void (async () => {
        const r = await exportarRelatorioCsv(periodo)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Falha ao exportar', descricao: r.erro })
          return
        }
        const blob = new Blob([r.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = r.nomeArquivo
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        showToast({ tipo: 'sucesso', titulo: 'CSV exportado' })
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
      {pending ? 'Exportando...' : 'Exportar CSV'}
    </button>
  )
}
