'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toggleDisponibilidade, excluirProduto } from '@/lib/actions/produtos'
import { ProductThumb } from '@/components/ui/product-thumb'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { showToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'

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
  metadata?: Record<string, unknown> | null
  categories?: { nome: string; icone?: string | null } | null
  product_modifier_groups?: Array<{ id: string }> | null
  product_variants?: Array<{ id: string }> | null
}

interface Props {
  produtos: Produto[]
  storeId: string
}

/** O preço que o cliente paga e, se houver promoção, o de antes riscado. */
function precos(p: Produto): { atual: number; anterior: number | null } {
  const promo = Number(p.preco_promocional ?? 0)
  const preco = Number(p.preco)
  return promo > 0 && promo < preco ? { atual: promo, anterior: preco } : { atual: preco, anterior: null }
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
      <div className="cartao flex flex-col items-center px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-bg-3 text-ink">
          <PartnerIcon name="package" size={24} strokeWidth={1.8} />
        </span>
        <p className="mt-5 text-[22px] font-semibold tracking-[-0.03em] text-ink">Nenhum produto ainda</p>
        <p className="mt-2 max-w-md text-[14.5px] text-ink-3">
          Cadastre o primeiro para a vitrine abrir com ele — no app e no site.
        </p>
      </div>
    )
  }

  return (
    <div className="slide-up">
      {/* Barra: busca, categorias, grade/lista */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative flex h-10 w-full items-center sm:w-[260px]">
          <span className="sr-only">Buscar produto</span>
          <PartnerIcon name="search" size={16} strokeWidth={2} className="pointer-events-none absolute left-3.5 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto"
            className="h-full w-full rounded-full bg-bg pl-10 pr-4 text-[13.5px] text-ink outline-none focus-visible:outline-none ring-1 ring-inset ring-line transition-shadow placeholder:text-ink-4 focus:ring-2 focus:ring-ink"
          />
        </label>

        <div className="-m-1 flex flex-1 gap-1 overflow-x-auto p-1">
          {cats.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={cx(
                  'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors',
                  active ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg hover:text-ink',
                )}
              >
                {c}
              </button>
            )
          })}
        </div>

        <div className="flex rounded-full bg-bg p-1 ring-1 ring-inset ring-line" role="group" aria-label="Visualização">
          {(
            [
              { v: 'grid', rotulo: 'Grade', icone: 'gallery' },
              { v: 'list', rotulo: 'Lista', icone: 'menu' },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setView(o.v)}
              aria-pressed={view === o.v}
              className={cx(
                'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors',
                view === o.v ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink',
              )}
            >
              <PartnerIcon name={o.icone} size={14} strokeWidth={2} />
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="cartao px-6 py-12 text-center text-[14px] text-ink-3">Nenhum produto com essa busca.</p>
      ) : view === 'grid' ? (
        <ul className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {shown.map((p) => (
            <li key={p.id}>
              <ProductCard produto={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="cartao overflow-hidden">
          <div
            className="micro hidden items-center gap-3 border-b border-line bg-bg-2 px-5 py-3 text-ink-3 md:grid"
            style={{ gridTemplateColumns: '44px minmax(0,2fr) minmax(0,1fr) 110px 100px 132px' }}
          >
            <div />
            <div>Produto</div>
            <div>Categoria</div>
            <div>Preço</div>
            <div>Estoque</div>
            <div className="text-right">Disponível</div>
          </div>
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <ProductRow key={p.id} produto={p} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Disponibilidade com resposta imediata: muda já e desfaz se o servidor recusar. */
function useDisponibilidade(p: Produto) {
  const router = useRouter()
  const [disponivel, setDisponivel] = useState(p.disponivel)
  const [, startTransition] = useTransition()
  function alternar() {
    const novo = !disponivel
    setDisponivel(novo)
    startTransition(async () => {
      const r = await toggleDisponibilidade(p.id, novo)
      if (r && 'erro' in r && r.erro) {
        setDisponivel(!novo)
        showToast({ tipo: 'erro', titulo: 'Não foi possível alterar', descricao: r.erro })
        return
      }
      router.refresh()
    })
  }
  return { disponivel, alternar }
}

function Selos({ p }: { p: Produto }) {
  const totalModificadores = p.product_modifier_groups?.length ?? 0
  const totalSkus = p.product_variants?.length ?? 0
  const exigeReceita = p.metadata?.exige_receita === true
  if (!totalModificadores && !totalSkus && !exigeReceita) return null
  const selo = (icone: PartnerIconName, texto: string, tom?: 'aviso') => (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={tom === 'aviso' ? { background: 'var(--warn-lt)', color: 'var(--warn)' } : { background: 'var(--bg-2)', color: 'var(--ink-2)' }}
    >
      <PartnerIcon name={icone} size={11} strokeWidth={2.2} />
      {texto}
    </span>
  )
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {totalSkus > 0 && selo('tag', `${totalSkus} SKU${totalSkus > 1 ? 's' : ''}`)}
      {totalModificadores > 0 && selo('plus', `${totalModificadores} ${totalModificadores > 1 ? 'adicionais' : 'adicional'}`)}
      {exigeReceita && selo('file', 'Receita', 'aviso')}
    </span>
  )
}

function ProductCard({ produto: p }: { produto: Produto }) {
  const { disponivel, alternar } = useDisponibilidade(p)
  const baixo = p.track_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) < 10
  const esgotado = p.track_stock && (p.stock_quantity ?? 0) === 0
  const { atual, anterior } = precos(p)

  return (
    <article className="cartao group relative flex h-full flex-col overflow-hidden transition-[box-shadow,transform] duration-300 ease-entrada hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/produtos/${p.id}`} className="absolute inset-0 z-0 rounded-[20px]" aria-label={`Editar ${p.nome}`} />
      <div className="pointer-events-none relative flex aspect-[4/3] items-center justify-center bg-bg-2">
        {p.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.foto_url}
            alt=""
            className={cx('h-full w-full object-cover transition-[filter] duration-300', !disponivel && 'grayscale')}
          />
        ) : (
          <ProductThumb name={p.nome} size={64} />
        )}
        {(esgotado || baixo || !disponivel) && (
          <span className="absolute bottom-2.5 left-2.5 flex gap-1">
            {!disponivel && <Etiqueta tom="neutro">Pausado</Etiqueta>}
            {esgotado ? <Etiqueta tom="err">Esgotado</Etiqueta> : baixo ? <Etiqueta tom="warn">Só {p.stock_quantity} em estoque</Etiqueta> : null}
          </span>
        )}
      </div>
      <div className="pointer-events-none relative flex flex-1 flex-col p-4">
        <div className="pointer-events-none">
          {p.categories?.nome && <p className="micro truncate text-ink-3">{p.categories.nome}</p>}
          <p className="mt-1 truncate text-[15px] font-semibold leading-tight text-ink">{p.nome}</p>
          <Selos p={p} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="pointer-events-none flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(atual)}</span>
            {anterior !== null && <span className="text-[12px] text-ink-3 line-through tabular-nums">{money(anterior)}</span>}
          </p>
          <Interruptor ligado={disponivel} onChange={alternar} rotulo={`${p.nome} disponível na vitrine`} />
        </div>
      </div>
    </article>
  )
}

function ProductRow({ produto: p }: { produto: Produto }) {
  const router = useRouter()
  const { disponivel, alternar } = useDisponibilidade(p)
  const [, startTransition] = useTransition()
  const { atual, anterior } = precos(p)

  function remover() {
    if (!confirm(`Excluir “${p.nome}”? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      const r = await excluirProduto(p.id)
      if (r && 'erro' in r && r.erro) {
        showToast({ tipo: 'erro', titulo: 'Não foi possível excluir', descricao: r.erro })
        return
      }
      showToast({ tipo: 'sucesso', titulo: 'Produto excluído' })
      router.refresh()
    })
  }

  const baixo = p.track_stock && (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) < 10
  const esgotado = p.track_stock && (p.stock_quantity ?? 0) === 0

  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 md:grid-cols-[44px_minmax(0,2fr)_minmax(0,1fr)_110px_100px_132px]">
      {p.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto_url} alt="" className="size-11 rounded-[12px] object-cover" />
      ) : (
        <ProductThumb name={p.nome} size={44} />
      )}
      <div className="min-w-0">
        <Link href={`/produtos/${p.id}`} className="block truncate text-[14px] font-semibold text-ink hover:underline">
          {p.nome}
        </Link>
        {p.descricao && <p className="truncate text-[12.5px] text-ink-3">{p.descricao}</p>}
        <Selos p={p} />
      </div>
      <div className="hidden truncate text-[13px] text-ink-2 md:block">{p.categories?.nome ?? '—'}</div>
      <div className="hidden md:block">
        <p className="text-[13.5px] font-semibold text-ink tabular-nums">{money(atual)}</p>
        {anterior !== null && <p className="text-[11.5px] text-ink-3 line-through tabular-nums">{money(anterior)}</p>}
      </div>
      <div className="hidden md:block">
        {esgotado ? (
          <Etiqueta tom="err">Esgotado</Etiqueta>
        ) : baixo ? (
          <Etiqueta tom="warn">{p.stock_quantity} un.</Etiqueta>
        ) : (
          <span className="text-[13px] text-ink-2 tabular-nums">{p.track_stock ? `${p.stock_quantity ?? 0} un.` : '—'}</span>
        )}
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <Interruptor ligado={disponivel} onChange={alternar} rotulo={`${p.nome} disponível na vitrine`} />
        <button
          type="button"
          onClick={remover}
          aria-label={`Excluir ${p.nome}`}
          title="Excluir"
          className="flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[color:var(--err-lt)] hover:text-[color:var(--err)]"
        >
          <PartnerIcon name="trash" size={15} strokeWidth={2} />
        </button>
      </div>
    </li>
  )
}

function Etiqueta({ children, tom }: { children: React.ReactNode; tom: 'err' | 'warn' | 'neutro' }) {
  const estilo =
    tom === 'err'
      ? { background: 'var(--err-lt)', color: 'var(--err)' }
      : tom === 'warn'
        ? { background: 'var(--warn-lt)', color: 'var(--warn)' }
        : { background: 'rgba(17,18,22,0.72)', color: '#fff' }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold backdrop-blur" style={estilo}>
      {children}
    </span>
  )
}

/** Interruptor da casa: trilho tinta quando ligado (lima não se lê sobre branco). */
function Interruptor({ ligado, onChange, rotulo }: { ligado: boolean; onChange: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={ligado ? 'Disponível na vitrine' : 'Pausado na vitrine'}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className="pointer-events-auto relative z-[1] h-6 w-10 shrink-0 rounded-full transition-colors duration-200"
      style={{ background: ligado ? 'var(--ink)' : 'var(--line-2)' }}
    >
      <span
        aria-hidden
        className="absolute left-0.5 top-0.5 size-5 rounded-full bg-bg shadow-sm transition-transform duration-300 ease-entrada"
        style={{ transform: `translateX(${ligado ? 16 : 0}px)` }}
      >
        {ligado && <span className="absolute inset-[7px] rounded-full" style={{ background: 'var(--brick)' }} />}
      </span>
    </button>
  )
}
