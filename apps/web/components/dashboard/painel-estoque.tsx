'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BarraEstoque } from './barra-estoque'
import { ModalMovimentacao } from './modal-movimentacao'
import { toggleControleEstoque } from '@/lib/actions/estoque'

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
        <div
          className="rounded-xl p-4"
          style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: '#92400e' }}>
            {alertas.length} produto{alertas.length !== 1 ? 's' : ''} com estoque baixo
          </p>
          <div className="space-y-1">
            {alertas.map((p) => (
              <p key={p.id} className="text-sm" style={{ color: '#92400e' }}>
                {p.nome} — {p.stock_quantity ?? 0} unidade
                {(p.stock_quantity ?? 0) !== 1 ? 's' : ''} restante
                {(p.stock_quantity ?? 0) !== 1 ? 's' : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {produtosComEstoque.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
            Com controle de estoque
          </p>
          <div className="space-y-3">
            {produtosComEstoque.map((produto) => (
              <CardEstoque key={produto.id} produto={produto} />
            ))}
          </div>
        </div>
      )}

      {semEstoque.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
            Sem controle de estoque
          </p>
          <div className="space-y-2">
            {semEstoque.map((produto) => (
              <div
                key={produto.id}
                className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
              >
                <span className="text-sm text-ink">{produto.nome}</span>
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
        className="rounded-xl p-4"
        style={{ background: 'var(--bg)', border: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-ink">{produto.nome}</p>
            {produto.categories?.nome && (
              <p className="text-xs text-ink-3 mt-0.5">{produto.categories.nome}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: quantColor }}>
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

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setModalAberto('entrada')}
            className="flex-1 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            Entrada
          </button>
          <button
            onClick={() => setModalAberto('ajuste')}
            className="flex-1 py-2 rounded-full text-sm font-medium"
            style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
          >
            Ajuste
          </button>
          <a
            href={`/estoque/${produto.id}`}
            className="flex-1 py-2 rounded-full text-sm font-medium text-center"
            style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
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
        window.alert(resultado.erro)
        return
      }
      router.refresh()
    })
  }

  const estilo =
    variante === 'primario'
      ? { background: 'var(--brick)', color: 'var(--brick-ink)' }
      : { border: '1px solid var(--line)', color: 'var(--ink-3)' }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pendente}
      className="text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={estilo}
    >
      {pendente ? 'Aguarde…' : label}
    </button>
  )
}
