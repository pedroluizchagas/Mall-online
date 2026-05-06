'use client'

import { useFormState, useFormStatus } from 'react-dom'

interface Categoria {
  id: string
  nome: string
  icone?: string
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
}

interface Props {
  action: (estado: any, formData: FormData) => Promise<any>
  categorias: Categoria[]
  produto?: Produto
}

const inputClass =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

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

export function ProdutoForm({ action, categorias, produto }: Props) {
  const [estado, dispatch] = useFormState(action, null)

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

      <BotaoSubmit />
    </form>
  )
}
