'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { atribuirEntregador } from '@/lib/actions/pedidos'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { useFocoNoDialogo } from './hooks/use-foco-no-dialogo'

interface Props {
  pedidoId: string
  /** Taxa de entrega do pedido, em centavos (vai para o entregador). */
  valorEntrega: number
}

interface Entregador {
  id: string
  nome: string
  telefone: string | null
  foto_url: string | null
  tipo: string
  online: boolean | null
}

/**
 * "Atribuir entregador" — escolher quem leva, entre os entregadores próprios
 * da loja e os autônomos online. Folha clara sobre véu escuro.
 */
export function ModalAtribuirEntregador({ pedidoId, valorEntrega }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [entregadores, setEntregadores] = useState<Entregador[] | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const caixaRef = useRef<HTMLDivElement>(null)
  const fechar = useCallback(() => setAberto(false), [])
  useFocoNoDialogo(aberto, caixaRef, fechar)

  useEffect(() => {
    if (!aberto) return
    const supabase = createSupabaseClient()
    let vivo = true

    async function carregar() {
      const { data: tenant } = await supabase.from('tenants').select('id').single()
      if (!tenant) return

      const { data } = await supabase
        .from('couriers')
        .select('id, nome, telefone, foto_url, tipo, online')
        .eq('status', 'aprovado')
        .or(`tenant_id.eq.${tenant.id},and(tipo.eq.autonomo,online.eq.true)`)
        .order('tipo')

      if (vivo) setEntregadores((data ?? []) as Entregador[])
    }

    void carregar()
    return () => {
      vivo = false
    }
  }, [aberto])

  function handleAtribuir() {
    if (!selecionado) return
    startTransition(async () => {
      const resultado = await atribuirEntregador(pedidoId, selecionado, valorEntrega)
      if (resultado.sucesso) {
        setAberto(false)
        showToast({ tipo: 'sucesso', titulo: 'Entregador chamado', descricao: 'O pedido aguarda a coleta.' })
        router.refresh()
      } else if (resultado.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível atribuir', descricao: resultado.erro })
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-bold text-ink ring-1 ring-inset ring-line-2 transition-colors hover:bg-bg-2"
      >
        <PartnerIcon name="bike" size={16} strokeWidth={2} />
        Escolher o entregador
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(9,9,11,0.55)] p-4 backdrop-blur-[3px] sm:items-center"
          onMouseDown={() => setAberto(false)}
        >
          <div
            ref={caixaRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-atribuir"
            className="slide-up w-full max-w-md rounded-[28px] bg-bg p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="micro text-ink-3">Entrega · {money(valorEntrega)} para quem levar</p>
            <h3 id="titulo-atribuir" className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
              Quem leva este pedido?
            </h3>

            <div className="mt-5 max-h-72 space-y-2 overflow-auto pr-1">
              {entregadores === null ? (
                <p className="py-6 text-center text-[13.5px] text-ink-3">Procurando entregadores…</p>
              ) : entregadores.length === 0 ? (
                <p className="rounded-[16px] bg-bg-2 px-4 py-5 text-center text-[13.5px] text-ink-3">
                  Nenhum entregador disponível agora — nem da loja, nem autônomo online.
                </p>
              ) : (
                entregadores.map((courier) => {
                  const sel = selecionado === courier.id
                  return (
                    <button
                      key={courier.id}
                      type="button"
                      onClick={() => setSelecionado(courier.id)}
                      aria-pressed={sel}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-[16px] p-3 text-left transition-[box-shadow,background-color] duration-200',
                        sel ? 'bg-bg-2 ring-2 ring-ink' : 'ring-1 ring-inset ring-line hover:bg-bg-2',
                      )}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-3 text-ink">
                        {courier.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={courier.foto_url} alt="" className="size-full object-cover" />
                        ) : (
                          <PartnerIcon name="bike" size={17} strokeWidth={1.9} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-ink">{courier.nome}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                          {courier.tipo === 'proprio' ? 'Entregador da loja' : 'Autônomo'}
                          {courier.online && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--ok)' }}>
                                <span className="size-1.5 rounded-full" style={{ background: 'var(--ok)' }} />
                                online
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={sel ? { background: 'var(--ink)', color: 'var(--bg)' } : { boxShadow: 'inset 0 0 0 1.5px var(--line-2)' }}
                      >
                        {sel && <PartnerIcon name="check" size={11} strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="h-11 flex-1 rounded-full text-[13.5px] font-bold text-ink-2 ring-1 ring-inset ring-line-2 transition-colors hover:bg-bg-2"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleAtribuir}
                disabled={!selecionado || isPending}
                className="h-11 flex-1 rounded-full text-[13.5px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                {isPending ? 'Chamando…' : 'Chamar este entregador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
