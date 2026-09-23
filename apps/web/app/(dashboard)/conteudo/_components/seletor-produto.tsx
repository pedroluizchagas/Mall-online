'use client'

import { useEffect, useState } from 'react'
import { Link2, Search, X } from 'lucide-react'
import { formatarReais } from '@mallevo/lib'
import { buscarProdutosParaPost, type ProdutoResumo } from '@/lib/actions/conteudo'
import { ProductThumb } from '@/components/ui/product-thumb'

const inputClass =
  'w-full pl-9 pr-3 py-2 text-sm text-ink bg-bg rounded-xl border focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

/**
 * Produto vinculado ao post: o Explorar mostra nome e preço e leva ao
 * produto. Busca no catálogo da loja (RLS filtra o tenant); um só por post.
 */
export function SeletorProduto({
  storeId,
  produto,
  onChange,
  disabled,
}: {
  storeId: string
  produto: ProdutoResumo | null
  onChange: (p: ProdutoResumo | null) => void
  disabled?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ProdutoResumo[]>([])
  const [buscando, setBuscando] = useState(false)

  // Debounce simples, como no app.
  useEffect(() => {
    if (!aberto) return
    let vivo = true
    setBuscando(true)
    const t = setTimeout(() => {
      void buscarProdutosParaPost(storeId, termo).then((lista) => {
        if (!vivo) return
        setResultados(lista)
        setBuscando(false)
      })
    }, 250)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [aberto, termo, storeId])

  if (produto) {
    return (
      <div role="group" aria-labelledby="post-produto-rotulo">
        <p id="post-produto-rotulo" className="text-sm font-medium text-ink-2 mb-1">Produto vinculado</p>
        <div
          className="flex items-center gap-3 p-2.5 rounded-xl border"
          style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
        >
          {produto.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.foto_url} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
          ) : (
            <ProductThumb name={produto.nome} size={40} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{produto.nome}</p>
            <p className="text-xs text-ink-3">{formatarReais(produto.preco)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Desvincular produto"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bg-2 transition-colors disabled:opacity-50"
            style={{ color: 'var(--ink-2)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div role="group" aria-labelledby="post-produto-rotulo">
      <p id="post-produto-rotulo" className="text-sm font-medium text-ink-2 mb-1">Produto vinculado</p>
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border hover:bg-bg-2 transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <Link2 className="w-3.5 h-3.5" /> Vincular um produto
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar no catálogo…"
              autoFocus
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
              aria-label="Buscar produto"
            />
          </div>
          <ul
            className="max-h-60 overflow-y-auto rounded-xl border divide-y list-none p-0 m-0"
            style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
            aria-label="Resultados"
          >
            {buscando && resultados.length === 0 && <li className="px-3 py-2.5 text-xs text-ink-3">Buscando…</li>}
            {!buscando && resultados.length === 0 && (
              <li className="px-3 py-2.5 text-xs text-ink-3">Nenhum produto disponível com esse nome.</li>
            )}
            {resultados.map((p) => (
              <li key={p.id} style={{ borderColor: 'var(--line)' }}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p)
                    setAberto(false)
                    setTermo('')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-bg-2 transition-colors"
                >
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                  ) : (
                    <ProductThumb name={p.nome} size={32} />
                  )}
                  <span className="min-w-0 flex-1 text-sm text-ink truncate">{p.nome}</span>
                  <span className="text-xs text-ink-3 shrink-0">{formatarReais(p.preco)}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
