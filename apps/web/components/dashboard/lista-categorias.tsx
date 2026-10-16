'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarCategoria, atualizarCategoria, excluirCategoria } from '@/lib/actions/categorias'
import { iconeDaCategoria } from '@/lib/icones-categoria'
import { showToast } from '@/components/ui/toast'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { useFocoNoDialogo } from './hooks/use-foco-no-dialogo'

interface Categoria {
  id: string
  nome: string
  slug?: string | null
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
  'w-full border rounded-[14px] px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-ink transition-shadow'

/**
 * Categorias do catálogo em dois corredores: as da loja (editáveis, com o
 * ícone que o lojista escolheu) e as do shopping (só leitura, com o ícone de
 * linha do nicho — a casa não fala por emoji).
 */
export function ListaCategorias({ categorias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharModal = useCallback(() => {
    setModalAberto(false)
    setEditando(null)
  }, [])
  useFocoNoDialogo(modalAberto, caixaRef, fecharModal)

  const daLoja = categorias.filter((c) => c.tenant_id !== null)
  const doShopping = categorias.filter((c) => c.tenant_id === null)

  function handleExcluir(cat: Categoria) {
    if (!confirm(`Excluir “${cat.nome}”? Os produtos dela ficam sem categoria.`)) return
    startTransition(async () => {
      const r = await excluirCategoria(cat.id)
      if (r && 'erro' in r && r.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível excluir', descricao: r.erro })
        return
      }
      showToast({ tipo: 'sucesso', titulo: 'Categoria excluída' })
      router.refresh()
    })
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const r = editando ? await atualizarCategoria(editando.id, formData) : await criarCategoria(formData)
      if (r && 'erro' in r && r.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: r.erro })
        return
      }
      showToast({ tipo: 'sucesso', titulo: editando ? 'Categoria atualizada' : 'Categoria criada' })
      setModalAberto(false)
      setEditando(null)
      router.refresh()
    })
  }

  return (
    <>
      <section aria-labelledby="cat-loja">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="micro text-ink-3">Da sua loja</p>
            <h2 id="cat-loja" className="mt-1.5 text-[21px] font-bold tracking-[-0.025em] text-ink">
              Seções do catálogo
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditando(null)
              setModalAberto(true)
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors bg-brick text-brick-ink hover:bg-brick-dk"
          >
            <PartnerIcon name="plus" size={15} strokeWidth={2.4} />
            Nova categoria
          </button>
        </div>

        {daLoja.length === 0 ? (
          <div className="cartao px-6 py-10 text-center">
            <p className="text-[15px] font-semibold text-ink">Nenhuma seção criada ainda</p>
            <p className="mt-1 text-[13.5px] text-ink-3">
              Crie seções como “Pizzas” ou “Bebidas” para organizar a vitrine.
            </p>
          </div>
        ) : (
          <ul className="cartao divide-y divide-line overflow-hidden">
            {daLoja.map((cat) => (
              <li key={cat.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-2 text-[18px] text-ink">
                  {cat.icone ? <span aria-hidden>{cat.icone}</span> : <PartnerIcon name="tag" size={17} strokeWidth={1.9} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">{cat.nome}</span>
                  {cat.descricao && <span className="block truncate text-[12.5px] text-ink-3">{cat.descricao}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(cat)
                      setModalAberto(true)
                    }}
                    className="h-9 rounded-full px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-bg-2"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluir(cat)}
                    disabled={isPending}
                    className="h-9 rounded-full px-3.5 text-[13px] font-semibold text-ink-3 transition-colors hover:bg-[color:var(--err-lt)] hover:text-[color:var(--err)] disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {doShopping.length > 0 && (
        <section aria-labelledby="cat-shopping" className="mt-12">
          <p className="micro text-ink-3">Do shopping · só leitura</p>
          <h2 id="cat-shopping" className="mt-1.5 text-[21px] font-bold tracking-[-0.025em] text-ink">
            Categorias gerais
          </h2>
          <p className="mb-4 mt-1 text-[13.5px] text-ink-3">Valem para qualquer loja e também podem organizar seus produtos.</p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {doShopping.map((cat) => {
              const Icone = iconeDaCategoria(cat.slug)
              return (
                <li key={cat.id} className="flex items-center gap-3 rounded-[16px] bg-bg/60 px-4 py-3 ring-1 ring-inset ring-line">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink-2">
                    <Icone className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="truncate text-[13.5px] font-semibold text-ink-2">{cat.nome}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(9,9,11,0.55)] p-4 backdrop-blur-[3px] sm:items-center"
          onMouseDown={() => {
            setModalAberto(false)
            setEditando(null)
          }}
        >
          <div
            ref={caixaRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-categoria"
            className="slide-up w-full max-w-md rounded-[28px] bg-bg p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="micro text-ink-3">Catálogo</p>
            <h2 id="titulo-categoria" className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
              {editando ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <form action={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="cat-nome" className="mb-1.5 block text-[13.5px] font-semibold text-ink-2">
                  Nome
                </label>
                <input id="cat-nome" name="nome" defaultValue={editando?.nome} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="cat-descricao" className="mb-1.5 block text-[13.5px] font-semibold text-ink-2">
                  Descrição
                </label>
                <input id="cat-descricao" name="descricao" defaultValue={editando?.descricao ?? ''} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cat-icone" className="mb-1.5 block text-[13.5px] font-semibold text-ink-2">
                    Ícone (emoji)
                  </label>
                  <input id="cat-icone" name="icone" defaultValue={editando?.icone ?? ''} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="cat-ordem" className="mb-1.5 block text-[13.5px] font-semibold text-ink-2">
                    Ordem
                  </label>
                  <input
                    id="cat-ordem"
                    name="ordem"
                    type="number"
                    min="0"
                    defaultValue={editando?.ordem ?? 0}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false)
                    setEditando(null)
                  }}
                  className="h-11 flex-1 rounded-full text-[13.5px] font-bold text-ink-2 ring-1 ring-inset ring-line-2 transition-colors hover:bg-bg-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 flex-1 rounded-full text-[13.5px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                >
                  {isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
