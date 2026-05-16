'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCartStore } from '@mallevo/lib'

import { formatarReais } from '@/lib/format'

/**
 * ProductModal — reescrita RN→DOM de
 * apps/mobile-consumer/components/ModalProduto.tsx (subestágio 3b).
 *
 * Bottom-sheet de detalhe do produto: foto, título, preço/promo, descrição,
 * aviso `exige_receita` (de `products.metadata`), observações, quantidade,
 * total e CTA. Confirmar → `useCartStore().adicionarItem(...)` (assinatura
 * real de @mallevo/lib). A regra single-store é do próprio store: quando há
 * outra loja no carrinho, `adicionarItem` NÃO adiciona — seta
 * `pendingTrocaLoja`; o `TrocaLojaDialog` (nível catálogo) resolve.
 *
 * Paridade parcial vs ModalProduto.tsx: quantidade, observações, preço,
 * total, validação e o fluxo de adicionar/troca-de-loja são portados 1:1.
 * Modifiers, variants e agendamento NÃO são portados aqui — as views
 * públicas do Stage 0 (D2) não expõem os dados necessários (grupos de
 * modifier com nome/min/max, option groups/options/variant_options,
 * categoria_slug p/ services). Ver RESUMO → Decisões PENDENTES.
 *
 * Spec: docs/storefront/05-stage-3-storefront.md §3b.
 */

export type ProdutoModalModel = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  foto_url: string | null
  metadata: Record<string, unknown> | null
}

export type LojaModal = {
  id: string
  nome: string
  taxa_entrega: number
}

export function ProductModal({
  produto,
  loja,
  onFechar,
}: {
  produto: ProdutoModalModel
  loja: LojaModal
  onFechar: () => void
}) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')

  const adicionarItem = useCartStore((s) => s.adicionarItem)

  // Preço base efetivo (sem variant — não resolvível via views públicas):
  // promocional > base. Espelha o ramo "sem variantAtivo" do mobile.
  const precoBase = produto.preco_promocional ?? produto.preco
  const precoOriginal = produto.preco
  const temPromo =
    produto.preco_promocional != null &&
    produto.preco_promocional < produto.preco

  const totalItem = precoBase * quantidade

  const exigeReceita = produto.metadata?.exige_receita === true

  // Sem grupos obrigatórios alcançáveis (modifiers/variants são PENDENTES).
  // Estrutura mantida para espelhar a lógica do mobile quando as views
  // forem estendidas.
  const erroValidacao = useMemo<string | null>(() => null, [])

  // Trava o scroll do body enquanto o sheet está aberto.
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  // Fecha no Escape (paridade com onRequestClose do Modal RN).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  function handleAdicionar() {
    if (erroValidacao) return
    // Single-store: se houver outra loja no carrinho, o store NÃO adiciona —
    // seta pendingTrocaLoja (snapshot do item). O TrocaLojaDialog resolve.
    adicionarItem(
      {
        product_id: produto.id,
        nome: produto.nome,
        preco: precoBase,
        quantidade,
        foto_url: produto.foto_url ?? undefined,
        observacoes: observacoes.trim() || undefined,
      },
      loja.id,
      loja.nome,
      loja.taxa_entrega
    )
    onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={produto.nome}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-xl bg-surface">
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>

        {/* Botão fechar */}
        <button
          type="button"
          aria-label="Fechar"
          onClick={onFechar}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-soft transition-opacity hover:opacity-75"
        >
          <CloseIcon />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Foto */}
          {produto.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.foto_url}
              alt=""
              className="h-60 w-full bg-canvasAlt object-cover"
            />
          ) : (
            <div className="flex h-60 w-full items-center justify-center bg-canvasAlt">
              <span className="text-5xl text-ink-soft" aria-hidden>
                &#9634;
              </span>
            </div>
          )}

          <div className="flex flex-col gap-4 p-5">
            {/* Título + preço */}
            <div className="flex items-start justify-between gap-4">
              <h2 className="min-w-0 flex-1 text-xl font-extrabold tracking-tight text-ink">
                {produto.nome}
              </h2>
              <div className="flex flex-col items-end">
                <span className="text-lg font-extrabold text-ink">
                  {formatarReais(precoBase)}
                </span>
                {temPromo ? (
                  <span className="text-[13px] text-ink-soft line-through">
                    {formatarReais(precoOriginal)}
                  </span>
                ) : null}
              </div>
            </div>

            {exigeReceita ? (
              <div className="flex items-start gap-2.5 rounded-md border border-warning bg-warning/20 p-3">
                <InfoIcon />
                <p className="flex-1 text-[13px] font-medium leading-snug text-ink">
                  <span className="font-extrabold">Exige receita médica.</span>{' '}
                  Anexe a receita ao finalizar o pedido.
                </p>
              </div>
            ) : null}

            {produto.descricao ? (
              <p className="text-sm font-medium leading-relaxed text-ink-muted">
                {produto.descricao}
              </p>
            ) : null}

            {/* Observações */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink">
                Observações (opcional)
              </span>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: sem cebola, ponto da carne..."
                maxLength={140}
                rows={3}
                className="resize-none rounded-md border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-ink-soft focus:border-ink"
              />
            </label>

            {/* Quantidade */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Quantidade</span>
              <div className="flex items-center gap-3.5">
                <QtyButton
                  rotulo="Diminuir quantidade"
                  desabilitado={quantidade === 1}
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                >
                  &minus;
                </QtyButton>
                <span className="w-7 text-center text-lg font-extrabold text-ink">
                  {quantidade}
                </span>
                <QtyButton
                  rotulo="Aumentar quantidade"
                  primario
                  onClick={() => setQuantidade((q) => q + 1)}
                >
                  +
                </QtyButton>
              </div>
            </div>
          </div>
        </div>

        {/* CTA fixo */}
        <div className="border-t border-line px-4 pb-6 pt-3">
          {erroValidacao ? (
            <p className="mb-2 text-center text-xs font-semibold text-danger">
              {erroValidacao}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleAdicionar}
            disabled={!!erroValidacao}
            className="flex h-14 w-full items-center justify-center rounded-pill bg-accent text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Adicionar &mdash; {formatarReais(totalItem)}
          </button>
        </div>
      </div>
    </div>
  )
}

function QtyButton({
  children,
  onClick,
  desabilitado,
  primario,
  rotulo,
}: {
  children: React.ReactNode
  onClick: () => void
  desabilitado?: boolean
  primario?: boolean
  rotulo: string
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      disabled={desabilitado}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold transition-opacity hover:opacity-75 disabled:opacity-40 ${
        primario ? 'bg-ink text-accent' : 'bg-surfaceMuted text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className="text-ink"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 text-warning"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  )
}
