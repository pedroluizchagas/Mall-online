'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarDadosGerais } from '@/lib/actions/lojas'

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

export function AbaGeral({ loja }: { loja: any }) {
  const [estadoGeral, dispatchGeral] = useFormState(atualizarDadosGerais, null)

  function sanitizarSlug(valor: string) {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl p-5"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <h2 className="font-semibold text-ink mb-1">Dados da loja</h2>
        <p className="text-xs text-ink-3 mb-4">
          Identidade visual (logo, banner, descrição) e status agora são
          gerenciados em <strong>Minha Loja</strong>.
        </p>

        <form action={dispatchGeral} className="space-y-4">
          {estadoGeral?.erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {estadoGeral.erro}
            </p>
          )}
          {estadoGeral?.sucesso && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
              Dados atualizados com sucesso.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Nome da loja</label>
            <input
              name="nome"
              defaultValue={loja.nome}
              required
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Telefone de contato</label>
            <input
              name="telefone"
              defaultValue={loja.telefone ?? ''}
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">
              Slug da loja
            </label>
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <span
                className="px-3 py-2.5 text-sm flex-shrink-0"
                style={{ background: 'var(--bg-2)', color: 'var(--ink-3)', borderRight: '1px solid var(--line)' }}
              >
                mallora.app/
              </span>
              <input
                name="slug"
                defaultValue={loja.slug ?? ''}
                placeholder="minha-loja"
                className="flex-1 px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow"
                onChange={(e) => {
                  e.target.value = sanitizarSlug(e.target.value)
                }}
              />
            </div>
            <p className="text-xs text-ink-3 mt-1">
              URL pública da sua loja. Só letras minúsculas, números e hífens.
              {loja.slug && ' Alterar invalida links compartilhados.'}
            </p>
          </div>

          <BotaoSalvar />
        </form>
      </div>
    </div>
  )
}
