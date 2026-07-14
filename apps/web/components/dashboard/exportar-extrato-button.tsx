'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { exportarExtratoCsv, type PeriodoExtrato } from '@/lib/actions/financeiro'
import { showToast } from '@/components/ui/toast'
import { baixarCsv } from '@/lib/baixar-csv'

/**
 * Exporta o extrato de repasses em CSV, com seletor de período no próprio
 * botão (dashboard-redesign Fase 3 §3).
 */

const PERIODOS: { valor: PeriodoExtrato; rotulo: string }[] = [
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mes-anterior', rotulo: 'Mês anterior' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: '90d', rotulo: 'Últimos 90 dias' },
]

export function ExportarExtratoButton() {
  const [aberto, setAberto] = useState(false)
  const [pending, startTransition] = useTransition()
  const raiz = useRef<HTMLDivElement>(null)

  // Fecha o menu ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberto])

  function exportar(periodo: PeriodoExtrato) {
    setAberto(false)
    startTransition(() => {
      void (async () => {
        const r = await exportarExtratoCsv(periodo)
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Falha ao exportar', descricao: r.erro })
          return
        }
        baixarCsv(r.csv, r.nomeArquivo)
        showToast({ tipo: 'sucesso', titulo: 'Extrato exportado' })
      })()
    })
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-bg text-xs font-semibold hover:bg-bg-2 transition-colors disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        {pending ? 'Exportando…' : 'Extrato'}
        <ChevronDown className="w-3 h-3" />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-xl shadow-lg z-20 py-1"
          style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
        >
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              role="menuitem"
              onClick={() => exportar(p.valor)}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-bg-2 transition-colors"
              style={{ color: 'var(--ink-2)' }}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
