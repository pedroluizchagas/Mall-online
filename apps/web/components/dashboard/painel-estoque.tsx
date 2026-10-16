'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BarraEstoque } from './barra-estoque'
import { ModalMovimentacao } from './modal-movimentacao'
import { toggleControleEstoque } from '@/lib/actions/estoque'
import { showToast } from '@/components/ui/toast'

interface Produto {
  id: string
  nome: string
  foto_url?: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity?: number | null
  stock_minimo?: number | null
  categories?: { nome: string } | null
}

interface Props {
  produtos: Produto[]
}

export function PainelEstoque({ produtos }: Props) {
  const produtosComEstoque = produtos.filter((p) => p.track_stock)
  const semEstoque = produtos.filter((p) => !p.track_stock)
  const alertas = produtosComEstoque.filter(
    (p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 0)
  )

  return (
    <div className="space-y-6">
      {alertas.length > 0 && (
        <div className="rounded-[20px] p-5" style={{ background: 'var(--warn-lt)' }}>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--warn)' }}>
            {alertas.length} produto{alertas.length !== 1 ? 's' : ''} com estoque baixo
          </p>
          <ul className="mt-2 space-y-1">
            {alertas.map((p) => (
              <li key={p.id} className="text-[13.5px] text-ink-2">
                <span className="font-semibold text-ink">{p.nome}</span> — {p.stock_quantity ?? 0} unidade
                {(p.stock_quantity ?? 0) !== 1 ? 's' : ''} restante
                {(p.stock_quantity ?? 0) !== 1 ? 's' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {produtosComEstoque.length > 0 && (
        <div>
          <p className="micro mb-3 text-ink-3">Com controle de estoque</p>
          <div className="space-y-3">
            {produtosComEstoque.map((produto) => (
              <CardEstoque key={produto.id} produto={produto} />
            ))}
          </div>
        </div>
      )}

      {semEstoque.length > 0 && (
        <div>
          <p className="micro mb-3 text-ink-3">Sem controle de estoque</p>
          <div className="cartao divide-y divide-line overflow-hidden">
            {semEstoque.map((produto) => (
              <div key={produto.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <span className="text-[14px] font-semibold text-ink">{produto.nome}</span>
                <BotaoToggleEstoque
                  produtoId={produto.id}
                  ativar
                  label="Ativar controle"
                  variante="primario"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CardEstoque({ produto }: { produto: Produto }) {
  const [modalAberto, setModalAberto] = useState<'entrada' | 'ajuste' | null>(null)

  const estaAbaixoMinimo = (produto.stock_quantity ?? 0) <= (produto.stock_minimo ?? 0)
  const estaZerado = (produto.stock_quantity ?? 0) === 0

  const borderColor = estaZerado
    ? 'var(--err)'
    : estaAbaixoMinimo
    ? 'var(--warn)'
    : 'var(--line)'

  const quantColor = estaZerado
    ? 'var(--err)'
    : estaAbaixoMinimo
    ? 'var(--warn)'
    : 'var(--ink)'

  return (
    <>
      <div
        className="cartao p-5"
        style={borderColor !== 'var(--line)' ? { boxShadow: `0 0 0 1.5px ${borderColor}, var(--shadow-card)` } : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[15px] font-semibold text-ink">{produto.nome}</p>
            {produto.categories?.nome && (
              <p className="text-xs text-ink-3 mt-0.5">{produto.categories.nome}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold leading-none tracking-[-0.04em] tabular-nums" style={{ color: quantColor }}>
              {produto.stock_quantity ?? 0}
            </p>
            <p className="text-xs text-ink-3">unidades</p>
          </div>
        </div>

        {produto.stock_minimo != null && produto.stock_minimo > 0 && (
          <BarraEstoque atual={produto.stock_quantity ?? 0} minimo={produto.stock_minimo} />
        )}

        {estaZerado && (
          <p className="text-xs mt-2" style={{ color: 'var(--err)' }}>
            Produto indisponível — estoque zerado
          </p>
        )}
        {!estaZerado && estaAbaixoMinimo && (
          <p className="text-xs mt-2" style={{ color: 'var(--warn)' }}>
            Estoque abaixo do mínimo ({produto.stock_minimo} unidades)
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setModalAberto('entrada')}
            className="h-10 flex-1 rounded-full bg-ink text-[13.5px] font-bold text-bg transition-opacity hover:opacity-90"
          >
            Entrada
          </button>
          <button
            type="button"
            onClick={() => setModalAberto('ajuste')}
            className="h-10 flex-1 rounded-full text-[13.5px] font-bold text-ink ring-1 ring-inset ring-line-2 transition-colors hover:bg-bg-2"
          >
            Ajuste
          </button>
          <a
            href={`/estoque/${produto.id}`}
            className="flex h-10 flex-1 items-center justify-center rounded-full text-[13.5px] font-bold text-ink ring-1 ring-inset ring-line-2 transition-colors hover:bg-bg-2"
          >
            Histórico
          </a>
        </div>

        <div className="flex justify-end mt-2">
          <BotaoToggleEstoque
            produtoId={produto.id}
            ativar={false}
            label="Desativar controle"
            variante="sutil"
          />
        </div>
      </div>

      {modalAberto && (
        <ModalMovimentacao
          produto={produto}
          tipo={modalAberto}
          onFechar={() => setModalAberto(null)}
        />
      )}
    </>
  )
}

function BotaoToggleEstoque({
  produtoId,
  ativar,
  label,
  variante,
}: {
  produtoId: string
  ativar: boolean
  label: string
  variante: 'primario' | 'sutil'
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  function handleClick() {
    if (
      !ativar &&
      !window.confirm(
        'Desativar o controle de estoque deste produto? A quantidade atual e o estoque mínimo serão zerados.'
      )
    ) {
      return
    }

    iniciar(async () => {
      const resultado = await toggleControleEstoque(produtoId, ativar)
      if (resultado?.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível alterar o controle', descricao: resultado.erro })
        return
      }
      router.refresh()
    })
  }

  // Repetido em cada linha: contorno, nunca lima — o accent é caro.
  const classe =
    variante === 'primario'
      ? 'h-9 px-4 text-[13px] font-bold text-ink ring-1 ring-inset ring-line-2 hover:bg-bg-2'
      : 'h-8 px-3 text-[12.5px] font-semibold text-ink-3 hover:bg-bg-2 hover:text-ink'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pendente}
      className={`whitespace-nowrap rounded-full transition-colors disabled:opacity-50 ${classe}`}
    >
      {pendente ? 'Aguarde…' : label}
    </button>
  )
}
