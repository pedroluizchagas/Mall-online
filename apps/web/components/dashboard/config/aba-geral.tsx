'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { atualizarDadosLoja, atualizarImagensLoja } from '@/lib/actions/lojas'

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
        font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
    >
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

export function AbaGeral({ loja }: { loja: any }) {
  const [estadoGeral, dispatchGeral] = useFormState(atualizarDadosLoja, null)
  const [estadoImagens, dispatchImagens] = useFormState(atualizarImagensLoja, null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(null)
  const [previewBanner, setPreviewBanner] = useState<string | null>(null)

  function handleImagemChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setter(url)
    }
  }

  return (
    <div className="space-y-8">
      {/* Imagens */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Imagens da loja</h2>

        <form action={dispatchImagens} className="space-y-4">
          {estadoImagens?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoImagens.erro}
            </p>
          )}
          {estadoImagens?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Imagens atualizadas com sucesso.
            </p>
          )}

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo da loja
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {(previewLogo || loja.logo_url) ? (
                  <img
                    src={previewLogo || loja.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center
                    text-gray-300 text-2xl">
                    ?
                  </div>
                )}
              </div>
              <div>
                <input
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImagemChange(e, setPreviewLogo)}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700
                    file:text-sm file:cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recomendado: 400×400px. JPEG ou PNG.
                </p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner da loja
            </label>
            <div className="space-y-2">
              <div className="w-full h-28 rounded-xl bg-gray-100 overflow-hidden">
                {(previewBanner || loja.banner_url) ? (
                  <img
                    src={previewBanner || loja.banner_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center
                    text-gray-300 text-sm">
                    Sem banner
                  </div>
                )}
              </div>
              <input
                name="banner"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImagemChange(e, setPreviewBanner)}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                  file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700
                  file:text-sm file:cursor-pointer"
              />
              <p className="text-xs text-gray-400">
                Recomendado: 1200×400px. JPEG ou PNG.
              </p>
            </div>
          </div>

          <BotaoSalvar />
        </form>
      </div>

      {/* Dados gerais */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Dados da loja</h2>

        <form action={dispatchGeral} className="space-y-4">
          {estadoGeral?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoGeral.erro}
            </p>
          )}
          {estadoGeral?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Dados atualizados com sucesso.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da loja
            </label>
            <input
              name="nome"
              defaultValue={loja.nome}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              name="descricao"
              defaultValue={loja.descricao ?? ''}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone de contato
            </label>
            <input
              name="telefone"
              defaultValue={loja.telefone ?? ''}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {/* Campos ocultos necessários para a validação completa */}
          <input type="hidden" name="taxa_entrega"
            value={(loja.taxa_entrega / 100).toFixed(2)} />
          <input type="hidden" name="tempo_entrega"
            value={loja.tempo_entrega ?? ''} />
          <input type="hidden" name="raio_entrega_km"
            value={loja.raio_entrega_km ?? ''} />
          <input type="hidden" name="aceita_dinheiro"
            value={String(loja.aceita_dinheiro)} />
          <input type="hidden" name="aceita_pix"
            value={String(loja.aceita_pix)} />
          <input type="hidden" name="aceita_cartao_maquininha"
            value={String(loja.aceita_cartao_maquininha)} />
          <input type="hidden" name="aceita_cartao_online"
            value={String(loja.aceita_cartao_online)} />
          <input type="hidden" name="usa_entregadores_proprios"
            value={String(loja.usa_entregadores_proprios)} />

          <BotaoSalvar />
        </form>
      </div>
    </div>
  )
}
