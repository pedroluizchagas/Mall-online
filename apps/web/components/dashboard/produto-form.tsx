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

function BotaoSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg font-medium
        disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {estado.erro}
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do produto
        </label>
        <input
          name="nome"
          defaultValue={produto?.nome}
          required
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          name="descricao"
          defaultValue={produto?.descricao}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82] resize-none"
        />
      </div>

      {/* Preços */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço (R$)
          </label>
          <input
            name="preco"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produto?.preco ? (produto.preco / 100).toFixed(2) : ''}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço promocional (R$)
          </label>
          <input
            name="preco_promocional"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              produto?.preco_promocional
                ? (produto.preco_promocional / 100).toFixed(2)
                : ''
            }
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoria
        </label>
        <select
          name="category_id"
          defaultValue={produto?.category_id ?? ''}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        >
          <option value="">Sem categoria</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icone} {cat.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Foto do produto
        </label>
        {produto?.foto_url && (
          <img
            src={produto.foto_url}
            alt="Foto atual"
            className="w-24 h-24 object-cover rounded-lg mb-2"
          />
        )}
        <input
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0 file:bg-[#1A4D3A] file:text-white
            file:cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG ou WebP. Máximo 5MB.</p>
      </div>

      {/* Disponível */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Disponível para venda</p>
          <p className="text-xs text-gray-400">
            Produtos indisponíveis não aparecem no app
          </p>
        </div>
        <input
          name="disponivel"
          type="hidden"
          value={produto?.disponivel !== false ? 'true' : 'false'}
        />
      </div>

      {/* Controle de estoque */}
      <div>
        <input
          name="track_stock"
          type="hidden"
          value={produto?.track_stock ? 'true' : 'false'}
        />
        {produto?.track_stock && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade em estoque
              </label>
              <input
                name="stock_quantity"
                type="number"
                min="0"
                defaultValue={produto?.stock_quantity ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque mínimo
              </label>
              <input
                name="stock_minimo"
                type="number"
                min="0"
                defaultValue={produto?.stock_minimo ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ordem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ordem de exibição
        </label>
        <input
          name="ordem"
          type="number"
          min="0"
          defaultValue={produto?.ordem ?? 0}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
        />
      </div>

      <BotaoSubmit />
    </form>
  )
}
