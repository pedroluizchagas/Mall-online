'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  url: string
  urlDisplay: string
}

export function BotaoCopiarLink({ url, urlDisplay }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  return (
    <button
      onClick={copiar}
      className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
      style={{
        background: copiado ? 'rgba(79,176,37,0.1)' : 'var(--brick)',
        color: copiado ? 'var(--ok)' : 'var(--brick-ink)',
        border: copiado ? '1px solid rgba(79,176,37,0.3)' : '1px solid transparent',
      }}
    >
      <span className="truncate">{copiado ? 'Link copiado!' : urlDisplay}</span>
      {copiado ? (
        <Check className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 flex-shrink-0" />
      )}
    </button>
  )
}
