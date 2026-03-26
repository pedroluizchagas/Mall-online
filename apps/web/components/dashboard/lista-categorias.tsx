'use client'

import { useState, useTransition } from 'react'
import { criarCategoria, atualizarCategoria, excluirCategoria } from '@/lib/actions/categorias'

interface Categoria {
  id: string
  nome: string
  descricao?: string | null
  icone?: string | null
  ordem: number
  ativa: boolean
  tenant_id: string | null
}

interface Props {
  categorias: Categoria[]
}

export function ListaCategorias({ categorias }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)

  function handleExcluir(id: string) {
    if (!confirm('Excluir esta categoria? Os produtos serão desvinculados.')) return
    startTransition(async () => {
      await excluirCategoria(id)
    })
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (editando) {
        await atualizarCategoria(editando.id, formData)
      } else {
        await criarCategoria(formData)
      }
      setModalAberto(false)
      setEditando(null)
    })
  }

  return (
    <>
      {/* Botão Nova Categoria */}
      <button
        onClick={() => { setEditando(null); setModalAberto(true) }}
        className="bg-[#1A4D3A] text-white px-4 py-2 rounded-lg text-sm font-medium
          hover:bg-[#163d2e] transition-colors"
      >
        Nova categoria
      </button>

      {categorias.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Nenhuma categoria encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categorias.map((cat) => {
            const isGlobal = cat.tenant_id === null
            return (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {cat.icone && (
                    <span className="text-2xl">{cat.icone}</span>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-800">{cat.nome}</h3>
                    {cat.descricao && (
                      <p className="text-xs text-gray-400">{cat.descricao}</p>
                    )}
                    {isGlobal && (
                      <span className="text-xs text-blue-500">Global (somente leitura)</span>
                    )}
                  </div>
                </div>

                {!isGlobal && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditando(cat); setModalAberto(true) }}
                      className="text-sm text-[#4CAF82] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(cat.id)}
                      disabled={isPending}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de criação/edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-[#1A4D3A] mb-4">
              {editando ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  name="nome"
                  defaultValue={editando?.nome}
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                    focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  name="descricao"
                  defaultValue={editando?.descricao ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                    focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ícone (emoji)</label>
                <input
                  name="icone"
                  defaultValue={editando?.icone ?? ''}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                    focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                <input
                  name="ordem"
                  type="number"
                  min="0"
                  defaultValue={editando?.ordem ?? 0}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                    focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-[#1A4D3A] text-white py-2.5 rounded-lg font-medium
                    disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
                >
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalAberto(false); setEditando(null) }}
                  className="flex-1 border border-gray-200 py-2.5 rounded-lg text-gray-600
                    hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
