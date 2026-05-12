'use client'

import { useState, useTransition, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { enviarMensagem } from '../actions'
import { showToast } from '@/components/ui/toast'

const BTN =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-opacity disabled:opacity-50'

export function Composer({ threadId }: { threadId: string }) {
  const [corpo, setCorpo] = useState('')
  const [pending, startTransition] = useTransition()

  const podeEnviar = corpo.trim().length >= 1 && !pending

  function enviar() {
    if (!podeEnviar) return
    startTransition(() => {
      void (async () => {
        const r = await enviarMensagem({ threadId, corpo })
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível enviar', descricao: r.erro })
          return
        }
        setCorpo('')
        showToast({ tipo: 'sucesso', titulo: 'Enviada' })
      })()
    })
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <div
      className="mt-6 p-3 rounded-2xl"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
    >
      <textarea
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        onKeyDown={aoTeclar}
        disabled={pending}
        maxLength={4000}
        rows={3}
        placeholder="Escreva sua resposta…"
        className="w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none placeholder:text-ink-3"
        style={{ color: 'var(--ink)' }}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink-3">
          <kbd className="font-mono">⌘/Ctrl + Enter</kbd> para enviar · {corpo.length}/4000
        </span>
        <button
          type="button"
          onClick={enviar}
          disabled={!podeEnviar}
          className={BTN}
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          <Send className="w-4 h-4" />
          {pending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
