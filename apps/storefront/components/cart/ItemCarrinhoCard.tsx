'use client'

import { useCartStore } from '@mallevo/lib'
import type { ItemCarrinho, ItemCarrinhoAgendamento } from '@mallevo/types'

import { formatarReais } from '@/lib/format'

/**
 * ItemCarrinhoCard — reescrita RN→DOM de
 * apps/mobile-consumer/components/ItemCarrinhoCard.tsx (subestágio 3c).
 *
 * Consome as ações reais do `useCartStore` (@mallevo/lib): NÃO reimplementa
 * lógica do store. `readonly` esconde os controles (espelha o uso em
 * pedido/[id] do mobile; aqui mantido por paridade).
 *
 * O ramo de agendamento (`formatarAgendamento`) é portado e mantido
 * ESTRUTURALMENTE porém INERTE: o storefront não cria itens de agendamento
 * até pós-3e, então `item.agendamento` é sempre indefinido aqui — o ramo
 * nunca renderiza. Espelha o padrão `erroValidacao` do 3b (estrutura
 * presente, caminho inativo) e mantém fidelidade à fonte mobile.
 *
 * Spec/decisão: docs/storefront/05-stage-3-storefront.md §3c.
 */

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function formatarAgendamento(a: ItemCarrinhoAgendamento): string {
  const d = new Date(a.inicio_at)
  const diaSemana = DIAS_CURTOS[d.getDay()]
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const hora = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const staff = a.staff_nome ?? 'Qualquer'
  return `${diaSemana} ${dia}/${mes} às ${hora}:${min} com ${staff}`
}

interface Props {
  item: ItemCarrinho
  /** Esconde os controles +/-/remover (paridade com pedido/[id] mobile). */
  readonly?: boolean
}

export function ItemCarrinhoCard({ item, readonly = false }: Props) {
  const aumentarQuantidade = useCartStore((s) => s.aumentarQuantidade)
  const diminuirQuantidade = useCartStore((s) => s.diminuirQuantidade)
  const removerItem = useCartStore((s) => s.removerItem)

  const precoExtra =
    item.modifiers?.reduce((acc, m) => acc + m.preco_extra, 0) ?? 0
  const totalLinha = (item.preco + precoExtra) * item.quantidade
  const eUltimo = item.quantidade === 1
  const rotuloVariant = item.variant?.rotulo ?? null
  const resumoModifiers =
    item.modifiers && item.modifiers.length > 0
      ? item.modifiers.map((m) => m.nome).join(', ')
      : null
  // INERTE: storefront não cria itens de agendamento até pós-3e.
  const resumoAgendamento = item.agendamento
    ? formatarAgendamento(item.agendamento)
    : null

  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-bold text-ink">{item.nome}</p>

        {resumoAgendamento && (
          <p className="line-clamp-2 text-xs font-semibold text-ink-muted">
            📅 {resumoAgendamento}
          </p>
        )}
        {rotuloVariant && (
          <p className="truncate text-xs font-semibold text-ink-muted">
            {rotuloVariant}
          </p>
        )}
        {resumoModifiers && (
          <p className="line-clamp-2 text-xs font-medium text-ink-muted">
            {resumoModifiers}
          </p>
        )}
        {item.observacoes && (
          <p className="truncate text-xs font-medium text-ink-muted">
            {item.observacoes}
          </p>
        )}

        <p className="mt-0.5 text-sm font-extrabold text-ink">
          {formatarReais(totalLinha)}
        </p>
      </div>

      {readonly ? (
        item.agendamento ? null : (
          <span className="px-2 text-sm font-extrabold text-ink-muted">
            ×{item.quantidade}
          </span>
        )
      ) : item.agendamento ? (
        <BotaoQty
          icone="close"
          variante="danger"
          aoClicar={() => removerItem(item.linha_id)}
          aria="Remover agendamento"
        />
      ) : (
        <div className="flex items-center gap-2.5">
          <BotaoQty
            icone={eUltimo ? 'close' : 'minus'}
            variante={eUltimo ? 'danger' : 'neutro'}
            aoClicar={() =>
              eUltimo
                ? removerItem(item.linha_id)
                : diminuirQuantidade(item.linha_id)
            }
            aria={eUltimo ? 'Remover item' : 'Diminuir quantidade'}
          />
          <span className="w-[22px] text-center text-sm font-extrabold text-ink">
            {item.quantidade}
          </span>
          <BotaoQty
            icone="plus"
            variante="primario"
            aoClicar={() => aumentarQuantidade(item.linha_id)}
            aria="Aumentar quantidade"
          />
        </div>
      )}
    </div>
  )
}

function BotaoQty({
  icone,
  variante,
  aoClicar,
  aria,
}: {
  icone: 'minus' | 'plus' | 'close'
  variante: 'neutro' | 'danger' | 'primario'
  aoClicar: () => void
  aria: string
}) {
  const classeFundo =
    variante === 'danger'
      ? 'bg-danger/15 text-danger'
      : variante === 'primario'
      ? 'bg-ink text-accent'
      : 'bg-surfaceMuted text-ink'

  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={aria}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-75 ${classeFundo}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {icone === 'minus' && <path d="M5 12h14" />}
        {icone === 'plus' && <path d="M12 5v14M5 12h14" />}
        {icone === 'close' && <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </button>
  )
}
