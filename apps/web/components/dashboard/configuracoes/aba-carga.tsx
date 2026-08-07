'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { atualizarPerfilCarga } from '@/lib/actions/lojas'

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

/**
 * Perfil de carga da loja — base da cascata de logística (docs/31 §1.1).
 *
 * A tela é deliberadamente curta: uma loja de carga homogênea preenche
 * dois números uma única vez e o cardápio inteiro herda. Quem tem catálogo
 * heterogêneo troca o modo para "por produto" e detalha só onde importa.
 */
export function AbaCarga({ loja }: { loja: any }) {
  const [estado, dispatch] = useFormState(atualizarPerfilCarga, null)
  const [modo, setModo] = useState<'loja' | 'produto'>(
    loja.carga_modo === 'produto' ? 'produto' : 'loja'
  )

  const pesoAtual = loja.carga_item_peso_g ?? 800
  const volumeAtual = ((loja.carga_item_volume_ml ?? 1500) / 1000).toFixed(1)

  return (
    <div
      className="rounded-xl p-5"
      style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <h2 className="font-semibold text-ink mb-1">Perfil de carga</h2>
      <p className="text-xs text-ink-3 mb-4">
        Define qual veículo consegue transportar seus pedidos e permite agrupar
        entregas próximas. Preencha uma vez — o sistema calcula o porte de cada
        pedido somando os itens.
      </p>

      <form action={dispatch} className="space-y-4">
        {estado?.erro && (
          <p
            className="text-sm px-3 py-2 rounded-xl"
            style={{ background: '#fde8e4', color: 'var(--err)' }}
          >
            {estado.erro}
          </p>
        )}
        {estado?.sucesso && (
          <p
            className="text-sm px-3 py-2 rounded-xl"
            style={{ background: '#e6f7e3', color: 'var(--ok)' }}
          >
            Perfil de carga atualizado.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-ink-2 mb-2">
            Como sua carga varia
          </label>
          <div className="space-y-2">
            {[
              {
                valor: 'loja' as const,
                label: 'Meus itens são parecidos',
                descricao:
                  'Açaí, pizzaria, lanchonete, farmácia. Um perfil único vale para o cardápio inteiro.',
              },
              {
                valor: 'produto' as const,
                label: 'Tenho itens de tamanhos bem diferentes',
                descricao:
                  'Mercado, pet shop, bebidas. Libera peso e volume no cadastro de cada produto.',
              },
            ].map((opcao) => {
              const ativo = modo === opcao.valor
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
                    name="carga_modo"
                    value={opcao.valor}
                    checked={ativo}
                    onChange={() => setModo(opcao.valor)}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">
              Peso do item típico (g)
            </label>
            <input
              name="carga_item_peso_g"
              type="number"
              step="50"
              min="1"
              max="300000"
              defaultValue={pesoAtual}
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
            <p className="text-[11px] text-ink-3 mt-1">
              Marmita ~800 g · pizza ~1.100 g · ração 15 kg = 15000
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">
              Volume do item típico (L)
            </label>
            <input
              name="carga_item_volume_l"
              type="number"
              step="0.5"
              min="0.1"
              max="500"
              defaultValue={volumeAtual}
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
            <p className="text-[11px] text-ink-3 mt-1">
              Copo ~1 L · caixa de pizza ~8 L · fardo ~12 L
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
            style={{ border: '1px solid var(--line)' }}
          >
            <input
              type="checkbox"
              name="carga_refrigerada"
              defaultChecked={!!loja.carga_refrigerada}
              className="mt-0.5 accent-brick"
            />
            <div>
              <p className="text-sm font-medium text-ink">Precisa de bag térmica</p>
              <p className="text-xs text-ink-3 mt-0.5">
                Sorvete, açaí, congelados. Só entregadores com bag térmica recebem
                estes pedidos.
              </p>
            </div>
          </label>

          <label
            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
            style={{ border: '1px solid var(--line)' }}
          >
            <input
              type="checkbox"
              name="carga_fragil"
              defaultChecked={!!loja.carga_fragil}
              className="mt-0.5 accent-brick"
            />
            <div>
              <p className="text-sm font-medium text-ink">Carga frágil</p>
              <p className="text-xs text-ink-3 mt-0.5">
                Bolos, ovos, vidros, flores. Limita o agrupamento com outros
                pedidos para não empilhar.
              </p>
            </div>
          </label>
        </div>

        {modo === 'produto' && (
          <p
            className="text-xs px-3 py-2 rounded-xl"
            style={{ background: 'rgba(193,241,72,0.10)', color: 'var(--ink-2)' }}
          >
            Os campos de peso e volume passam a aparecer no cadastro de cada
            produto. Os valores acima continuam valendo como padrão para os
            produtos que você deixar em branco.
          </p>
        )}

        <BotaoSalvar label="Salvar perfil de carga" />
      </form>
    </div>
  )
}
