'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import { criarBroadcast } from '../actions'
import { showToast } from '@/components/ui/toast'

const BTN_PRIMARIO =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-opacity disabled:opacity-50'

export function BroadcastDialog() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [corpo, setCorpo] = useState('')
  const [pending, startTransition] = useTransition()

  function fechar() {
    if (pending) return
    setAberto(false)
    setCorpo('')
  }

  const podeEnviar = corpo.trim().length >= 3 && !pending

  function enviar() {
    if (!podeEnviar) return
    startTransition(() => {
      void (async () => {
        const r = await criarBroadcast({ corpo })
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível enviar broadcast', descricao: r.erro })
          return
        }
        const detalhe =
          r.falhas > 0
            ? `${r.enviadas} enviadas, ${r.falhas} falharam`
            : `${r.enviadas} cliente(s)`
        showToast({ tipo: 'sucesso', titulo: 'Broadcast enviado', descricao: detalhe })
        setAberto(false)
        setCorpo('')
        router.refresh()
      })()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={BTN_PRIMARIO}
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        <Megaphone className="w-4 h-4" /> Enviar broadcast
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,13,0.45)' }}
          onClick={fechar}
        >
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="broadcast-titulo" className="font-semibold text-ink text-base">
              Enviar broadcast
            </h2>
            <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              Envia uma mensagem para todos os clientes que já compraram. Cria uma nova
              conversa com cada um. Limite: 200 destinatários.
            </p>

            <label className="block mt-4 text-xs font-semibold text-ink-2">
              Mensagem
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                disabled={pending}
                maxLength={4000}
                rows={5}
                placeholder="Escreva a mensagem que será enviada para cada cliente…"
                className="w-full mt-1.5 border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick font-normal resize-none placeholder:text-ink-3"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </label>
            <div className="mt-1 text-[11px] text-ink-3 text-right">{corpo.length}/4000</div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={fechar}
                disabled={pending}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
                style={{ color: 'var(--ink-2)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                disabled={!podeEnviar}
                className={BTN_PRIMARIO}
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                {pending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
