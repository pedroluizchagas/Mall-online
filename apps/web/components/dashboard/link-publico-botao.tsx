'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface Props {
  slug: string | null
}

export function LinkPublicoBotao({ slug }: Props) {
  const [tooltipAberto, setTooltipAberto] = useState(false)
  const desabilitado = !slug

  if (desabilitado) {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          disabled
          aria-describedby="link-publico-tooltip"
          onMouseEnter={() => setTooltipAberto(true)}
          onMouseLeave={() => setTooltipAberto(false)}
          onFocus={() => setTooltipAberto(true)}
          onBlur={() => setTooltipAberto(false)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border opacity-60 cursor-not-allowed"
          style={{ borderColor: 'var(--line-2)', color: 'var(--ink-3)', background: 'var(--bg)' }}
        >
          Ver loja pública
          <ExternalLink className="w-3 h-3" />
        </button>
        {tooltipAberto && (
          <span
            id="link-publico-tooltip"
            role="tooltip"
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap z-10 shadow-md"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}
          >
            Defina um slug em Configurações &gt; Identificação primeiro
          </span>
        )}
      </div>
    )
  }

  return (
    <a
      href={`/loja/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border hover:bg-bg-2 transition-colors"
      style={{ borderColor: 'var(--line-2)', color: 'var(--ink)', background: 'var(--bg)' }}
    >
      Ver loja pública
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}
