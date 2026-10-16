'use client'

import { useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'

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
      {copiado ? <PartnerIcon name="check" size={14} /> : <PartnerIcon name="copy" size={14} />}
      {copiado ? 'Copiado!' : rotulo}
    </button>
  )
}
