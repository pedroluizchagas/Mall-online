'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarDadosLoja, atualizarEndereco } from '@/lib/actions/lojas'

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
        font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

export function AbaEntrega({ loja }: { loja: any }) {
  const [estadoEntrega, dispatchEntrega] = useFormState(atualizarDadosLoja, null)
  const [estadoEndereco, dispatchEndereco] = useFormState(atualizarEndereco, null)

  return (
    <div className="space-y-6">

      {/* Configurações de entrega */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Configurações de entrega
        </h2>

        <form action={dispatchEntrega} className="space-y-4">
          {estadoEntrega?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoEntrega.erro}
            </p>
          )}
          {estadoEntrega?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Configurações atualizadas.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa de entrega (R$)
              </label>
              <input
                name="taxa_entrega"
                type="number"
                step="0.50"
                min="0"
                defaultValue={loja.taxa_entrega ? (loja.taxa_entrega / 100).toFixed(2) : '0'}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tempo médio (minutos)
              </label>
              <input
                name="tempo_entrega"
                type="number"
                min="5"
                max="180"
                defaultValue={loja.tempo_entrega ?? 45}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raio de entrega (km)
            </label>
            <input
              name="raio_entrega_km"
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              defaultValue={loja.raio_entrega_km ?? 5}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {/* Tipo de entregador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entregadores
            </label>
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
              ].map((opcao) => (
                <label
                  key={opcao.valor}
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer
                    transition-colors ${
                    String(loja.usa_entregadores_proprios) === opcao.valor
                      ? 'border-[#4CAF82] bg-green-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="usa_entregadores_proprios"
                    value={opcao.valor}
                    defaultChecked={
                      String(loja.usa_entregadores_proprios) === opcao.valor
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {opcao.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {opcao.descricao}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Campos ocultos para campos não editados nesta aba */}
          <input type="hidden" name="nome" value={loja.nome} />
          <input type="hidden" name="descricao" value={loja.descricao ?? ''} />
          <input type="hidden" name="telefone" value={loja.telefone ?? ''} />
          <input type="hidden" name="aceita_dinheiro"
            value={String(loja.aceita_dinheiro)} />
          <input type="hidden" name="aceita_pix"
            value={String(loja.aceita_pix)} />
          <input type="hidden" name="aceita_cartao_maquininha"
            value={String(loja.aceita_cartao_maquininha)} />
          <input type="hidden" name="aceita_cartao_online"
            value={String(loja.aceita_cartao_online)} />

          <BotaoSalvar label="Salvar configurações" />
        </form>
      </div>

      {/* Endereço da loja */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Endereço da loja
        </h2>

        <form action={dispatchEndereco} className="space-y-4">
          {estadoEndereco?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoEndereco.erro}
            </p>
          )}
          {estadoEndereco?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Endereço atualizado.
            </p>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rua
              </label>
              <input
                name="rua"
                defaultValue={loja.endereco?.rua ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número
              </label>
              <input
                name="numero"
                defaultValue={loja.endereco?.numero ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complemento
            </label>
            <input
              name="complemento"
              defaultValue={loja.endereco?.complemento ?? ''}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <input
                name="bairro"
                defaultValue={loja.endereco?.bairro ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                name="cep"
                defaultValue={loja.endereco?.cep ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                name="cidade"
                defaultValue={loja.endereco?.cidade ?? 'Divinópolis'}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <input
                name="estado"
                defaultValue={loja.endereco?.estado ?? 'MG'}
                maxLength={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82] uppercase"
              />
            </div>
          </div>

          <BotaoSalvar label="Salvar endereço" />
        </form>
      </div>
    </div>
  )
}
