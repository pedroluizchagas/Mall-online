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
      className="px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
    >
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

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
    if (file) setter(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-8">
      {/* Imagens */}
      <div
        className="rounded-xl p-5"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <h2 className="font-semibold text-ink mb-4">Imagens da loja</h2>

        <form action={dispatchImagens} className="space-y-4">
          {estadoImagens?.erro && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#fde8e4', color: 'var(--err)' }}>
              {estadoImagens.erro}
            </p>
          )}
          {estadoImagens?.sucesso && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ background: '#e6f7e3', color: 'var(--ok)' }}>
              Imagens atualizadas com sucesso.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-2">Logo da loja</label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: 'var(--bg-2)' }}
              >
                {(previewLogo || loja.logo_url) ? (
                  <img src={previewLogo || loja.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-3 text-2xl">?</div>
                )}
              </div>
              <div>
                <input
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImagemChange(e, setPreviewLogo)}
                  className="text-sm text-ink-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
                  style={{ '--tw-file-bg': 'var(--bg-2)' } as React.CSSProperties}
                />
                <p className="text-xs text-ink-3 mt-1">Recomendado: 400×400px. JPEG ou PNG.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-2">Banner da loja</label>
            <div className="space-y-2">
              <div
                className="w-full h-28 rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-2)' }}
              >
                {(previewBanner || loja.banner_url) ? (
                  <img src={previewBanner || loja.banner_url} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-3 text-sm">Sem banner</div>
                )}
              </div>
              <input
                name="banner"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImagemChange(e, setPreviewBanner)}
                className="text-sm text-ink-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
              />
              <p className="text-xs text-ink-3">Recomendado: 1200×400px. JPEG ou PNG.</p>
            </div>
          </div>

          <BotaoSalvar />
        </form>
      </div>

      {/* Dados gerais */}
      <div
        className="rounded-xl p-5"
        style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <h2 className="font-semibold text-ink mb-4">Dados da loja</h2>

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
            <label className="block text-sm font-medium text-ink-2 mb-1">Descrição</label>
            <textarea
              name="descricao"
              defaultValue={loja.descricao ?? ''}
              rows={3}
              className={`${inputClass} resize-none`}
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

          <input type="hidden" name="taxa_entrega" value={(loja.taxa_entrega / 100).toFixed(2)} />
          <input type="hidden" name="tempo_entrega" value={loja.tempo_entrega ?? ''} />
          <input type="hidden" name="raio_entrega_km" value={loja.raio_entrega_km ?? ''} />
          <input type="hidden" name="aceita_dinheiro" value={String(loja.aceita_dinheiro)} />
          <input type="hidden" name="aceita_pix" value={String(loja.aceita_pix)} />
          <input type="hidden" name="aceita_cartao_maquininha" value={String(loja.aceita_cartao_maquininha)} />
          <input type="hidden" name="aceita_cartao_online" value={String(loja.aceita_cartao_online)} />
          <input type="hidden" name="usa_entregadores_proprios" value={String(loja.usa_entregadores_proprios)} />

          <BotaoSalvar />
        </form>
      </div>
    </div>
  )
}
