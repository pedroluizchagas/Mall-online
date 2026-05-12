'use client'

import { useState, useTransition } from 'react'
import { Flag, FlagOff } from 'lucide-react'
import { sinalizarAvaliacao, removerSinalizacao } from '../actions'
import { showToast } from '@/components/ui/toast'

const BTN_SECUNDARIO =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-bg-2 transition-colors disabled:opacity-50'

export function SinalizarDialog({ reviewId, sinalizada }: { reviewId: string; sinalizada: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [pending, startTransition] = useTransition()

  function enviar() {
    if (motivo.trim().length < 3) {
      showToast({ tipo: 'erro', titulo: 'Descreva o motivo (mín. 3 caracteres)' })
      return
    }
    startTransition(() => {
      void (async () => {
        const r = await sinalizarAvaliacao({ reviewId, motivo })
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível sinalizar', descricao: r.erro })
          return
        }
        showToast({ tipo: 'sucesso', titulo: 'Avaliação sinalizada' })
        setMotivo('')
        setAberto(false)
      })()
    })
  }

  function remover() {
    startTransition(() => {
      void (async () => {
        const r = await removerSinalizacao(reviewId)
        if ('erro' in r) showToast({ tipo: 'erro', titulo: 'Não foi possível remover', descricao: r.erro })
        else showToast({ tipo: 'sucesso', titulo: 'Sinalização removida' })
      })()
    })
  }

  if (sinalizada) {
    return (
      <button type="button" onClick={remover} disabled={pending} className={BTN_SECUNDARIO} style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
        <FlagOff className="w-3.5 h-3.5" />
        {pending ? 'Removendo...' : 'Remover sinalização'}
      </button>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={BTN_SECUNDARIO} style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
        <Flag className="w-3.5 h-3.5" /> Sinalizar
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sinalizar-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,13,0.45)' }}
          onClick={() => !pending && setAberto(false)}
        >
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sinalizar-titulo" className="font-semibold text-ink text-base">Sinalizar avaliação</h2>
            <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              Use quando a avaliação for ofensiva, contiver spam ou fugir das diretrizes (até 500 caracteres).
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Motivo da sinalização"
              className="w-full mt-3 border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick"
              style={{ borderColor: 'var(--line)' }}
              disabled={pending}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={pending}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
                style={{ color: 'var(--ink-2)' }}
              >Cancelar</button>
              <button
                type="button"
                onClick={enviar}
                disabled={pending || motivo.trim().length < 3}
                className="px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >{pending ? 'Enviando...' : 'Sinalizar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
