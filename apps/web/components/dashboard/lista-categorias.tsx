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

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

export function ListaCategorias({ categorias }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)

  function handleExcluir(id: string) {
    if (!confirm('Excluir esta categoria? Os produtos serão desvinculados.')) return
    startTransition(() => {
      void excluirCategoria(id)
    })
  }

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      const acao = editando
        ? atualizarCategoria(editando.id, formData)
        : criarCategoria(formData)
      void acao.then(() => {
        setModalAberto(false)
        setEditando(null)
      })
    })
  }

  return (
    <>
      <button
        onClick={() => { setEditando(null); setModalAberto(true) }}
        className="px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        Nova categoria
      </button>

      {categorias.length === 0 ? (
        <div className="text-center py-16 text-ink-3">
          <p className="text-lg">Nenhuma categoria encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categorias.map((cat) => {
            const isGlobal = cat.tenant_id === null
            return (
              <div
                key={cat.id}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-3">
                  {cat.icone && <span className="text-2xl">{cat.icone}</span>}
                  <div>
                    <h3 className="font-medium text-ink">{cat.nome}</h3>
                    {cat.descricao && <p className="text-xs text-ink-3">{cat.descricao}</p>}
                    {isGlobal && (
                      <span className="text-xs" style={{ color: 'var(--sky)' }}>
                        Global (somente leitura)
                      </span>
                    )}
                  </div>
                </div>

                {!isGlobal && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setEditando(cat); setModalAberto(true) }}
                      className="text-sm font-medium hover:underline"
                      style={{ color: 'var(--brick-dk)' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(cat.id)}
                      disabled={isPending}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--err)' }}
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

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="rounded-2xl p-6 w-full max-w-md mx-4"
            style={{ background: 'var(--bg)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <h2 className="text-lg font-semibold text-ink mb-4">
              {editando ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1">Nome</label>
                <input
                  name="nome"
                  defaultValue={editando?.nome}
                  required
                  className={inputClass}
                  style={{ borderColor: 'var(--line)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1">Descrição</label>
                <input
                  name="descricao"
                  defaultValue={editando?.descricao ?? ''}
                  className={inputClass}
                  style={{ borderColor: 'var(--line)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1">Ícone (emoji)</label>
                <input
                  name="icone"
                  defaultValue={editando?.icone ?? ''}
                  className={inputClass}
                  style={{ borderColor: 'var(--line)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1">Ordem</label>
                <input
                  name="ordem"
                  type="number"
                  min="0"
                  defaultValue={editando?.ordem ?? 0}
                  className={inputClass}
                  style={{ borderColor: 'var(--line)' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-full font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                >
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalAberto(false); setEditando(null) }}
                  className="flex-1 py-2.5 rounded-full font-medium"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
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
