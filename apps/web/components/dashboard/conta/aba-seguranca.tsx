'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Monitor } from 'lucide-react'
import { alterarSenha } from '@/lib/actions/auth'
import { EmptyState } from '@/components/dashboard/empty-state'

function BotaoSalvar({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

export function AbaSeguranca() {
  const [estado, dispatch] = useFormState(alterarSenha, null)

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-5"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <h2 className="font-semibold text-ink mb-1">Senha</h2>
        <p className="text-sm text-ink-3 mb-4">
          Use uma senha forte com ao menos 8 caracteres.
        </p>

        <form action={dispatch} className="space-y-4">
          {estado?.erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {estado.erro}
            </p>
          )}
          {estado?.sucesso && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
              Senha alterada com sucesso.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Nova senha</label>
            <input
              name="nova_senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Confirmar nova senha</label>
            <input
              name="confirmacao"
              type="password"
              placeholder="Repita a nova senha"
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <BotaoSalvar label="Alterar senha" />
        </form>
      </div>

      <div
        className="rounded-xl"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-semibold text-ink">Sessões ativas</h2>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}
          >
            Em breve
          </span>
        </div>
        <EmptyState
          icone={Monitor}
          titulo="Lista de dispositivos em breve"
          descricao="Você poderá ver quais dispositivos estão conectados e encerrar todas as sessões com um clique."
        />
      </div>
    </div>
  )
}
