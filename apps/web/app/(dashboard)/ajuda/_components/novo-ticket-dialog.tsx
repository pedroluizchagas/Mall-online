'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { SupportTicketPrioridade } from '@mallora/types'
import { criarTicket } from '../actions'
import { showToast } from '@/components/ui/toast'

const BTN_PRIMARIO =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-opacity disabled:opacity-50'
const INPUT =
  'w-full mt-1.5 border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick font-normal'

function Campo({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <label className="block mt-3 text-xs font-semibold text-ink-2">{label}{children}</label>
}

export function NovoTicketDialog() {
  const [aberto, setAberto] = useState(false)
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [prioridade, setPrioridade] = useState<SupportTicketPrioridade>('normal')
  const [pending, startTransition] = useTransition()

  function fechar() {
    if (pending) return
    setAberto(false); setAssunto(''); setMensagem(''); setPrioridade('normal')
  }

  async function executar() {
    const r = await criarTicket({ assunto, mensagem, prioridade })
    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível abrir ticket', descricao: r.erro })
      return
    }
    showToast({ tipo: 'sucesso', titulo: 'Ticket aberto', descricao: 'Nossa equipe responderá em breve.' })
    fechar()
  }

  function enviar() { startTransition(() => { void executar() }) }

  const desabilitado =
    pending || assunto.trim().length < 3 || mensagem.trim().length < 10

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={BTN_PRIMARIO}
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        <Plus className="w-4 h-4" /> Abrir novo ticket
      </button>

      {aberto && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="novo-ticket-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,13,0.45)' }}
          onClick={fechar}
        >
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="novo-ticket-titulo" className="font-semibold text-ink text-base">
              Abrir novo ticket
            </h2>
            <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              Descreva sua dúvida ou problema. Nossa equipe responderá pelo email cadastrado.
            </p>

            <Campo label="Assunto">
              <input
                type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)}
                maxLength={200} placeholder="Ex.: Dúvida sobre repasse"
                className={INPUT} style={{ borderColor: 'var(--line)' }} disabled={pending}
              />
            </Campo>

            <Campo label="Mensagem">
              <textarea
                value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={5}
                maxLength={4000} placeholder="Conte com detalhes o que está acontecendo..."
                className={`${INPUT} resize-y`} style={{ borderColor: 'var(--line)' }} disabled={pending}
              />
            </Campo>

            <Campo label="Prioridade">
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as SupportTicketPrioridade)}
                className={INPUT} style={{ borderColor: 'var(--line)' }} disabled={pending}
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </Campo>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button" onClick={fechar} disabled={pending}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
                style={{ color: 'var(--ink-2)' }}
              >Cancelar</button>
              <button
                type="button" onClick={enviar} disabled={desabilitado}
                className={BTN_PRIMARIO} style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                {pending ? 'Enviando...' : 'Enviar ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
