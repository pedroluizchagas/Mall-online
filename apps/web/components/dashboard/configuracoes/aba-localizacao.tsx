'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarEndereco } from '@/lib/actions/lojas'

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

function BotaoSalvar({ label }: { label: string }) {
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

export function AbaLocalizacao({ loja }: { loja: any }) {
  const [estado, dispatch] = useFormState(atualizarEndereco, null)

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <h2 className="font-semibold text-ink mb-1">Endereço da loja</h2>
      <p className="text-xs text-ink-3 mb-4">
        Endereço usado para cálculo de raio de entrega e exibição pública.
      </p>

      <form action={dispatch} className="space-y-4">
        {estado?.erro && (
          <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
            {estado.erro}
          </p>
        )}
        {estado?.sucesso && (
          <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
            Endereço atualizado.
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-2 mb-1">Rua</label>
            <input name="rua" defaultValue={loja.endereco?.rua ?? ''} className={inputClass} style={{ borderColor: 'var(--line)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Número</label>
            <input name="numero" defaultValue={loja.endereco?.numero ?? ''} className={inputClass} style={{ borderColor: 'var(--line)' }} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">Complemento</label>
          <input name="complemento" defaultValue={loja.endereco?.complemento ?? ''} className={inputClass} style={{ borderColor: 'var(--line)' }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Bairro</label>
            <input name="bairro" defaultValue={loja.endereco?.bairro ?? ''} className={inputClass} style={{ borderColor: 'var(--line)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">CEP</label>
            <input name="cep" defaultValue={loja.endereco?.cep ?? ''} className={inputClass} style={{ borderColor: 'var(--line)' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ink-2 mb-1">Cidade</label>
            <input name="cidade" defaultValue={loja.endereco?.cidade ?? 'Divinópolis'} className={inputClass} style={{ borderColor: 'var(--line)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Estado</label>
            <input name="estado" defaultValue={loja.endereco?.estado ?? 'MG'} maxLength={2} className={`${inputClass} uppercase`} style={{ borderColor: 'var(--line)' }} />
          </div>
        </div>

        <BotaoSalvar label="Salvar endereço" />
      </form>
    </div>
  )
}
