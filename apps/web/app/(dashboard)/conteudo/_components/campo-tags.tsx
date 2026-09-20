'use client'

import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { LIMITES_POST, normalizarTag } from '@mallevo/lib'
import { showToast } from '@/components/ui/toast'

const inputClass =
  'flex-1 min-w-0 px-3 py-2 text-sm text-ink bg-bg rounded-xl border focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

/** Tags do post: chips + campo; Enter, vírgula ou "+" adiciona; até 5, normalizadas. */
export function CampoTags({
  tags,
  onChange,
  disabled,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}) {
  const [atual, setAtual] = useState('')

  function adicionar() {
    const t = normalizarTag(atual)
    if (!t) {
      setAtual('')
      return
    }
    if (tags.includes(t)) {
      setAtual('')
      return
    }
    if (tags.length >= LIMITES_POST.tags) {
      showToast({ tipo: 'erro', titulo: `Máximo de ${LIMITES_POST.tags} tags` })
      return
    }
    onChange([...tags, t])
    setAtual('')
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionar()
    } else if (e.key === 'Backspace' && atual === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      <label htmlFor="campo-tag" className="block text-sm font-medium text-ink-2 mb-1">
        Tags · {tags.length}/{LIMITES_POST.tags}
      </label>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-2 list-none p-0 m-0" aria-label="Tags do post">
          {tags.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                disabled={disabled}
                aria-label={`Remover tag ${t}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--brick-lt)', color: 'var(--ink)' }}
              >
                #{t}
                <X className="w-3 h-3" strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id="campo-tag"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
          onKeyDown={aoTeclar}
          onBlur={() => atual.trim() && adicionar()}
          placeholder="Adicionar tag…"
          autoCapitalize="none"
          autoComplete="off"
          disabled={disabled || tags.length >= LIMITES_POST.tags}
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={disabled || !atual.trim()}
          aria-label="Adicionar tag"
          className="w-10 h-10 rounded-xl flex items-center justify-center border hover:bg-bg-2 transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}
