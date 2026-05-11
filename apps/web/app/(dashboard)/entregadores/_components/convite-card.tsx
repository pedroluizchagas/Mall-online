'use client'

import { useTransition } from 'react'
import { Mail, Phone, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { revogarConvite } from '../actions'
import { showToast } from '@/components/ui/toast'
import { CopiarLinkButton } from './copiar-link-button'

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-bg-2 transition-colors disabled:opacity-50'

export interface ConviteItem {
  token: string
  nome: string
  telefone: string
  email: string | null
  expira_em: string
  criada_em: string
}

function diasParaExpirar(expiraEm: string): { texto: string; expirado: boolean } {
  const ms = new Date(expiraEm).getTime() - Date.now()
  if (ms <= 0) return { texto: 'Expirado', expirado: true }
  const dias = Math.ceil(ms / (1000 * 60 * 60 * 24))
  return { texto: `Expira em ${dias} dia${dias === 1 ? '' : 's'}`, expirado: false }
}

export function ConviteCard({ convite, baseUrl }: { convite: ConviteItem; baseUrl: string }) {
  const [pending, startTransition] = useTransition()
  const expira = diasParaExpirar(convite.expira_em)
  const link = `${baseUrl}/convite/${convite.token}`

  async function executar() {
    const r = await revogarConvite(convite.token)
    if ('erro' in r) {
      showToast({ tipo: 'erro', titulo: 'Não foi possível revogar', descricao: r.erro })
      return
    }
    showToast({ tipo: 'sucesso', titulo: 'Convite revogado' })
  }

  function revogar() {
    startTransition(() => { void executar() })
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-ink text-sm">{convite.nome}</h3>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={
                expira.expirado
                  ? { background: 'rgba(224,90,59,0.10)', color: 'var(--err)', border: '1px solid rgba(224,90,59,0.28)' }
                  : { background: 'rgba(91,138,199,0.10)', color: 'var(--sky)', border: '1px solid rgba(91,138,199,0.28)' }
              }
            >
              {expira.texto}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-ink-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{convite.telefone}</span>
            {convite.email && (
              <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{convite.email}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <CopiarLinkButton link={link} />
          <button
            type="button"
            onClick={revogar}
            disabled={pending}
            className={BTN}
            style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
          >
            <Trash2 className="w-3.5 h-3.5" /> {pending ? 'Revogando...' : 'Revogar'}
          </button>
        </div>
      </div>
    </Card>
  )
}
