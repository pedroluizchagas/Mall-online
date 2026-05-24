'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrderStore } from '@mallevo/lib'
import type { Endereco } from '@mallevo/types'

import { createSupabaseClient } from '@/lib/supabase/client'
import {
  ehAtivo,
  metaDoStatus,
  type CorStatus,
} from '@/lib/status-pedido'
import {
  OrderStatusTimeline,
  IconeStatusSvg,
} from '@/components/order/OrderStatusTimeline'
import { OrderItemsList } from '@/components/order/OrderItemsList'
import { useLocalizacaoCourier } from '@/components/order/useLocalizacaoCourier'

/**
 * PedidoClient — port RN→DOM de
 * apps/mobile-consumer/app/pedido/[id].tsx (Stage 3f).
 *
 * Recebe `pedidoInicial` já vindo do Server Component (auth/RLS). Assina
 * Realtime UPDATE em `orders.id=eq.<id>` e refresca o estado local.
 * `useOrderStore` consumido de @mallevo/lib SEM editar (espelha 3c/3e).
 *
 * **Sem mapa nesta fase (decisão TL §3f):** a localização do entregador
 * aparece como bloco textual (nome + lat/long + indicador "ao vivo");
 * adicionar Leaflet/Google Maps é trabalho posterior, fora do escopo de
 * "port estrutural".
 */

interface OrderItem {
  id: string
  nome: string
  quantidade: number
  preco_unit: number
  subtotal: number
  observacoes?: string | null
  modifiers?:
    | Array<{ modifier_id: string; nome: string; preco_extra: number }>
    | null
}

interface DeliveryAssignment {
  id: string
  status: string | null
  courier_id: string | null
  couriers: {
    id: string
    nome: string | null
    telefone: string | null
  } | null
}

export interface PedidoCompleto {
  id: string
  status: string
  payment_status: string | null
  forma_pagamento: string | null
  subtotal: number
  taxa_entrega: number
  total: number
  criado_em: string | null
  endereco_entrega: Endereco | null
  observacoes: string | null
  motivo_cancelamento: string | null
  tipo: string | null
  agendamento_inicio_at: string | null
  agendamento_fim_at: string | null
  staff_id: string | null
  order_items: OrderItem[]
  delivery_assignments: DeliveryAssignment[] | null
}

export interface LojaPedido {
  nome: string
  telefone: string | null
  slug: string | null
}

export function PedidoClient({
  pedidoInicial,
  loja,
}: {
  pedidoInicial: PedidoCompleto
  loja: LojaPedido
}) {
  const router = useRouter()
  const setStatusAtual = useOrderStore((s) => s.setStatusAtual)
  const [pedido, setPedido] = useState<PedidoCompleto>(pedidoInicial)

  const courier = pedido.delivery_assignments?.[0]?.couriers ?? null
  const courierId = pedido.delivery_assignments?.[0]?.courier_id ?? null
  const localizacao = useLocalizacaoCourier(courierId)

  useEffect(() => {
    setStatusAtual(pedidoInicial.status)
  }, [pedidoInicial.status, setStatusAtual])

  useEffect(() => {
    const supabase = createSupabaseClient()
    const canal = supabase
      .channel(`pedido-${pedidoInicial.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${pedidoInicial.id}`,
        },
        (payload) => {
          const novo = payload.new as Partial<PedidoCompleto>
          setPedido((prev) => ({ ...prev, ...novo }))
          if (novo.status) setStatusAtual(novo.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [pedidoInicial.id, setStatusAtual])

  function abrirWhatsApp() {
    const telefone = loja.telefone?.replace(/\D/g, '')
    if (!telefone) return
    const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(
        'Olá, tenho uma dúvida sobre meu pedido'
      )}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const statusAtual = pedido.status ?? 'novo'
  const meta = metaDoStatus(statusAtual)
  const endereco = pedido.endereco_entrega
  const isCancelado = statusAtual === 'cancelado'
  const exibirLocalizacao =
    statusAtual === 'saiu_para_entrega' && localizacao && endereco

  return (
    <div className="min-h-screen bg-canvas pb-10">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surfaceMuted text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-base font-extrabold text-ink">Acompanhamento</h1>
      </header>

      {/* Status atual em destaque (card escuro) */}
      <div className="px-4">
        <div className="rounded-lg bg-surfaceDark p-6">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full ${corBgSoft(
                meta.cor
              )} ${corText(meta.cor)}`}
            >
              <IconeStatusSvg nome={meta.icone} size={26} strokeWidth={2} />
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                {isCancelado ? 'Pedido cancelado' : 'Status atual'}
              </p>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-white">
                {meta.rotuloLongo}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-ink-soft">
                {meta.descricao}
              </p>
            </div>
          </div>

          {isCancelado && pedido.motivo_cancelamento && (
            <div className="mt-3 rounded-md bg-danger/20 p-3">
              <p className="text-xs font-semibold text-danger">
                Motivo: {pedido.motivo_cancelamento}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Entregador + localização (sem mapa — decisão TL §3f) */}
      {statusAtual === 'saiu_para_entrega' && courier && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-soft">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-base font-extrabold text-ink">
              {courier.nome?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
                Entregador
              </p>
              <p className="mt-0.5 text-base font-bold text-ink">
                {courier.nome ?? '—'}
              </p>
            </div>
            {courier.telefone && (
              <a
                href={`tel:${courier.telefone}`}
                aria-label={`Ligar para ${courier.nome ?? 'entregador'}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-accent"
              >
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
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                </svg>
              </a>
            )}
          </div>

          {exibirLocalizacao && (
            <div className="mt-2 flex items-center gap-3 rounded-lg bg-surface p-3 shadow-soft">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
              </span>
              <p className="flex-1 text-xs font-medium text-ink-muted">
                Posição ao vivo: {localizacao!.latitude.toFixed(5)},{' '}
                {localizacao!.longitude.toFixed(5)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {!isCancelado && (
        <div className="px-6 pt-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-muted">
            Acompanhamento
          </p>
          <OrderStatusTimeline statusAtual={statusAtual} />
        </div>
      )}

      {/* Itens */}
      <div className="px-6 pt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
          Itens do pedido
        </p>
        <OrderItemsList
          itens={pedido.order_items}
          subtotal={pedido.subtotal}
          taxa_entrega={pedido.taxa_entrega}
          total={pedido.total}
        />
      </div>

      {/* Agendamento — ESTRUTURAL/INERTE (storefront não cria agendamento até pós-3e). */}
      {pedido.tipo === 'agendamento' && pedido.agendamento_inicio_at && (
        <div className="px-6 pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
            Agendamento
          </p>
          <div className="rounded-lg bg-surface p-4 shadow-soft">
            <p className="text-sm font-bold text-ink">
              📅{' '}
              {formatarAgendamentoBruto(
                pedido.agendamento_inicio_at,
                pedido.agendamento_fim_at
              )}
            </p>
            <p className="mt-1.5 text-[13px] font-medium text-ink-muted">
              Local: {loja.nome}
            </p>
          </div>
        </div>
      )}

      {/* Endereço de entrega */}
      {pedido.tipo !== 'agendamento' && endereco && (
        <div className="px-6 pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
            Endereço de entrega
          </p>
          <div className="flex items-start gap-3 rounded-lg bg-surface p-4 shadow-soft">
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
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">
                {endereco.rua}, {endereco.numero}
                {endereco.complemento ? ` — ${endereco.complemento}` : ''}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-ink-muted">
                {endereco.bairro} — {endereco.cidade}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col gap-3 px-6 pt-6">
        {loja.telefone && ehAtivo(statusAtual) && (
          <button
            type="button"
            onClick={abrirWhatsApp}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-line bg-surface text-sm font-extrabold text-ink transition-opacity hover:opacity-80"
          >
            Falar com {loja.nome}
          </button>
        )}
        {statusAtual === 'entregue' && (
          <button
            type="button"
            onClick={() => router.replace('/')}
            className="h-14 w-full rounded-pill bg-accent text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90"
          >
            Voltar ao início
          </button>
        )}
      </div>
    </div>
  )
}

function corBgSoft(cor: CorStatus): string {
  return cor === 'warning'
    ? 'bg-warning/20'
    : cor === 'info'
    ? 'bg-info/20'
    : cor === 'success'
    ? 'bg-success/20'
    : cor === 'danger'
    ? 'bg-danger/20'
    : 'bg-accent-soft'
}

function corText(cor: CorStatus): string {
  return cor === 'warning'
    ? 'text-warning'
    : cor === 'info'
    ? 'text-info'
    : cor === 'success'
    ? 'text-success'
    : cor === 'danger'
    ? 'text-danger'
    : 'text-accent'
}

const DIAS_CURTOS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function formatarAgendamentoBruto(
  inicioIso: string,
  fimIso: string | null
): string {
  const ini = new Date(inicioIso)
  const dia = String(ini.getDate()).padStart(2, '0')
  const mes = String(ini.getMonth() + 1).padStart(2, '0')
  const sem = DIAS_CURTOS_PT[ini.getDay()]
  const horaIni = `${String(ini.getHours()).padStart(2, '0')}:${String(
    ini.getMinutes()
  ).padStart(2, '0')}`
  if (!fimIso) return `${sem} ${dia}/${mes} às ${horaIni}`
  const fim = new Date(fimIso)
  const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(
    fim.getMinutes()
  ).padStart(2, '0')}`
  return `${sem} ${dia}/${mes} às ${horaIni} — ${horaFim}`
}
