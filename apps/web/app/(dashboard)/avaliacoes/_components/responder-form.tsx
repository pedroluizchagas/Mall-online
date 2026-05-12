'use client'

import { useState, useTransition } from 'react'
import { responderAvaliacao } from '../actions'
import { showToast } from '@/components/ui/toast'

export function ResponderForm({ reviewId }: { reviewId: string }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [pending, startTransition] = useTransition()

  function enviar() {
    if (texto.trim().length < 3) {
      showToast({ tipo: 'erro', titulo: 'Resposta muito curta' })
      return
    }
    startTransition(() => {
      void (async () => {
        const r = await responderAvaliacao({ reviewId, resposta: texto })
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível responder', descricao: r.erro })
          return
        }
        showToast({ tipo: 'sucesso', titulo: 'Resposta enviada' })
        setTexto('')
        setAberto(false)
      })()
    })
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="px-4 py-1.5 rounded-full text-xs font-bold transition-opacity hover:opacity-90"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        Responder
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2 w-full">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Escreva uma resposta clara e cordial."
        className="w-full border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick"
        style={{ borderColor: 'var(--line)' }}
        disabled={pending}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setAberto(false); setTexto('') }}
          disabled={pending}
          className="px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-bg-2 transition-colors"
          style={{ color: 'var(--ink-2)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={pending || texto.trim().length < 3}
          className="px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          {pending ? 'Enviando...' : 'Enviar resposta'}
        </button>
      </div>
    </div>
  )
}
