'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarDadosPessoais, alterarSenha } from '@/lib/actions/auth'

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

const inputReadOnlyClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm bg-bg-2 text-ink-3 cursor-default select-all'

interface Props {
  dados: {
    email: string
    nome: string
    telefone: string
    cpf_cnpj: string
  }
}

export function AbaMeusDados({ dados }: Props) {
  const [estadoPessoais, dispatchPessoais] = useFormState(atualizarDadosPessoais, null)
  const [estadoSenha, dispatchSenha] = useFormState(alterarSenha, null)

  return (
    <div className="space-y-8">
      {/* Dados pessoais */}
      <div
        className="rounded-xl p-5"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <h2 className="font-semibold text-ink mb-4">Dados pessoais</h2>

        <form action={dispatchPessoais} className="space-y-4">
          {estadoPessoais?.erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {estadoPessoais.erro}
            </p>
          )}
          {estadoPessoais?.sucesso && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
              Dados atualizados com sucesso.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Nome completo</label>
            <input
              name="nome"
              defaultValue={dados.nome}
              required
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Telefone</label>
            <input
              name="telefone"
              defaultValue={dados.telefone}
              placeholder="(00) 00000-0000"
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">
              E-mail
              <span className="ml-2 text-xs font-normal text-ink-3">não editável</span>
            </label>
            <input
              readOnly
              value={dados.email}
              className={inputReadOnlyClass}
              style={{ borderColor: 'var(--line)' }}
            />
            <p className="text-xs text-ink-3 mt-1">
              Para alterar o e-mail entre em contato com o suporte.
            </p>
          </div>

          {dados.cpf_cnpj && (
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1">
                CPF / CNPJ
                <span className="ml-2 text-xs font-normal text-ink-3">não editável</span>
              </label>
              <input
                readOnly
                value={dados.cpf_cnpj}
                className={inputReadOnlyClass}
                style={{ borderColor: 'var(--line)' }}
              />
            </div>
          )}

          <BotaoSalvar />
        </form>
      </div>

      {/* Segurança */}
      <div
        className="rounded-xl p-5"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <h2 className="font-semibold text-ink mb-1">Segurança</h2>
        <p className="text-sm text-ink-3 mb-4">Deixe os campos em branco para manter a senha atual.</p>

        <form action={dispatchSenha} className="space-y-4">
          {estadoSenha?.erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {estadoSenha.erro}
            </p>
          )}
          {estadoSenha?.sucesso && (
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
    </div>
  )
}
