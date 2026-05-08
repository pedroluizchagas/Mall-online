'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, type KeyboardEvent } from 'react'
import { useTemplateOrGeneric } from '@mallora/lib'

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

interface Props {
  action: (estado: any, formData: FormData) => Promise<any>
  categorias: Categoria[]
  produto?: Produto
  grupos?: GrupoEditavel[]
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

function grupoVazio(ordem: number): GrupoEditavel {
  return {
    nome: '',
    min_select: 0,
    max_select: 1,
    ordem,
    modifiers: [{ nome: '', preco_extra: 0, disponivel: true, ordem: 0 }],
  }
}

export function ProdutoForm({ action, categorias, produto, grupos: gruposIniciais }: Props) {
  const [estado, dispatch] = useFormState(action, null)
  const template = useTemplateOrGeneric()
  const mostraModificadores = template.produto.permiteModificadores
  const ehFood = template.codigo === 'food'

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
      : {}),
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
            defaultValue={produto?.preco ? (produto.preco / 100).toFixed(2) : ''}
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
          value={produto?.track_stock ? 'true' : 'false'}
        />
        {produto?.track_stock && (
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

      <input type="hidden" name="modifier_groups" value={gruposPayload} />
      <input type="hidden" name="metadata" value={metadataPayload} />

      <BotaoSubmit />
    </form>
  )
}
