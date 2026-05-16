'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCartStore } from '@mallevo/lib'
import type { ItemCarrinhoModifier, ItemCarrinhoVariant } from '@mallevo/types'

import { formatarReais } from '@/lib/format'
import type {
  ModifierGrupoCatalogo,
  OptionGrupoCatalogo,
  OptionItemCatalogo,
  ProdutoDetalhe,
} from '@/lib/catalog'

/**
 * ProductModal — reescrita RN→DOM de
 * apps/mobile-consumer/components/ModalProduto.tsx (subestágio 3b).
 *
 * Bottom-sheet de detalhe do produto: foto, título, preço/promo, descrição,
 * aviso `exige_receita` (de `products.metadata`), variants, modifiers,
 * observações, quantidade, total e CTA. Confirmar →
 * `useCartStore().adicionarItem(...)` (assinatura real de @mallevo/lib). A
 * regra single-store é do próprio store: quando há outra loja no carrinho,
 * `adicionarItem` NÃO adiciona — seta `pendingTrocaLoja`; o
 * `TrocaLojaDialog` (nível catálogo) resolve.
 *
 * 2ª passada do 3b: modifiers e variants portados 1:1 de ModalProduto.tsx,
 * consumindo as novas views públicas (Stage 0 `20260516160000`, via
 * `lib/catalog.ts` → `ProdutoDetalhe`). `erroValidacao` agora ATIVO
 * (obrigatórios não atendidos → CTA desabilitado + mensagem). Preço base
 * resolvido pelo variant selecionado; `preco_extra` dos modifiers somado.
 *
 * Paridade parcial vs ModalProduto.tsx: AGENDAMENTO/services NÃO é portado
 * (adiado p/ pós-3e por decisão do tech lead — depende de sessão consumer).
 * Aviso "Apenas N em estoque" também não: a view pública não expõe
 * `stock_quantity` (D2 — sem estoque/SKU). Ver RESUMO.
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

/** Conjunto vazio estável — evita recriar em cada render de grupo sem seleção. */
const EMPTY_SET: ReadonlySet<string> = new Set<string>()

/**
 * Detalhe vazio default — produto sem modifiers/variants. Definido aqui
 * (não importado de `lib/catalog`) para o componente client não arrastar
 * `createSupabaseServer` (server-only) para o bundle.
 */
const DETALHE_VAZIO: ProdutoDetalhe = {
  modifierGroups: [],
  optionGroups: [],
  variants: [],
}

export function ProductModal({
  produto,
  loja,
  detalhe,
  onFechar,
}: {
  produto: ProdutoModalModel
  loja: LojaModal
  detalhe?: ProdutoDetalhe
  onFechar: () => void
}) {
  const { modifierGroups, optionGroups, variants } = detalhe ?? DETALHE_VAZIO

  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  // grupo_id → conjunto de modifier_ids selecionados.
  const [selecoes, setSelecoes] = useState<Record<string, Set<string>>>({})
  // option_group_id → option_id selecionada (sempre single-select).
  const [selecoesVariant, setSelecoesVariant] = useState<
    Record<string, string>
  >({})

  const adicionarItem = useCartStore((s) => s.adicionarItem)

  // Variant ativo = único variant cujas options batem exatamente com a
  // seleção. Seleção incompleta → null. Espelha ModalProduto.tsx.
  const variantAtivo = useMemo(() => {
    if (variants.length === 0 || optionGroups.length === 0) return null
    if (Object.keys(selecoesVariant).length < optionGroups.length) return null

    const optionsSelecionadas = new Set(Object.values(selecoesVariant))
    return (
      variants.find((v) => {
        if (v.option_ids.length !== optionsSelecionadas.size) return false
        return v.option_ids.every((id) => optionsSelecionadas.has(id))
      }) ?? null
    )
  }, [variants, optionGroups, selecoesVariant])

  // Preço base efetivo: variant > produto (promocional > base).
  const precoBase = variantAtivo
    ? variantAtivo.preco_promocional ?? variantAtivo.preco
    : produto.preco_promocional ?? produto.preco
  const precoOriginal = variantAtivo ? variantAtivo.preco : produto.preco
  const temPromo = variantAtivo
    ? variantAtivo.preco_promocional != null &&
      variantAtivo.preco_promocional < variantAtivo.preco
    : produto.preco_promocional != null &&
      produto.preco_promocional < produto.preco

  const fotoExibida = variantAtivo?.foto_url ?? produto.foto_url ?? null

  const temVariants = variants.length > 0 && optionGroups.length > 0
  const selecaoVariantCompleta =
    !temVariants ||
    Object.keys(selecoesVariant).length === optionGroups.length

  const modifiersSelecionados = useMemo<ItemCarrinhoModifier[]>(() => {
    const out: ItemCarrinhoModifier[] = []
    for (const grupo of modifierGroups) {
      const ids = selecoes[grupo.id]
      if (!ids || ids.size === 0) continue
      for (const m of grupo.modifiers) {
        if (ids.has(m.id)) {
          out.push({
            modifier_id: m.id,
            nome: m.nome,
            preco_extra: m.preco_extra,
          })
        }
      }
    }
    return out
  }, [modifierGroups, selecoes])

  const precoExtraTotal = modifiersSelecionados.reduce(
    (acc, m) => acc + m.preco_extra,
    0
  )
  const totalItem = (precoBase + precoExtraTotal) * quantidade

  const exigeReceita = produto.metadata?.exige_receita === true

  // Validação ATIVA (2ª passada). Espelha o ramo "sem agendamento" de
  // ModalProduto.tsx: variant incompleto/indisponível, depois min/max
  // dos grupos de modifiers.
  const erroValidacao = useMemo<string | null>(() => {
    if (temVariants) {
      if (!selecaoVariantCompleta) {
        return optionGroups.length === 2
          ? `Selecione ${optionGroups[0].nome.toLowerCase()} e ${optionGroups[1].nome.toLowerCase()}`
          : `Selecione ${optionGroups
              .map((g) => g.nome.toLowerCase())
              .join(', ')}`
      }
      if (!variantAtivo) {
        return 'Esta combinação não está disponível'
      }
    }
    for (const grupo of modifierGroups) {
      const count = selecoes[grupo.id]?.size ?? 0
      if (grupo.min_select > 0 && count < grupo.min_select) {
        return `Selecione ${
          grupo.min_select === 1 ? '1 opção' : `${grupo.min_select} opções`
        } em "${grupo.nome}"`
      }
      if (count > grupo.max_select) {
        return `Limite excedido em "${grupo.nome}"`
      }
    }
    return null
  }, [
    modifierGroups,
    selecoes,
    temVariants,
    selecaoVariantCompleta,
    variantAtivo,
    optionGroups,
  ])

  function alternarSelecao(grupo: ModifierGrupoCatalogo, modifierId: string) {
    setSelecoes((prev) => {
      const atual = new Set(prev[grupo.id] ?? [])
      if (grupo.max_select === 1) {
        if (atual.has(modifierId)) {
          atual.delete(modifierId)
        } else {
          atual.clear()
          atual.add(modifierId)
        }
      } else {
        if (atual.has(modifierId)) {
          atual.delete(modifierId)
        } else if (atual.size < grupo.max_select) {
          atual.add(modifierId)
        }
      }
      return { ...prev, [grupo.id]: atual }
    })
  }

  // Uma option é alcançável se existe variant que a inclua e respeite a
  // seleção atual dos OUTROS groups. Não-alcançável → riscada/desabilitada.
  function optionAlcancavel(grupoId: string, optionId: string): boolean {
    return variants.some((v) => {
      if (!v.option_ids.includes(optionId)) return false
      for (const [gId, oId] of Object.entries(selecoesVariant)) {
        if (gId === grupoId) continue
        if (!v.option_ids.includes(oId)) return false
      }
      return true
    })
  }

  function selecionarOption(grupoId: string, optionId: string) {
    setSelecoesVariant((prev) => {
      if (prev[grupoId] === optionId) {
        const { [grupoId]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [grupoId]: optionId }
    })
  }

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

    let variant: ItemCarrinhoVariant | undefined
    if (variantAtivo) {
      // rotulo = valores das options selecionadas, na ordem dos groups
      // (ex.: "M × Preto"). Espelha ModalProduto.tsx (separador ' × ').
      const valoresSelecionados = optionGroups
        .map((g) => {
          const optionId = selecoesVariant[g.id]
          return g.options.find((o) => o.id === optionId)?.valor
        })
        .filter((v): v is string => !!v)
      variant = {
        variant_id: variantAtivo.id,
        rotulo: valoresSelecionados.join(' × '),
      }
    }

    // Single-store: se houver outra loja no carrinho, o store NÃO adiciona —
    // seta pendingTrocaLoja (snapshot do item). O TrocaLojaDialog resolve.
    adicionarItem(
      {
        product_id: produto.id,
        nome: produto.nome,
        preco: precoBase,
        quantidade,
        foto_url: fotoExibida ?? undefined,
        observacoes: observacoes.trim() || undefined,
        modifiers:
          modifiersSelecionados.length > 0 ? modifiersSelecionados : undefined,
        variant,
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
          {/* Foto (do variant ativo, se houver) */}
          {fotoExibida ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoExibida}
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

            {/* Grupos de variações */}
            {temVariants
              ? optionGroups.map((grupo) => (
                  <GrupoVariants
                    key={grupo.id}
                    grupo={grupo}
                    selecionada={selecoesVariant[grupo.id] ?? null}
                    optionAlcancavel={(optionId) =>
                      optionAlcancavel(grupo.id, optionId)
                    }
                    aoSelecionar={(optionId) =>
                      selecionarOption(grupo.id, optionId)
                    }
                  />
                ))
              : null}

            {/* Grupos de modificadores */}
            {modifierGroups.map((grupo) => (
              <GrupoModifiers
                key={grupo.id}
                grupo={grupo}
                selecionados={selecoes[grupo.id] ?? EMPTY_SET}
                aoAlternar={(modifierId) => alternarSelecao(grupo, modifierId)}
              />
            ))}

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
            {temVariants && !selecaoVariantCompleta
              ? optionGroups.length > 1
                ? `Selecione ${optionGroups
                    .map((g) => g.nome.toLowerCase())
                    .join(' e ')}`
                : `Selecione ${
                    optionGroups[0]?.nome.toLowerCase() ?? 'opção'
                  }`
              : `Adicionar — ${formatarReais(totalItem)}`}
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

function GrupoVariants({
  grupo,
  selecionada,
  optionAlcancavel,
  aoSelecionar,
}: {
  grupo: OptionGrupoCatalogo
  selecionada: string | null
  optionAlcancavel: (optionId: string) => boolean
  aoSelecionar: (optionId: string) => void
}) {
  const ehCor = grupo.nome.toLowerCase() === 'cor'
  const valorSelecionado = selecionada
    ? grupo.options.find((o) => o.id === selecionada)?.valor
    : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex-1 text-sm font-bold text-ink">
          {grupo.nome}
          <span className="text-danger"> *</span>
        </span>
        {valorSelecionado ? (
          <span className="text-xs font-semibold text-ink-muted">
            {valorSelecionado}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {grupo.options.map((opcao) => (
          <ChipOption
            key={opcao.id}
            opcao={opcao}
            ehCor={ehCor}
            selecionada={selecionada === opcao.id}
            alcancavel={optionAlcancavel(opcao.id)}
            aoTocar={() => aoSelecionar(opcao.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ChipOption({
  opcao,
  ehCor,
  selecionada,
  alcancavel,
  aoTocar,
}: {
  opcao: OptionItemCatalogo
  ehCor: boolean
  selecionada: boolean
  alcancavel: boolean
  aoTocar: () => void
}) {
  const desabilitado = !alcancavel && !selecionada
  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={desabilitado}
      aria-pressed={selecionada}
      className={`flex items-center gap-2 rounded-pill px-3 py-2 text-[13px] font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed ${
        selecionada
          ? 'border-2 border-ink bg-ink text-accent'
          : desabilitado
            ? 'border border-line bg-surface text-ink-soft line-through opacity-40'
            : 'border border-line bg-surface text-ink'
      }`}
    >
      {ehCor && opcao.hex_color ? (
        <span
          aria-hidden
          className="h-4 w-4 rounded-sm border border-black/10"
          style={{ backgroundColor: opcao.hex_color }}
        />
      ) : null}
      {opcao.valor}
    </button>
  )
}

function GrupoModifiers({
  grupo,
  selecionados,
  aoAlternar,
}: {
  grupo: ModifierGrupoCatalogo
  selecionados: ReadonlySet<string>
  aoAlternar: (modifierId: string) => void
}) {
  const obrigatorio = grupo.min_select > 0
  const single = grupo.max_select === 1

  let dica: string
  if (single) {
    dica = obrigatorio ? 'Escolha 1' : 'Escolha 1 (opcional)'
  } else if (grupo.min_select === grupo.max_select) {
    dica = `Escolha ${grupo.max_select}`
  } else if (obrigatorio) {
    dica = `Mín ${grupo.min_select}, máx ${grupo.max_select}`
  } else {
    dica = `Até ${grupo.max_select}`
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex-1 text-sm font-bold text-ink">
          {grupo.nome}
          {obrigatorio ? <span className="text-danger"> *</span> : null}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          {dica}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        {grupo.modifiers.map((m, idx) => (
          <ModifierLinha
            key={m.id}
            modifier={m}
            selecionado={selecionados.has(m.id)}
            single={single}
            ultimo={idx === grupo.modifiers.length - 1}
            aoTocar={() => aoAlternar(m.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ModifierLinha({
  modifier,
  selecionado,
  single,
  ultimo,
  aoTocar,
}: {
  modifier: { id: string; nome: string; preco_extra: number; disponivel: boolean }
  selecionado: boolean
  single: boolean
  ultimo: boolean
  aoTocar: () => void
}) {
  const desabilitado = !modifier.disponivel
  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={desabilitado}
      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-opacity hover:opacity-90 disabled:opacity-40 ${
        ultimo ? '' : 'border-b border-line'
      }`}
    >
      <SeletorIndicador selecionado={selecionado} single={single} />
      <span className="flex-1 text-sm font-semibold text-ink">
        {modifier.nome}
        {desabilitado ? (
          <span className="font-medium text-ink-soft">{'  '}· esgotado</span>
        ) : null}
      </span>
      {modifier.preco_extra > 0 ? (
        <span className="text-[13px] font-bold text-ink-muted">
          + {formatarReais(modifier.preco_extra)}
        </span>
      ) : null}
    </button>
  )
}

function SeletorIndicador({
  selecionado,
  single,
}: {
  selecionado: boolean
  single: boolean
}) {
  if (single) {
    return (
      <span
        aria-hidden
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          selecionado ? 'border-ink' : 'border-line'
        }`}
      >
        {selecionado ? (
          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
        ) : null}
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 items-center justify-center rounded-sm border-2 ${
        selecionado ? 'border-ink bg-ink' : 'border-line'
      }`}
    >
      {selecionado ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </span>
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
