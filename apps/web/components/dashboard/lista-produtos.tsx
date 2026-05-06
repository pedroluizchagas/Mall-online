'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, LayoutGrid, List as ListIcon } from 'lucide-react'
import { toggleDisponibilidade, excluirProduto } from '@/lib/actions/produtos'
import { Card } from '@/components/ui/card'
import { ProductThumb } from '@/components/ui/product-thumb'
import { Sparkline } from '@/components/ui/sparkline'
import { money } from '@/lib/format'

interface Produto {
  id: string
  nome: string
  descricao?: string | null
  preco: number
  preco_promocional?: number | null
  foto_url?: string | null
  disponivel: boolean
  track_stock: boolean
  stock_quantity?: number | null
  categories?: { nome: string; icone?: string | null } | null
}

interface Props {
  produtos: Produto[]
  storeId: string
}

export function ListaProdutos({ produtos }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')

  const cats = useMemo(() => {
    const set = new Set<string>()
    produtos.forEach((p) => p.categories?.nome && set.add(p.categories.nome))
    return ['Todos', ...Array.from(set)]
  }, [produtos])

  const shown = produtos.filter((p) => {
    if (category !== 'Todos' && p.categories?.nome !== category) return false
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (produtos.length === 0) {
    return (
      <div className="text-center py-16 text-ink-3">
        <p className="text-lg">Nenhum produto cadastrado ainda.</p>
        <p className="text-sm mt-1">Clique em &quot;Novo produto&quot; para começar.</p>
      </div>
    )
  }

  return (
    <div className="slide-up">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div
          className="flex items-center gap-2 rounded-md"
          style={{
            padding: '7px 12px',
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            width: 240,
          }}
        >
          <Search className="w-3.5 h-3.5 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="bg-transparent border-none outline-none flex-1 text-[13px]"
          />
        </div>

        <div className="flex gap-1 flex-1 overflow-x-auto">
          {cats.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors"
                style={
                  active
                    ? { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }
                    : { background: 'var(--bg)', color: 'var(--ink-2)', borderColor: 'var(--line)' }
                }
              >
                {c}
              </button>
            )
          })}
        </div>

        <div
          className="flex rounded-md"
          style={{ background: 'var(--bg-2)', padding: 3 }}
        >
          <button
            onClick={() => setView('grid')}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-shadow"
            style={
              view === 'grid'
                ? { background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', color: 'var(--ink)' }
                : { background: 'transparent', color: 'var(--ink-2)' }
            }
          >
            <LayoutGrid className="w-3 h-3" /> Grade
          </button>
          <button
            onClick={() => setView('list')}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-shadow"
            style={
              view === 'list'
                ? { background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', color: 'var(--ink)' }
                : { background: 'transparent', color: 'var(--ink-2)' }
            }
          >
            <ListIcon className="w-3 h-3" /> Lista
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          {shown.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div
            className="grid items-center px-4 py-2.5 border-b text-[11px] font-medium uppercase tracking-wider text-ink-3"
            style={{
              gridTemplateColumns: '50px 2fr 1fr 100px 100px 80px 60px',
              gap: 12,
              background: 'var(--bg-2)',
              borderColor: 'var(--line)',
            }}
          >
            <div />
            <div>Produto</div>
            <div>Categoria</div>
            <div>Preço</div>
            <div>Estoque</div>
            <div>Vendas</div>
            <div />
          </div>
          {shown.map((p) => (
            <ProductRow key={p.id} produto={p} />
          ))}
        </Card>
      )}
    </div>
  )
}

function ProductCard({ produto: p }: { produto: Produto }) {
  const [, startTransition] = useTransition()
  function toggle() {
    startTransition(() => {
      void toggleDisponibilidade(p.id, !p.disponivel)
    })
  }
  const baixo = p.track_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) < 10
  const esgotado = p.track_stock && (p.stock_quantity ?? 0) === 0
  return (
    <Link
      href={`/produtos/${p.id}`}
      className="block rounded-lg overflow-hidden border border-line bg-bg transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-line-2"
    >
      <div
        className="relative flex items-center justify-center border-b border-line"
        style={{
          aspectRatio: '4 / 3',
          background: 'linear-gradient(135deg, var(--bg-2), var(--bg-3))',
        }}
      >
        {p.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
        ) : (
          <ProductThumb name={p.nome} size={64} />
        )}
        <div className="absolute top-2 right-2" onClick={(e) => e.preventDefault()}>
          <SwitchTiny checked={p.disponivel} onChange={toggle} />
        </div>
        {esgotado ? (
          <div className="absolute bottom-2 left-2">
            <ChipBadge variant="err">Esgotado</ChipBadge>
          </div>
        ) : baixo ? (
          <div className="absolute bottom-2 left-2">
            <ChipBadge variant="warn">Só {p.stock_quantity} em estoque</ChipBadge>
          </div>
        ) : null}
      </div>
      <div className="p-3">
        {p.categories?.nome && (
          <div className="text-[10px] text-ink-3 uppercase tracking-wider font-medium">
            {p.categories.nome}
          </div>
        )}
        <div className="text-sm font-medium leading-tight mt-0.5 truncate">{p.nome}</div>
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <div className="text-base font-semibold tracking-tight">{money(Number(p.preco))}</div>
            {p.preco_promocional && (
              <div className="text-[11px] text-ink-3 line-through">
                {money(Number(p.preco_promocional))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function ProductRow({ produto: p }: { produto: Produto }) {
  const [, startTransition] = useTransition()
  function toggle() {
    startTransition(() => {
      void toggleDisponibilidade(p.id, !p.disponivel)
    })
  }
  function remover() {
    if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return
    startTransition(() => {
      void excluirProduto(p.id)
    })
  }
  const baixo = p.track_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) < 10
  const esgotado = p.track_stock && (p.stock_quantity ?? 0) === 0
  return (
    <div
      className="grid items-center px-4 py-2.5 border-b border-line"
      style={{ gridTemplateColumns: '50px 2fr 1fr 100px 100px 80px 60px', gap: 12 }}
    >
      {p.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto_url} alt={p.nome} className="w-10 h-10 rounded-md object-cover" />
      ) : (
        <ProductThumb name={p.nome} size={40} />
      )}
      <div>
        <Link
          href={`/produtos/${p.id}`}
          className="text-[13px] font-medium hover:underline"
        >
          {p.nome}
        </Link>
        {p.descricao && (
          <div className="text-[11px] text-ink-3 truncate">{p.descricao}</div>
        )}
      </div>
      <div className="text-xs text-ink-2">{p.categories?.nome ?? '—'}</div>
      <div className="text-[13px] font-medium">{money(Number(p.preco))}</div>
      <div>
        {esgotado ? (
          <ChipBadge variant="err">Esgotado</ChipBadge>
        ) : baixo ? (
          <ChipBadge variant="warn">{p.stock_quantity}</ChipBadge>
        ) : (
          <span className="text-[13px] text-ink-2">{p.stock_quantity ?? '—'}</span>
        )}
      </div>
      <div className="text-xs text-ink-2 flex items-center gap-1.5">
        <Sparkline data={[2, 5, 3, 8, 6, 9, 4]} color="var(--leaf)" height={16} fill={false} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <SwitchTiny checked={p.disponivel} onChange={toggle} />
        <button
          onClick={remover}
          className="text-[11px] text-err hover:underline"
        >
          Excluir
        </button>
      </div>
    </div>
  )
}

function ChipBadge({ children, variant }: { children: React.ReactNode; variant: 'err' | 'warn' | 'ok' }) {
  const styles =
    variant === 'err'
      ? { background: '#f4c9b8', color: 'var(--err)' }
      : variant === 'warn'
        ? { background: '#f5dfa7', color: 'var(--warn)' }
        : { background: '#dff0cc', color: 'var(--ok)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={styles}
    >
      {children}
    </span>
  )
}

function SwitchTiny({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="w-8 h-[18px] rounded-full relative transition-colors"
      style={{ background: checked ? 'var(--brick)' : 'var(--line-2)' }}
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform"
        style={{ transform: `translateX(${checked ? 16 : 2}px)` }}
      />
    </button>
  )
}
