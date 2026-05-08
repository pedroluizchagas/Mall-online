'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, type KeyboardEvent } from 'react'
import { useTemplateOrGeneric, type CampoExtraDef } from '@mallora/lib'
import {
  VariantsEditor,
  payloadParaServer,
  type OptionGroupEditavel,
  type VariantEditavel,
} from './produto-form-variants'

interface Categoria {
  id: string
  nome: string
  icone?: string
}

interface ModifierEditavel {
  id?: string
  nome: string
  preco_extra: number
  disponivel: boolean
  ordem: number
}

interface GrupoEditavel {
  id?: string
  nome: string
  min_select: number
  max_select: number
  ordem: number
  modifiers: ModifierEditavel[]
}

interface MetadataEditavel {
  tempo_preparo_min?: number
  serve_pessoas?: number
  tags?: string[]
  [key: string]: unknown
}

interface Produto {
  id?: string
  nome?: string
  descricao?: string
  preco?: number
  preco_promocional?: number | null
  foto_url?: string | null
  disponivel?: boolean
  track_stock?: boolean
  stock_quantity?: number | null
  stock_minimo?: number | null
  category_id?: string | null
  ordem?: number
  metadata?: MetadataEditavel | null
}

interface VariantInicial extends Omit<VariantEditavel, 'optionRefs'> {
  optionRefs: string[]
}

interface Props {
  action: (estado: any, formData: FormData) => Promise<any>
  categorias: Categoria[]
  produto?: Produto
  grupos?: GrupoEditavel[]
  optionGroups?: OptionGroupEditavel[]
  variants?: VariantInicial[]
}

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

const inputCompacto =
  'border rounded-lg px-3 py-1.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

const TAGS_SUGERIDAS = ['Vegetariano', 'Vegano', 'Sem glúten', 'Picante', 'Mais pedido']

function BotaoSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
    >
      {pending ? 'Salvando...' : 'Salvar produto'}
    </button>
  )
}

function CampoExtra({
  campo,
  valor,
  onChange,
}: {
  campo: CampoExtraDef
  valor: unknown
  onChange: (v: unknown) => void
}) {
  const labelEl = (
    <label className="block text-sm font-medium text-ink-2 mb-1">
      {campo.label}
      {campo.obrigatorio && <span style={{ color: 'var(--err)' }}> *</span>}
    </label>
  )

  if (campo.tipo === 'boolean') {
    const checked = valor === true
    return (
      <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
        <span>{campo.label}</span>
      </label>
    )
  }

  if (campo.tipo === 'number') {
    return (
      <div>
        {labelEl}
        <input
          type="number"
          required={campo.obrigatorio}
          min={campo.obrigatorio ? 1 : undefined}
          value={typeof valor === 'number' ? String(valor) : ''}
          placeholder={campo.placeholder}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? undefined : parseInt(v, 10))
          }}
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        />
      </div>
    )
  }

  if (campo.tipo === 'select') {
    const options = campo.opcoes ?? []
    return (
      <div>
        {labelEl}
        <select
          required={campo.obrigatorio}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        >
          <option value="">Selecione…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (campo.tipo === 'multi-select') {
    const options = campo.opcoes ?? []
    const selecionados = Array.isArray(valor) ? (valor as string[]) : []
    function alternar(opt: string) {
      const set = new Set(selecionados)
      if (set.has(opt)) set.delete(opt)
      else set.add(opt)
      onChange(Array.from(set))
    }
    return (
      <div>
        {labelEl}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer rounded-lg px-2 py-1.5 border"
              style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
            >
              <input
                type="checkbox"
                checked={selecionados.includes(opt)}
                onChange={() => alternar(opt)}
                className="w-4 h-4"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (campo.tipo === 'range') {
    const tupla =
      Array.isArray(valor) && valor.length === 2
        ? (valor as [number | null, number | null])
        : [null, null]
    function setIdx(idx: 0 | 1, v: string) {
      const novo: [number | null, number | null] = [tupla[0], tupla[1]]
      novo[idx] = v === '' ? null : parseFloat(v)
      // Se ambos virarem null, devolve undefined p/ não enviar a tupla.
      if (novo[0] === null && novo[1] === null) {
        onChange(undefined)
      } else {
        onChange([novo[0] ?? 0, novo[1] ?? 0])
      }
    }
    return (
      <div>
        {labelEl}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.1"
            value={tupla[0] ?? ''}
            placeholder="mín"
            onChange={(e) => setIdx(0, e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
          />
          <span className="text-ink-3">—</span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={tupla[1] ?? ''}
            placeholder="máx"
            onChange={(e) => setIdx(1, e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
          />
        </div>
      </div>
    )
  }

  // text, url, e fallback (multi-tag/multi-staff caem como input simples)
  const inputType = campo.tipo === 'url' ? 'url' : 'text'
  return (
    <div>
      {labelEl}
      <input
        type={inputType}
        required={campo.obrigatorio}
        value={typeof valor === 'string' ? valor : ''}
        placeholder={campo.placeholder}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={inputClass}
        style={{ borderColor: 'var(--line)' }}
      />
    </div>
  )
}

function grupoVazio(ordem: number): GrupoEditavel {
  return {
    nome: '',
    min_select: 0,
    max_select: 1,
    ordem,
    modifiers: [{ nome: '', preco_extra: 0, disponivel: true, ordem: 0 }],
  }
}

export function ProdutoForm({
  action,
  categorias,
  produto,
  grupos: gruposIniciais,
  optionGroups: optionGroupsIniciais,
  variants: variantsIniciais,
}: Props) {
  const template = useTemplateOrGeneric()
  const ehServices = template.codigo === 'services'
  const ehFood = template.codigo === 'food'
  const mostraModificadores = template.produto.permiteModificadores
  const camposExtrasGenericos = ehFood
    ? []
    : template.produto.camposExtras
  const mostraSecaoExtras = camposExtrasGenericos.length > 0

  // Wraps the server action so we can fail fast on the client when a services
  // store ships a service without `duracao_min` (template flag 'obrigatorio').
  const actionValidada = async (estado: any, formData: FormData) => {
    if (ehServices) {
      const raw = formData.get('metadata')
      try {
        const md = raw ? JSON.parse(String(raw)) : {}
        if (typeof md.duracao_min !== 'number' || md.duracao_min <= 0) {
          return { erro: 'Duração do serviço é obrigatória para lojas de serviços.' }
        }
      } catch {
        return { erro: 'Falha ao validar campos do serviço' }
      }
    }
    return action(estado, formData)
  }
  const [estado, dispatch] = useFormState(actionValidada, null)

  const permiteVar = template.produto.permiteVariacoes
  const tinhaVariantsAoCarregar =
    Array.isArray(variantsIniciais) && variantsIniciais.length > 0

  // Quando 'sempre', sempre ativo. Quando 'opcional', toggle controlado.
  // Quando 'nunca', desativado.
  const [variationsAtivas, setVariationsAtivas] = useState<boolean>(() => {
    if (permiteVar === 'sempre') return true
    if (permiteVar === 'nunca') return false
    return tinhaVariantsAoCarregar
  })

  const [optionGroupsAtual, setOptionGroupsAtual] = useState<OptionGroupEditavel[]>(
    () => optionGroupsIniciais ?? [],
  )
  const [variantsAtual, setVariantsAtual] = useState<VariantEditavel[]>([])
  const [precoBaseStr, setPrecoBaseStr] = useState<string>(
    produto?.preco ? (produto.preco / 100).toFixed(2) : '',
  )

  const temVariations =
    permiteVar === 'sempre' || (permiteVar === 'opcional' && variationsAtivas)

  const metadataInicial = (produto?.metadata ?? {}) as MetadataEditavel

  const [grupos, setGrupos] = useState<GrupoEditavel[]>(() => gruposIniciais ?? [])
  const [tempoPreparo, setTempoPreparo] = useState<string>(
    typeof metadataInicial.tempo_preparo_min === 'number'
      ? String(metadataInicial.tempo_preparo_min)
      : '',
  )
  const [servePessoas, setServePessoas] = useState<string>(
    typeof metadataInicial.serve_pessoas === 'number'
      ? String(metadataInicial.serve_pessoas)
      : '',
  )
  const [tags, setTags] = useState<string[]>(
    Array.isArray(metadataInicial.tags) ? metadataInicial.tags : [],
  )
  const [novaTag, setNovaTag] = useState('')

  // Estado dos campos extras genéricos (pet/pharmacy/generic).
  // Inicializa a partir de produto.metadata pré-existente.
  const [metadataExtras, setMetadataExtras] = useState<Record<string, unknown>>(() => {
    if (!mostraSecaoExtras) return {}
    const inicial: Record<string, unknown> = {}
    for (const campo of camposExtrasGenericos) {
      const v = (metadataInicial as Record<string, unknown>)[campo.codigo]
      if (v !== undefined) inicial[campo.codigo] = v
      else if (campo.tipo === 'boolean' && typeof campo.defaultValue === 'boolean') {
        inicial[campo.codigo] = campo.defaultValue
      }
    }
    return inicial
  })

  function atualizarCampoExtra(codigo: string, valor: unknown) {
    setMetadataExtras((atual) => {
      const novo = { ...atual }
      if (valor === undefined || valor === '' || (Array.isArray(valor) && valor.length === 0)) {
        delete novo[codigo]
      } else {
        novo[codigo] = valor
      }
      return novo
    })
  }

  function adicionarGrupo() {
    setGrupos((atual) => [...atual, grupoVazio(atual.length)])
  }

  function removerGrupo(idx: number) {
    setGrupos((atual) =>
      atual.filter((_, i) => i !== idx).map((g, i) => ({ ...g, ordem: i })),
    )
  }

  function moverGrupo(idx: number, direcao: -1 | 1) {
    setGrupos((atual) => {
      const novo = idx + direcao
      if (novo < 0 || novo >= atual.length) return atual
      const copia = [...atual]
      const tmp = copia[idx]
      copia[idx] = copia[novo]
      copia[novo] = tmp
      return copia.map((g, i) => ({ ...g, ordem: i }))
    })
  }

  function atualizarGrupo(idx: number, patch: Partial<GrupoEditavel>) {
    setGrupos((atual) => atual.map((g, i) => (i === idx ? { ...g, ...patch } : g)))
  }

  function adicionarModifier(grupoIdx: number) {
    setGrupos((atual) =>
      atual.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              modifiers: [
                ...g.modifiers,
                {
                  nome: '',
                  preco_extra: 0,
                  disponivel: true,
                  ordem: g.modifiers.length,
                },
              ],
            }
          : g,
      ),
    )
  }

  function removerModifier(grupoIdx: number, modIdx: number) {
    setGrupos((atual) =>
      atual.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              modifiers: g.modifiers
                .filter((_, j) => j !== modIdx)
                .map((m, j) => ({ ...m, ordem: j })),
            }
          : g,
      ),
    )
  }

  function atualizarModifier(grupoIdx: number, modIdx: number, patch: Partial<ModifierEditavel>) {
    setGrupos((atual) =>
      atual.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              modifiers: g.modifiers.map((m, j) => (j === modIdx ? { ...m, ...patch } : m)),
            }
          : g,
      ),
    )
  }

  function adicionarTag(valor: string) {
    const limpo = valor.trim()
    if (!limpo) return
    setTags((atual) => (atual.includes(limpo) ? atual : [...atual, limpo]))
    setNovaTag('')
  }

  function removerTag(valor: string) {
    setTags((atual) => atual.filter((t) => t !== valor))
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionarTag(novaTag)
    }
  }

  // Serializa estado dinâmico para o server action via hidden inputs.
  const gruposPayload = JSON.stringify(
    grupos.map((g, idx) => ({
      ...g,
      ordem: idx,
      modifiers: g.modifiers.map((m, mIdx) => ({ ...m, ordem: mIdx })),
    })),
  )

  const metadataPayload = JSON.stringify({
    ...(metadataInicial || {}),
    ...(ehFood
      ? {
          tempo_preparo_min: tempoPreparo ? parseInt(tempoPreparo, 10) : undefined,
          serve_pessoas: servePessoas ? parseInt(servePessoas, 10) : undefined,
          tags,
        }
      : metadataExtras),
  })

  return (
    <form action={dispatch} className="space-y-6">
      {estado?.erro && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: '#fde8e4', color: 'var(--err)' }}
        >
          {estado.erro}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Nome do produto</label>
        <input
          name="nome"
          defaultValue={produto?.nome}
          required
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Descrição</label>
        <textarea
          name="descricao"
          defaultValue={produto?.descricao}
          rows={3}
          className={`${inputClass} resize-none`}
          style={{ borderColor: 'var(--line)' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">Preço (R$)</label>
          <input
            name="preco"
            type="number"
            step="0.01"
            min="0"
            value={precoBaseStr}
            onChange={(e) => setPrecoBaseStr(e.target.value)}
            required
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">Preço promocional (R$)</label>
          <input
            name="preco_promocional"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              produto?.preco_promocional ? (produto.preco_promocional / 100).toFixed(2) : ''
            }
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Categoria</label>
        <select
          name="category_id"
          defaultValue={produto?.category_id ?? ''}
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        >
          <option value="">Sem categoria</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icone} {cat.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Foto do produto</label>
        {produto?.foto_url && (
          <img
            src={produto.foto_url}
            alt="Foto atual"
            className="w-24 h-24 object-cover rounded-xl mb-2"
          />
        )}
        <input
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-ink-3 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
        />
        <p className="text-xs text-ink-3 mt-1">JPEG, PNG ou WebP. Máximo 5MB.</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Disponível para venda</p>
          <p className="text-xs text-ink-3">Produtos indisponíveis não aparecem no app</p>
        </div>
        <input
          name="disponivel"
          type="hidden"
          value={produto?.disponivel !== false ? 'true' : 'false'}
        />
      </div>

      <div>
        <input
          name="track_stock"
          type="hidden"
          value={!temVariations && produto?.track_stock ? 'true' : 'false'}
        />
        {!temVariations && produto?.track_stock && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1">
                Quantidade em estoque
              </label>
              <input
                name="stock_quantity"
                type="number"
                min="0"
                defaultValue={produto?.stock_quantity ?? ''}
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1">Estoque mínimo</label>
              <input
                name="stock_minimo"
                type="number"
                min="0"
                defaultValue={produto?.stock_minimo ?? ''}
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
              />
            </div>
          </div>
        )}
        {temVariations && (
          <p className="text-xs text-ink-3 mt-1 italic">
            Estoque controlado por SKU na seção Variações abaixo.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-2 mb-1">Ordem de exibição</label>
        <input
          name="ordem"
          type="number"
          min="0"
          defaultValue={produto?.ordem ?? 0}
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
        />
      </div>

      {ehFood && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div>
            <p className="text-sm font-semibold text-ink">Detalhes do prato</p>
            <p className="text-xs text-ink-3">Campos específicos para cardápio.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1">
                Tempo de preparo (min)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={tempoPreparo}
                onChange={(e) => setTempoPreparo(e.target.value)}
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1">
                Serve quantas pessoas
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={servePessoas}
                onChange={(e) => setServePessoas(e.target.value)}
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--brick-soft, #f4d8cd)', color: 'var(--brick-dk)' }}
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removerTag(t)}
                    aria-label={`Remover tag ${t}`}
                    className="ml-0.5 hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={onTagKeyDown}
                placeholder="Digite uma tag e pressione Enter"
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
              />
              <button
                type="button"
                onClick={() => adicionarTag(novaTag)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
              >
                Adicionar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TAGS_SUGERIDAS.filter((s) => !tags.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => adicionarTag(s)}
                  className="px-2 py-0.5 rounded-full text-[11px] border"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mostraSecaoExtras && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div>
            <p className="text-sm font-semibold text-ink">
              Detalhes de {template.nome}
            </p>
            <p className="text-xs text-ink-3">
              Campos específicos do nicho. Opcionais salvo indicação contrária.
            </p>
          </div>

          <div className="space-y-3">
            {camposExtrasGenericos.map((campo) => (
              <CampoExtra
                key={campo.codigo}
                campo={campo}
                valor={metadataExtras[campo.codigo]}
                onChange={(v) => atualizarCampoExtra(campo.codigo, v)}
              />
            ))}
          </div>
        </div>
      )}

      {mostraModificadores && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Modificadores</p>
              <p className="text-xs text-ink-3">
                Personalizações que o cliente escolhe ao pedir, ex: ponto da carne, adicionais.
              </p>
            </div>
            <button
              type="button"
              onClick={adicionarGrupo}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
            >
              + Adicionar grupo
            </button>
          </div>

          {grupos.length === 0 && (
            <p className="text-xs text-ink-3 italic">
              Nenhum grupo de modificadores ainda. Clique em &quot;Adicionar grupo&quot; para começar.
            </p>
          )}

          {grupos.map((grupo, gIdx) => (
            <div
              key={grupo.id ?? `novo-${gIdx}`}
              className="rounded-lg p-3 space-y-2"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-medium text-ink-3 mb-0.5">
                    Nome do grupo
                  </label>
                  <input
                    value={grupo.nome}
                    onChange={(e) => atualizarGrupo(gIdx, { nome: e.target.value })}
                    placeholder="Ex: Ponto da carne"
                    className={inputCompacto}
                    style={{ borderColor: 'var(--line)', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-3 mb-0.5">Mín.</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={grupo.min_select}
                    onChange={(e) =>
                      atualizarGrupo(gIdx, {
                        min_select: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    className={inputCompacto}
                    style={{ borderColor: 'var(--line)', width: 70 }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-3 mb-0.5">Máx.</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={grupo.max_select}
                    onChange={(e) =>
                      atualizarGrupo(gIdx, {
                        max_select: Math.max(1, parseInt(e.target.value || '1', 10)),
                      })
                    }
                    className={inputCompacto}
                    style={{ borderColor: 'var(--line)', width: 70 }}
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moverGrupo(gIdx, -1)}
                    disabled={gIdx === 0}
                    aria-label="Mover grupo para cima"
                    className="px-2 py-1.5 rounded-lg text-xs border disabled:opacity-40"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moverGrupo(gIdx, 1)}
                    disabled={gIdx === grupos.length - 1}
                    aria-label="Mover grupo para baixo"
                    className="px-2 py-1.5 rounded-lg text-xs border disabled:opacity-40"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removerGrupo(gIdx)}
                    className="px-2 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: 'var(--line)', color: 'var(--err)' }}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className="pl-3 space-y-1.5" style={{ borderLeft: '2px solid var(--line)' }}>
                {grupo.modifiers.map((mod, mIdx) => (
                  <div
                    key={mod.id ?? `novo-${mIdx}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      value={mod.nome}
                      onChange={(e) =>
                        atualizarModifier(gIdx, mIdx, { nome: e.target.value })
                      }
                      placeholder="Nome da opção"
                      className={inputCompacto}
                      style={{ borderColor: 'var(--line)', flex: 1, minWidth: 160 }}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-ink-3">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={mod.preco_extra ? (mod.preco_extra / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const valor = e.target.value
                          atualizarModifier(gIdx, mIdx, {
                            preco_extra: valor
                              ? Math.round(parseFloat(valor) * 100)
                              : 0,
                          })
                        }}
                        placeholder="0,00"
                        className={inputCompacto}
                        style={{ borderColor: 'var(--line)', width: 90 }}
                      />
                    </div>
                    <label className="flex items-center gap-1 text-xs text-ink-2">
                      <input
                        type="checkbox"
                        checked={mod.disponivel}
                        onChange={(e) =>
                          atualizarModifier(gIdx, mIdx, { disponivel: e.target.checked })
                        }
                      />
                      disponível
                    </label>
                    <button
                      type="button"
                      onClick={() => removerModifier(gIdx, mIdx)}
                      disabled={grupo.modifiers.length === 1}
                      className="px-2 py-1 rounded-md text-[11px] border disabled:opacity-40"
                      style={{ borderColor: 'var(--line)', color: 'var(--err)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => adicionarModifier(gIdx)}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--brick-dk)' }}
                >
                  + Adicionar opção
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {permiteVar === 'opcional' && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-3"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div>
            <p className="text-sm font-semibold text-ink">Este produto tem variações?</p>
            <p className="text-xs text-ink-3">
              Ative se houver tamanhos, cores, sabores ou outros atributos com estoque próprio.
            </p>
          </div>
          <input
            type="checkbox"
            checked={variationsAtivas}
            onChange={(e) => setVariationsAtivas(e.target.checked)}
            className="w-5 h-5"
          />
        </div>
      )}

      {temVariations && (
        <VariantsEditor
          optionGroupsIniciais={optionGroupsIniciais ?? []}
          variantsIniciais={variantsIniciais ?? []}
          precoBaseCentavos={
            precoBaseStr ? Math.round(parseFloat(precoBaseStr) * 100) : 0
          }
          ativo={temVariations}
          onChange={(g, v) => {
            setOptionGroupsAtual(g)
            setVariantsAtual(v)
          }}
        />
      )}

      <input type="hidden" name="modifier_groups" value={gruposPayload} />
      <input type="hidden" name="metadata" value={metadataPayload} />
      <input
        type="hidden"
        name="variants_payload"
        value={
          temVariations
            ? payloadParaServer({
                optionGroups: optionGroupsAtual,
                variants: variantsAtual,
              })
            : ''
        }
      />

      <BotaoSubmit />
    </form>
  )
}
