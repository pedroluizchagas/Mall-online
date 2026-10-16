'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ROTULO_TRANSICAO, TRANSICOES_PEDIDO_LOJISTA } from '@mallevo/lib'
import { atualizarStatusPedido } from '@/lib/actions/pedidos'
import { money, tempoRelativo } from '@/lib/format'
import { cx } from '@/lib/cx'
import { META_STATUS, metaDoStatus, ehAtivo, type StatusPedido } from '@/lib/status-pedido'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { BarraProgresso, Sobrelinha } from '../marquise'
import { ModalAtribuirEntregador } from '../modal-atribuir-entregador'
import { HaQuantoTempo } from '../inicio/ha-quanto-tempo'
import {
  codigoDoPedido,
  formatarAgendamento,
  liquidoDoPedido,
  momentoDoPedido,
  pagoOnline,
  quantidadeDeItens,
  rotuloPagamento,
  type PedidoCompleto,
} from './tipos'

const FLUXO: StatusPedido[] = ['novo', 'confirmado', 'em_preparo', 'aguardando_entregador', 'saiu_para_entrega', 'entregue']

/**
 * O pedido por inteiro — a mesma tela do detalhe no app do lojista: a
 * MARQUISE no topo (quem, o status por extenso, há quanto tempo, a barra e o
 * total em vidro) e a FOLHA embaixo (entrega, itens, valores, linha do tempo)
 * com a próxima ação. As ações saem de TRANSICOES_PEDIDO_LOJISTA (lib), a
 * mesma tabela do app e do servidor.
 *
 * Usado no painel de Pedidos (coluna da direita) e em /pedidos/[id].
 */
export function PedidoDetalhe({
  pedido,
  aoMudarStatus,
  className,
}: {
  pedido: PedidoCompleto
  /** Atualização otimista na lista; sem ela, o servidor redesenha a página. */
  aoMudarStatus?: (id: string, status: StatusPedido) => void
  className?: string
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)

  // Trocar de pedido desarma o "toque de novo para cancelar".
  useEffect(() => setConfirmandoCancelamento(false), [pedido.id])
  useEffect(() => {
    if (!confirmandoCancelamento) return
    const t = window.setTimeout(() => setConfirmandoCancelamento(false), 4000)
    return () => window.clearTimeout(t)
  }, [confirmandoCancelamento])

  const meta = metaDoStatus(pedido.status)
  const ativo = ehAtivo(pedido.status)
  const cliente = pedido.consumers?.nome?.trim() || 'Cliente'
  const telefone = pedido.consumers?.telefone ?? null
  const itens = pedido.order_items ?? []
  const entregador = pedido.delivery_assignments?.[0]?.couriers ?? null
  const transicoes = TRANSICOES_PEDIDO_LOJISTA[pedido.status] ?? []
  const proxima = transicoes.find((s) => s !== 'cancelado')
  const podeCancelar = transicoes.includes('cancelado')
  const agendado = pedido.tipo === 'agendamento' && pedido.agendamento_inicio_at
  const comissao = Number(pedido.platform_fee_amount ?? 100)
  const pago = pedido.payment_status === 'pago'

  function mover(novo: StatusPedido) {
    setConfirmandoCancelamento(false)
    iniciar(async () => {
      const r = await atualizarStatusPedido(pedido.id, novo)
      if (r && 'erro' in r && r.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível atualizar o pedido', descricao: r.erro })
        return
      }
      showToast({
        tipo: 'sucesso',
        titulo: novo === 'cancelado' ? 'Pedido cancelado' : META_STATUS[novo].rotuloLongo,
        descricao: novo === 'cancelado' ? undefined : META_STATUS[novo].descricao,
      })
      if (aoMudarStatus) aoMudarStatus(pedido.id, novo)
      else router.refresh()
    })
  }

  return (
    <article className={cx('cartao flex flex-col overflow-hidden', className)} aria-label={`Pedido ${codigoDoPedido(pedido.id)}`}>
      {/* ── Marquise do pedido ─────────────────────────────────────── */}
      <header className="sobre-escuro grao relative isolate shrink-0 overflow-hidden bg-marquee px-6 pb-6 pt-5 text-white">
        <div aria-hidden className="glow-marquise absolute inset-0 -z-10" />
        <div className="flex items-center justify-between gap-3">
          <Sobrelinha aoVivo={ativo} className="min-w-0">
            <span className="truncate">{ativo ? `Ao vivo · ${cliente}` : `${cliente} · ${momentoDoPedido(pedido.criado_em)}`}</span>
          </Sobrelinha>
          <span className="shrink-0 font-mono text-[12px] text-[color:var(--m-ink-3)]">{codigoDoPedido(pedido.id)}</span>
        </div>

        <h2 className="mt-4 text-[30px] font-semibold leading-[1.02] tracking-[-0.04em]">
          {meta.rotuloLongo}
          {ativo && (
            <span className="block italic text-[color:var(--brick)]">
              <HaQuantoTempo iso={pedido.criado_em} inicial={tempoRelativo(pedido.criado_em)} />.
            </span>
          )}
        </h2>
        <p className="mt-2 text-[13.5px] text-[color:var(--m-ink-2)]">{meta.descricao}</p>

        {pedido.status !== 'cancelado' && (
          <div className="mt-5 flex items-center gap-3">
            <BarraProgresso fracao={meta.progresso} className="flex-1" />
            <span className="font-mono text-[11px] text-[color:var(--m-ink-3)]">{Math.round(meta.progresso * 100)}%</span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-4 rounded-[18px] bg-[color:var(--m-glass)] px-4 py-3.5 ring-1 ring-inset ring-[color:var(--m-line)]">
          <div>
            <p className="micro whitespace-nowrap text-[color:var(--m-ink-3)]">Total do pedido</p>
            <p className="mt-1.5 text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums">{money(pedido.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-semibold">{rotuloPagamento(pedido.forma_pagamento)}</p>
            <p
              className="micro mt-1.5"
              style={{ color: pago ? 'var(--brick)' : 'var(--m-ink-3)' }}
            >
              {pago ? 'Pago' : pagoOnline(pedido.forma_pagamento) ? 'Aguardando pagamento' : 'Receber na entrega'}
            </p>
          </div>
        </div>
      </header>

      {/* ── Folha do pedido ─────────────────────────────────────────── */}
      <div className="flex-1 shrink-0 divide-y divide-line">
        {agendado ? (
          <Bloco sobrelinha="Agendamento" titulo={formatarAgendamento(pedido.agendamento_inicio_at!, pedido.agendamento_fim_at ?? null)}>
            {pedido.service_staff?.nome && (
              <p className="mt-1 flex items-center gap-2 text-[13.5px] text-ink-2">
                <PartnerIcon name="user" size={15} strokeWidth={2} className="text-ink-3" />
                {pedido.service_staff.nome}
              </p>
            )}
          </Bloco>
        ) : (
          pedido.endereco_entrega && (
            <Bloco
              sobrelinha="Entrega"
              titulo={[pedido.endereco_entrega.rua, pedido.endereco_entrega.numero].filter(Boolean).join(', ') || 'Endereço'}
            >
              <p className="mt-0.5 text-[13.5px] text-ink-3">
                {[pedido.endereco_entrega.complemento, pedido.endereco_entrega.bairro, pedido.endereco_entrega.cidade]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {telefone && (
                <a
                  href={`tel:${telefone.replace(/\D/g, '')}`}
                  className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-ink"
                >
                  <PartnerIcon name="phone" size={15} strokeWidth={2} />
                  <span className="sublinha">Ligar para {cliente.split(' ')[0]}</span>
                </a>
              )}
            </Bloco>
          )
        )}

        <Bloco
          sobrelinha={`Pedido · ${momentoDoPedido(pedido.criado_em)}`}
          titulo="Itens"
          direita={
            <span className="micro text-ink-3">
              {quantidadeDeItens(pedido)} {quantidadeDeItens(pedido) === 1 ? 'item' : 'itens'}
            </span>
          }
        >
          {itens.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-3">Sem itens.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {itens.map((it) => {
                const variante = (it.product_variants?.product_variant_options ?? [])
                  .map((vo) => vo?.product_options?.valor)
                  .filter((v): v is string => typeof v === 'string' && v.length > 0)
                  .join(' × ')
                return (
                  <li key={it.id} className="flex items-start gap-3">
                    <span className="mt-px min-w-[28px] font-mono text-[12.5px] font-medium text-ink-2">{it.quantidade}×</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">{it.nome}</span>
                      {variante && <span className="mt-0.5 block text-[12.5px] font-medium text-ink-2">{variante}</span>}
                      {it.modifiers && it.modifiers.length > 0 && (
                        <span className="mt-0.5 block text-[12.5px] text-ink-3">
                          {it.modifiers.map((m) => m.nome).join(', ')}
                        </span>
                      )}
                      {it.observacoes && (
                        <span className="mt-1 block text-[12.5px] italic text-ink-3">&ldquo;{it.observacoes}&rdquo;</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[13.5px] font-semibold text-ink tabular-nums">{money(it.subtotal)}</span>
                  </li>
                )
              })}
            </ul>
          )}

          {/* A conta parte do total pago: a entrega é do entregador, a comissão é da casa. */}
          <dl className="mt-5 space-y-1.5 rounded-[16px] bg-bg-2 p-4 text-[13px]">
            <Linha rotulo="Total do pedido" valor={money(pedido.total)} />
            {Number(pedido.taxa_entrega) > 0 && (
              <Linha rotulo="Taxa de entrega (do entregador)" valor={`− ${money(pedido.taxa_entrega)}`} />
            )}
            <Linha rotulo="Comissão Mallevo" valor={`− ${money(comissao)}`} />
            <div className="flex items-baseline justify-between border-t border-line-2 pt-2.5">
              <dt className="text-[13.5px] font-semibold text-ink">Você recebe</dt>
              <dd className="text-[18px] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(liquidoDoPedido(pedido))}</dd>
            </div>
          </dl>
        </Bloco>

        {pedido.observacoes && (
          <Bloco sobrelinha="Recado do cliente" titulo={<span className="text-[15px] font-medium leading-relaxed">&ldquo;{pedido.observacoes}&rdquo;</span>} />
        )}

        {entregador && (
          <Bloco sobrelinha="Entregador" titulo={entregador.nome}>
            {entregador.telefone && (
              <a
                href={`tel:${entregador.telefone.replace(/\D/g, '')}`}
                className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-ink"
              >
                <PartnerIcon name="phone" size={15} strokeWidth={2} />
                <span className="sublinha">{entregador.telefone}</span>
              </a>
            )}
          </Bloco>
        )}

        {pedido.status === 'cancelado' ? (
          <Bloco sobrelinha="Cancelamento" titulo={pedido.motivo_cancelamento || 'Pedido cancelado'}>
            {pedido.cancelado_em && (
              <p className="mt-1 text-[12.5px] text-ink-3">em {momentoDoPedido(pedido.cancelado_em)}</p>
            )}
          </Bloco>
        ) : (
          <Bloco sobrelinha="Linha do tempo" titulo="Do balcão à porta">
            <ol className="mt-4">
              {FLUXO.map((s, i) => {
                const m = META_STATUS[s]
                const feito = m.ordem < meta.ordem
                const atual = s === pedido.status
                return (
                  <li key={s} className="relative flex gap-3 pb-3 last:pb-0">
                    {i < FLUXO.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[7px] top-4 h-[calc(100%-12px)] w-px"
                        style={{ background: feito ? 'var(--ink)' : 'var(--line-2)' }}
                      />
                    )}
                    <span
                      aria-hidden
                      className={cx('relative mt-0.5 flex size-[15px] shrink-0 items-center justify-center rounded-full', atual && 'pulso')}
                      style={
                        atual
                          ? { background: 'var(--brick)', boxShadow: '0 0 0 2px var(--ink)' }
                          : feito
                            ? { background: 'var(--ink)', color: 'var(--bg)' }
                            : { background: 'var(--bg)', boxShadow: 'inset 0 0 0 1.5px var(--line-2)' }
                      }
                    >
                      {feito && <PartnerIcon name="check" size={9} strokeWidth={3.4} />}
                    </span>
                    <span className={cx('text-[13.5px]', atual ? 'font-semibold text-ink' : feito ? 'font-medium text-ink-2' : 'text-ink-3')}>
                      {m.rotuloLongo}
                    </span>
                  </li>
                )
              })}
            </ol>
          </Bloco>
        )}
      </div>

      {/* ── Ação ─────────────────────────────────────────────────────── */}
      {(proxima || podeCancelar || (pedido.status === 'em_preparo' && !entregador)) && (
        <footer className="sticky bottom-0 flex shrink-0 flex-col gap-2 border-t border-line bg-bg p-4">
          {proxima && (
            <button
              type="button"
              onClick={() => mover(proxima)}
              disabled={pendente}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14.5px] font-bold transition-[background-color,transform] duration-200 bg-brick text-brick-ink hover:bg-brick-dk active:scale-[0.98] disabled:opacity-60"
            >
              <PartnerIcon name={proxima === 'confirmado' ? 'check' : META_STATUS[proxima].icone} size={16} strokeWidth={2.4} />
              {pendente ? 'Atualizando…' : ROTULO_TRANSICAO[proxima] ?? META_STATUS[proxima].rotuloLongo}
            </button>
          )}
          {pedido.status === 'em_preparo' && !entregador && (
            <ModalAtribuirEntregador pedidoId={pedido.id} valorEntrega={pedido.taxa_entrega} />
          )}
          {podeCancelar && (
            <button
              type="button"
              onClick={() => (confirmandoCancelamento ? mover('cancelado') : setConfirmandoCancelamento(true))}
              disabled={pendente}
              className={cx(
                'flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13.5px] font-bold transition-colors duration-200 disabled:opacity-60',
                confirmandoCancelamento ? 'bg-[color:var(--err)] text-bg' : 'text-ink-2 hover:bg-bg-2 hover:text-[color:var(--err)]',
              )}
            >
              <PartnerIcon name="close" size={15} strokeWidth={2.4} />
              {confirmandoCancelamento
                ? 'Toque de novo para confirmar'
                : pedido.status === 'novo'
                  ? 'Recusar pedido'
                  : 'Cancelar pedido'}
            </button>
          )}
        </footer>
      )}
    </article>
  )
}

function Bloco({
  sobrelinha,
  titulo,
  direita,
  children,
}: {
  sobrelinha: string
  titulo: React.ReactNode
  direita?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="micro text-ink-3">{sobrelinha}</p>
          <div className="mt-1.5 text-[16px] font-semibold leading-snug tracking-[-0.015em] text-ink">{titulo}</div>
        </div>
        {direita}
      </div>
      {children}
    </section>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-ink-3">
      <dt>{rotulo}</dt>
      <dd className="shrink-0 whitespace-nowrap tabular-nums">{valor}</dd>
    </div>
  )
}
