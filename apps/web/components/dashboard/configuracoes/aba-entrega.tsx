'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarConfigEntrega } from '@/lib/actions/lojas'

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

export function AbaEntrega({ loja }: { loja: any }) {
  const [estado, dispatch] = useFormState(atualizarConfigEntrega, null)

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <h2 className="font-semibold text-ink mb-1">Configurações de entrega</h2>
      <p className="text-xs text-ink-3 mb-4">
        Taxa, tempo, raio e quem entrega. O endereço da loja fica em <strong>Localização</strong>.
      </p>

      <form action={dispatch} className="space-y-4">
        {estado?.erro && (
          <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
            {estado.erro}
          </p>
        )}
        {estado?.sucesso && (
          <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
            Configurações atualizadas.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Taxa de entrega (R$)</label>
            <input
              name="taxa_entrega"
              type="number"
              step="0.50"
              min="0"
              defaultValue={loja.taxa_entrega ? (loja.taxa_entrega / 100).toFixed(2) : '0'}
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Tempo médio (minutos)</label>
            <input
              name="tempo_entrega"
              type="number"
              min="5"
              max="180"
              defaultValue={loja.tempo_entrega ?? 45}
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">Raio de entrega (km)</label>
          <input
            name="raio_entrega_km"
            type="number"
            step="0.5"
            min="0.5"
            max="50"
            defaultValue={loja.raio_entrega_km ?? 5}
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-2 mb-2">Entregadores</label>
          <div className="space-y-2">
            {[
              {
                valor: 'false',
                label: 'Pool da plataforma',
                descricao: 'Pedidos são oferecidos para entregadores autônomos disponíveis',
              },
              {
                valor: 'true',
                label: 'Meus entregadores',
                descricao: 'Apenas entregadores cadastrados na minha loja recebem pedidos',
              },
            ].map((opcao) => {
              const ativo = String(loja.usa_entregadores_proprios) === opcao.valor
              return (
                <label
                  key={opcao.valor}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    border: ativo ? '1px solid var(--brick)' : '1px solid var(--line)',
                    background: ativo ? 'rgba(193,241,72,0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="usa_entregadores_proprios"
                    value={opcao.valor}
                    defaultChecked={ativo}
                    className="mt-0.5 accent-brick"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{opcao.label}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{opcao.descricao}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <BotaoSalvar label="Salvar configurações" />
      </form>
    </div>
  )
}
