'use client'

import { useEffect, useState } from 'react'

export interface OptionEditavel {
  id?: string
  valor: string
  hex_color?: string | null
  ordem: number
}

export interface OptionGroupEditavel {
  id?: string
  nome: string
  ordem: number
  options: OptionEditavel[]
}

export interface VariantEditavel {
  id?: string
  optionRefs: Array<{ group_nome: string; option_valor: string }>
  sku: string
  preco: number
  preco_promocional: number | null
  stock_quantity: number | null
  stock_minimo: number
  foto_url: string | null
  disponivel: boolean
  ordem: number
}

const inputCompacto =
  'border rounded-lg px-3 py-1.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

function comboKey(refs: Array<{ group_nome: string; option_valor: string }>): string {
  return refs
    .map((r) => `${r.group_nome}::${r.option_valor}`)
    .sort()
    .join('|')
}

function gerarCombinacoes(
  groups: OptionGroupEditavel[],
): Array<Array<{ group_nome: string; option_valor: string }>> {
  const validos = groups
    .filter((g) => g.nome.trim() !== '')
    .map((g) => ({
      nome: g.nome.trim(),
      options: g.options
        .map((o) => o.valor.trim())
        .filter((v) => v !== ''),
    }))
    .filter((g) => g.options.length > 0)

  if (validos.length === 0) return []

  let combos: Array<Array<{ group_nome: string; option_valor: string }>> = [[]]
  for (const g of validos) {
    const next: typeof combos = []
    for (const combo of combos) {
      for (const valor of g.options) {
        next.push([...combo, { group_nome: g.nome, option_valor: valor }])
      }
    }
    combos = next
  }
  return combos
}

function isCorAttr(nome: string): boolean {
  return nome.trim().toLowerCase() === 'cor'
}

function uuidToRef(
  optionId: string,
  groups: OptionGroupEditavel[],
): { group_nome: string; option_valor: string } | null {
  for (const g of groups) {
    for (const o of g.options) {
      if (o.id === optionId) return { group_nome: g.nome, option_valor: o.valor }
    }
  }
  return null
}

export function gerarPayloadVariants(
  optionGroups: OptionGroupEditavel[],
  variants: VariantEditavel[],
  ativo: boolean,
): { optionGroups: OptionGroupEditavel[]; variants: VariantEditavel[] } | null {
  if (!ativo) return null

  const cleanGroups = optionGroups
    .map((g, idx) => ({
      ...g,
      nome: g.nome.trim(),
      ordem: idx,
      options: g.options
        .map((o, oIdx) => ({
          ...o,
          valor: o.valor.trim(),
          ordem: oIdx,
        }))
        .filter((o) => o.valor !== ''),
    }))
    .filter((g) => g.nome !== '' && g.options.length > 0)

  if (cleanGroups.length === 0) return { optionGroups: [], variants: [] }

  const cleanVariants = variants.map((v, idx) => ({
    ...v,
    sku: v.sku.trim() === '' ? '' : v.sku.trim(),
    ordem: idx,
  }))

  return { optionGroups: cleanGroups, variants: cleanVariants }
}

export function payloadParaServer(
  payload: { optionGroups: OptionGroupEditavel[]; variants: VariantEditavel[] } | null,
): string {
  if (!payload) return ''
  return JSON.stringify({
    optionGroups: payload.optionGroups.map((g) => ({
      id: g.id,
      nome: g.nome,
      ordem: g.ordem,
      options: g.options.map((o) => ({
        id: o.id,
        valor: o.valor,
        hex_color: o.hex_color ?? null,
        ordem: o.ordem,
      })),
    })),
    variants: payload.variants.map((v) => ({
      id: v.id,
      optionRefs: v.optionRefs,
      sku: v.sku === '' ? null : v.sku,
      preco: v.preco,
      preco_promocional: v.preco_promocional,
      stock_quantity: v.stock_quantity,
      stock_minimo: v.stock_minimo,
      foto_url: v.foto_url === '' ? null : v.foto_url,
      disponivel: v.disponivel,
      ordem: v.ordem,
    })),
  })
}

interface Props {
  optionGroupsIniciais: OptionGroupEditavel[]
  variantsIniciais: Array<Omit<VariantEditavel, 'optionRefs'> & { optionRefs: string[] }>
  precoBaseCentavos: number
  ativo: boolean
  onChange: (
    optionGroups: OptionGroupEditavel[],
    variants: VariantEditavel[],
  ) => void
}

export function VariantsEditor({
  optionGroupsIniciais,
  variantsIniciais,
  precoBaseCentavos,
  ativo,
  onChange,
}: Props) {
  const [optionGroups, setOptionGroups] = useState<OptionGroupEditavel[]>(
    () => optionGroupsIniciais,
  )
  const [variants, setVariants] = useState<VariantEditavel[]>(() =>
    variantsIniciais.map((v) => ({
      ...v,
      optionRefs: v.optionRefs
        .map((id) => uuidToRef(id, optionGroupsIniciais))
        .filter((r): r is { group_nome: string; option_valor: string } => r !== null),
    })),
  )

  // Recomputa a grade quando atributos/valores mudam: preserva variants cujas
  // combinações ainda existem; cria novos com defaults; remove órfãos.
  useEffect(() => {
    const combos = gerarCombinacoes(optionGroups)
    setVariants((prev) => {
      const prevMap = new Map<string, VariantEditavel>()
      for (const v of prev) prevMap.set(comboKey(v.optionRefs), v)

      return combos.map((combo, idx) => {
        const existing = prevMap.get(comboKey(combo))
        if (existing) {
          return { ...existing, optionRefs: combo, ordem: idx }
        }
        return {
          optionRefs: combo,
          sku: '',
          preco: precoBaseCentavos || 0,
          preco_promocional: null,
          stock_quantity: 0,
          stock_minimo: 0,
          foto_url: null,
          disponivel: true,
          ordem: idx,
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(optionGroups)])

  // Notifica o pai sempre que mudar.
  useEffect(() => {
    onChange(optionGroups, variants)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(optionGroups), JSON.stringify(variants)])

  function adicionarGrupo() {
    setOptionGroups((atual) => [
      ...atual,
      {
        nome: '',
        ordem: atual.length,
        options: [{ valor: '', hex_color: null, ordem: 0 }],
      },
    ])
  }

  function removerGrupo(idx: number) {
    setOptionGroups((atual) =>
      atual.filter((_, i) => i !== idx).map((g, i) => ({ ...g, ordem: i })),
    )
  }

  function moverGrupo(idx: number, dir: -1 | 1) {
    setOptionGroups((atual) => {
      const novo = idx + dir
      if (novo < 0 || novo >= atual.length) return atual
      const copia = [...atual]
      const tmp = copia[idx]
      copia[idx] = copia[novo]
      copia[novo] = tmp
      return copia.map((g, i) => ({ ...g, ordem: i }))
    })
  }

  function atualizarGrupoNome(idx: number, nome: string) {
    setOptionGroups((atual) => atual.map((g, i) => (i === idx ? { ...g, nome } : g)))
  }

  function adicionarOption(grupoIdx: number) {
    setOptionGroups((atual) =>
      atual.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              options: [
                ...g.options,
                { valor: '', hex_color: null, ordem: g.options.length },
              ],
            }
          : g,
      ),
    )
  }

  function removerOption(grupoIdx: number, optIdx: number) {
    setOptionGroups((atual) =>
      atual.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              options: g.options
                .filter((_, j) => j !== optIdx)
                .map((o, j) => ({ ...o, ordem: j })),
            }
          : g,
      ),
    )
  }

  function atualizarOption(grupoIdx: number, optIdx: number, patch: Partial<OptionEditavel>) {
    setOptionGroups((atual) =>
      atual.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              options: g.options.map((o, j) => (j === optIdx ? { ...o, ...patch } : o)),
            }
          : g,
      ),
    )
  }

  function atualizarVariant(idx: number, patch: Partial<VariantEditavel>) {
    setVariants((atual) => atual.map((v, i) => (i === idx ? { ...v, ...patch } : v)))
  }

  // Validações em tempo real.
  const erros: string[] = []
  if (ativo) {
    const gruposComNome = optionGroups.filter((g) => g.nome.trim() !== '')
    if (gruposComNome.length === 0) {
      erros.push('Adicione ao menos 1 atributo.')
    }
    for (const g of optionGroups) {
      const validos = g.options.filter((o) => o.valor.trim() !== '')
      if (g.nome.trim() !== '' && validos.length === 0) {
        erros.push(`O atributo "${g.nome}" precisa de ao menos 1 valor.`)
      }
      const valoresLower = validos.map((o) => o.valor.trim().toLowerCase())
      if (new Set(valoresLower).size !== valoresLower.length) {
        erros.push(`O atributo "${g.nome}" tem valores duplicados.`)
      }
    }
    for (const v of variants) {
      if (v.preco <= 0) {
        const label = v.optionRefs.map((r) => r.option_valor).join(' × ')
        erros.push(`A combinação "${label}" precisa de preço maior que zero.`)
      }
    }
  }

  if (!ativo) return null

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
    >
      <div>
        <p className="text-sm font-semibold text-ink">Variações</p>
        <p className="text-xs text-ink-3">
          Cada combinação de atributos gera 1 SKU com preço, estoque e foto próprios.
        </p>
      </div>

      {erros.length > 0 && (
        <div
          className="px-3 py-2 rounded-lg text-xs space-y-0.5"
          style={{ background: '#fde8e4', color: 'var(--err)' }}
        >
          {erros.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
            Atributos da grade
          </p>
          <button
            type="button"
            onClick={adicionarGrupo}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            + Adicionar atributo
          </button>
        </div>

        {optionGroups.length === 0 && (
          <p className="text-xs text-ink-3 italic">
            Nenhum atributo ainda. Clique em &quot;Adicionar atributo&quot; (ex: Tamanho, Cor).
          </p>
        )}

        {optionGroups.map((grupo, gIdx) => {
          const ehCor = isCorAttr(grupo.nome)
          return (
            <div
              key={gIdx}
              className="rounded-lg p-3 space-y-2"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[11px] font-medium text-ink-3 mb-0.5">
                    Nome do atributo
                  </label>
                  <input
                    value={grupo.nome}
                    onChange={(e) => atualizarGrupoNome(gIdx, e.target.value)}
                    placeholder="Ex: Tamanho, Cor"
                    className={inputCompacto}
                    style={{ borderColor: 'var(--line)', width: '100%' }}
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moverGrupo(gIdx, -1)}
                    disabled={gIdx === 0}
                    aria-label="Mover atributo para cima"
                    className="px-2 py-1.5 rounded-lg text-xs border disabled:opacity-40"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moverGrupo(gIdx, 1)}
                    disabled={gIdx === optionGroups.length - 1}
                    aria-label="Mover atributo para baixo"
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
                {grupo.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex flex-wrap items-center gap-2">
                    <input
                      value={opt.valor}
                      onChange={(e) =>
                        atualizarOption(gIdx, oIdx, { valor: e.target.value })
                      }
                      placeholder="Ex: P, M, G ou Verde, Preto"
                      className={inputCompacto}
                      style={{ borderColor: 'var(--line)', flex: 1, minWidth: 140 }}
                    />
                    {ehCor && (
                      <input
                        type="color"
                        value={opt.hex_color ?? '#000000'}
                        onChange={(e) =>
                          atualizarOption(gIdx, oIdx, { hex_color: e.target.value })
                        }
                        aria-label="Cor"
                        className="w-9 h-8 rounded border cursor-pointer"
                        style={{ borderColor: 'var(--line)' }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removerOption(gIdx, oIdx)}
                      disabled={grupo.options.length === 1}
                      className="px-2 py-1 rounded-md text-[11px] border disabled:opacity-40"
                      style={{ borderColor: 'var(--line)', color: 'var(--err)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => adicionarOption(gIdx)}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--brick-dk)' }}
                >
                  + Adicionar valor
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider">
            Grade de SKUs ({variants.length} combinaç{variants.length === 1 ? 'ão' : 'ões'})
          </p>

          <div className="space-y-1.5">
            {variants.map((v, vIdx) => {
              const label = v.optionRefs.map((r) => r.option_valor).join(' × ')
              return (
                <div
                  key={comboKey(v.optionRefs)}
                  className="rounded-lg p-3 space-y-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <label className="flex items-center gap-1.5 text-xs text-ink-2">
                      <input
                        type="checkbox"
                        checked={v.disponivel}
                        onChange={(e) =>
                          atualizarVariant(vIdx, { disponivel: e.target.checked })
                        }
                      />
                      disponível
                    </label>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[11px] font-medium text-ink-3 mb-0.5">
                        SKU (opcional)
                      </label>
                      <input
                        value={v.sku}
                        onChange={(e) => atualizarVariant(vIdx, { sku: e.target.value })}
                        placeholder="Ex: VST-P-VRD"
                        className={inputCompacto}
                        style={{ borderColor: 'var(--line)', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink-3 mb-0.5">
                        Preço (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={v.preco ? (v.preco / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const val = e.target.value
                          atualizarVariant(vIdx, {
                            preco: val ? Math.round(parseFloat(val) * 100) : 0,
                          })
                        }}
                        className={inputCompacto}
                        style={{ borderColor: 'var(--line)', width: 100 }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink-3 mb-0.5">
                        Estoque
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={v.stock_quantity ?? ''}
                        onChange={(e) =>
                          atualizarVariant(vIdx, {
                            stock_quantity: e.target.value
                              ? parseInt(e.target.value, 10)
                              : null,
                          })
                        }
                        className={inputCompacto}
                        style={{ borderColor: 'var(--line)', width: 80 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-ink-3 mb-0.5">
                      Foto do SKU (URL)
                    </label>
                    <input
                      type="url"
                      value={v.foto_url ?? ''}
                      onChange={(e) =>
                        atualizarVariant(vIdx, { foto_url: e.target.value || null })
                      }
                      placeholder="https://... (opcional)"
                      className={inputCompacto}
                      style={{ borderColor: 'var(--line)', width: '100%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
