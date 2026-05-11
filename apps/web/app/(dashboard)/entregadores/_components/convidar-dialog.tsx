'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { UserPlus } from 'lucide-react'
import { criarConvite } from '../actions'
import { showToast } from '@/components/ui/toast'
import { CopiarLinkButton } from './copiar-link-button'

const BTN_PRIMARIO =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-opacity disabled:opacity-50'
const INPUT =
  'w-full mt-1.5 border rounded-xl px-3 py-2 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-brick font-normal'

function Campo({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <label className="block mt-3 text-xs font-semibold text-ink-2">{label}{children}</label>
}

export function ConvidarDialog({ baseUrl }: { baseUrl: string }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function fechar() {
    if (pending) return
    setAberto(false); setNome(''); setTelefone(''); setEmail(''); setLinkGerado(null)
  }

  async function executar() {
    const r = await criarConvite({ nome, telefone, email: email.trim() || undefined })
    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível convidar', descricao: r.erro })
      return
    }
    showToast({ tipo: 'sucesso', titulo: 'Convite criado' })
    setLinkGerado(`${baseUrl}/convite/${r.token}`)
  }

  function enviar() { startTransition(() => { void executar() }) }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={BTN_PRIMARIO}
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        <UserPlus className="w-4 h-4" /> Convidar entregador
      </button>

      {aberto && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="convidar-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,15,13,0.45)' }}
          onClick={fechar}
        >
          <div
            className="rounded-2xl shadow-xl max-w-md w-full p-5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="convidar-titulo" className="font-semibold text-ink text-base">
              {linkGerado ? 'Convite gerado' : 'Convidar entregador'}
            </h2>

            {linkGerado ? (
              <>
                <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
                  Compartilhe este link com {nome || 'o entregador'}. Ele expira em 7 dias.
                </p>
                <div
                  className="mt-3 p-3 rounded-xl text-xs break-all"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}
                >{linkGerado}</div>
                <div className="mt-4 flex justify-end gap-2">
                  <CopiarLinkButton link={linkGerado} />
                  <button type="button" onClick={fechar} className="px-4 py-2 rounded-full text-sm font-bold"
                    style={{ background: 'var(--ink)', color: 'var(--bg)' }}>Fechar</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-ink-3 mt-1.5 leading-relaxed">
                  Geramos um link com token. Envie ao entregador para que ele complete o cadastro.
                </p>
                <Campo label="Nome">
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120}
                    className={INPUT} style={{ borderColor: 'var(--line)' }} disabled={pending} />
                </Campo>
                <Campo label="Telefone">
                  <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 91234-5678"
                    className={INPUT} style={{ borderColor: 'var(--line)' }} disabled={pending} />
                </Campo>
                <Campo label={<>Email <span className="text-ink-3 font-normal">(opcional)</span></>}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200}
                    className={INPUT} style={{ borderColor: 'var(--line)' }} disabled={pending} />
                </Campo>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={fechar} disabled={pending}
                    className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-bg-2 transition-colors"
                    style={{ color: 'var(--ink-2)' }}>Cancelar</button>
                  <button type="button" onClick={enviar}
                    disabled={pending || nome.trim().length < 2 || telefone.replace(/\D/g, '').length < 10}
                    className={BTN_PRIMARIO} style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}>
                    {pending ? 'Gerando...' : 'Gerar link'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
