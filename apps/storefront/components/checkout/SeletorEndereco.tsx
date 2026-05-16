'use client'

import { useState } from 'react'
import { useAuthStore } from '@mallevo/lib'
import type { Endereco, Json } from '@mallevo/types'

import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * SeletorEndereco — port RN→DOM de
 * apps/mobile-consumer/components/SeletorEndereco.tsx (Stage 3d).
 *
 * Consome `useAuthStore` (@mallevo/lib) e o supabase browser client. A
 * persistência de endereço escreve em `consumers` — depende de sessão
 * consumer (3e): sem `auth.getUser()` o salvar retorna cedo (mesmo guard
 * do mobile). Pré-3e `consumer` é null → lista vazia. Fronteira INERTE.
 * ViaCEP é fetch público (igual ao mobile), funcional já agora.
 */

interface Props {
  enderecos: Endereco[]
  selecionado: Endereco | null
  onSelecionar: (endereco: Endereco) => void
}

const inputBase =
  'h-12 w-full rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink outline-none placeholder:text-ink-soft focus:border-ink'

export function SeletorEndereco({
  enderecos,
  selecionado,
  onSelecionar,
}: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [novoEndereco, setNovoEndereco] = useState<Partial<Endereco>>({
    cidade: 'Divinópolis',
    estado: 'MG',
  })
  const [salvando, setSalvando] = useState(false)
  const consumer = useAuthStore((s) => s.consumer)
  const setConsumer = useAuthStore((s) => s.setConsumer)

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados = await res.json()
      if (!dados.erro) {
        setNovoEndereco((prev) => ({
          ...prev,
          rua: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf,
          cep: cepLimpo,
        }))
      }
    } catch {
      // Ignorar erro de CEP
    }
  }

  async function salvarEndereco() {
    if (!novoEndereco.rua || !novoEndereco.numero || !novoEndereco.bairro) {
      return
    }

    setSalvando(true)

    const enderecoCompleto: Endereco = {
      apelido:
        novoEndereco.apelido || `Endereço ${(enderecos.length ?? 0) + 1}`,
      rua: novoEndereco.rua!,
      numero: novoEndereco.numero!,
      complemento: novoEndereco.complemento,
      bairro: novoEndereco.bairro!,
      cidade: novoEndereco.cidade ?? 'Divinópolis',
      estado: novoEndereco.estado ?? 'MG',
      cep: novoEndereco.cep ?? '',
    }

    const novosEnderecos = [...(enderecos ?? []), enderecoCompleto]

    const supabase = createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      // Sem sessão consumer (3e): não há onde persistir. Inerte pré-3e.
      setSalvando(false)
      return
    }

    await supabase
      .from('consumers')
      .update({ enderecos: novosEnderecos as unknown as Json })
      .eq('user_id', user.id)

    if (consumer) {
      setConsumer({ ...consumer, enderecos: novosEnderecos })
    }

    onSelecionar(enderecoCompleto)
    setAdicionando(false)
    setModalAberto(false)
    setSalvando(false)
  }

  function fecharModal() {
    setModalAberto(false)
    setAdicionando(false)
  }

  function campoMudou(campo: keyof Endereco, valor: string) {
    setNovoEndereco((p) => ({ ...p, [campo]: valor }))
  }

  return (
    <div className="px-6 pt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
        Endereço de entrega
      </p>

      {selecionado ? (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-soft"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-ink">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-bold text-ink">
              {selecionado.apelido ?? selecionado.rua}
            </span>
            <span className="truncate text-[13px] font-medium text-ink-muted">
              {selecionado.rua}, {selecionado.numero}
              {selecionado.complemento ? ` — ${selecionado.complemento}` : ''}
            </span>
            <span className="truncate text-xs font-medium text-ink-soft">
              {selecionado.bairro} — {selecionado.cidade}
            </span>
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-soft"
            aria-hidden
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-line bg-surface text-sm font-extrabold text-ink transition-opacity hover:opacity-75"
        >
          Selecionar endereço
        </button>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={adicionando ? 'Novo endereço' : 'Endereços salvos'}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={fecharModal}
            className="absolute inset-0 bg-black/50"
          />

          <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-xl bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-extrabold text-ink">
                {adicionando ? 'Novo endereço' : 'Endereços salvos'}
              </h2>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto p-5 pb-10">
              {!adicionando ? (
                <>
                  {enderecos.map((end, i) => {
                    const ativo = selecionado === end
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onSelecionar(end)
                          setModalAberto(false)
                        }}
                        className={`rounded-md border p-4 text-left ${
                          ativo
                            ? 'border-accent bg-accent-soft'
                            : 'border-line bg-surface'
                        }`}
                      >
                        <p className="text-sm font-bold text-ink">
                          {end.apelido ?? end.rua}
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium text-ink-muted">
                          {end.rua}, {end.numero}
                          {end.complemento ? ` — ${end.complemento}` : ''}
                        </p>
                        <p className="text-xs font-medium text-ink-soft">
                          {end.bairro} — {end.cidade}
                        </p>
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setAdicionando(true)}
                    className="flex h-12 w-full items-center justify-center rounded-pill border border-line bg-surface text-sm font-extrabold text-ink transition-opacity hover:opacity-75"
                  >
                    Adicionar novo endereço
                  </button>
                </>
              ) : (
                <>
                  <input
                    className={inputBase}
                    value={novoEndereco.apelido ?? ''}
                    onChange={(e) => campoMudou('apelido', e.target.value)}
                    placeholder="Apelido (ex.: Casa, Trabalho)"
                  />
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    maxLength={9}
                    value={novoEndereco.cep ?? ''}
                    onChange={(e) => {
                      campoMudou('cep', e.target.value)
                      buscarCep(e.target.value)
                    }}
                    placeholder="CEP"
                  />
                  <div className="flex gap-3">
                    <input
                      className={`${inputBase} flex-1`}
                      value={novoEndereco.rua ?? ''}
                      onChange={(e) => campoMudou('rua', e.target.value)}
                      placeholder="Rua"
                    />
                    <input
                      className={`${inputBase} w-[100px]`}
                      inputMode="numeric"
                      value={novoEndereco.numero ?? ''}
                      onChange={(e) => campoMudou('numero', e.target.value)}
                      placeholder="Nº"
                    />
                  </div>
                  <input
                    className={inputBase}
                    value={novoEndereco.complemento ?? ''}
                    onChange={(e) =>
                      campoMudou('complemento', e.target.value)
                    }
                    placeholder="Complemento (opcional)"
                  />
                  <input
                    className={inputBase}
                    value={novoEndereco.bairro ?? ''}
                    onChange={(e) => campoMudou('bairro', e.target.value)}
                    placeholder="Bairro"
                  />

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdicionando(false)}
                      className="h-12 flex-1 rounded-pill bg-surfaceMuted text-sm font-extrabold text-ink transition-opacity hover:opacity-75"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={salvarEndereco}
                      disabled={salvando}
                      className="h-12 flex-1 rounded-pill bg-accent text-sm font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {salvando ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
