'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { showToast } from '@/components/ui/toast'

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors'

export function CopiarLinkButton({ link, rotulo = 'Copiar link' }: { link: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      showToast({ tipo: 'sucesso', titulo: 'Link copiado' })
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      showToast({ tipo: 'erro', titulo: 'Não foi possível copiar' })
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={BTN}
      style={
        copiado
          ? { background: 'rgba(79,176,37,0.10)', color: 'var(--ok)', borderColor: 'rgba(79,176,37,0.30)' }
          : { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }
      }
    >
      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiado ? 'Copiado!' : rotulo}
    </button>
  )
}
