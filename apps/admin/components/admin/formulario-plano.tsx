'use client'

import { useTransition, useState } from 'react'
import { criarPlano } from '@/lib/actions/admin'

export function FormularioPlano() {
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const resultado = await criarPlano(formData)
      if (resultado?.erro) {
        setErro(resultado.erro)
      } else {
        setSucesso(true)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nome do plano *
          </label>
          <input
            name="nome"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            placeholder="Ex: Básico, Pro, Enterprise"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Preço mensal (R$) *
          </label>
          <input
            name="preco_mensal"
            type="number"
            min="0"
            step="0.01"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
        <input
          name="descricao"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          placeholder="Descrição breve do plano"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Máx. lojas</label>
          <input
            name="max_lojas"
            type="number"
            min="1"
            defaultValue="1"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Máx. produtos</label>
          <input
            name="max_produtos"
            type="number"
            min="1"
            defaultValue="30"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Máx. entregadores
          </label>
          <input
            name="max_entregadores"
            type="number"
            min="1"
            defaultValue="1"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {[
          { name: 'tem_estoque', label: 'Módulo de estoque' },
          { name: 'tem_relatorios', label: 'Relatórios avançados' },
          { name: 'tem_antecipacao', label: 'Antecipação de recebíveis' },
        ].map((feature) => (
          <label key={feature.name} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name={feature.name}
              value="true"
              className="w-4 h-4 accent-[#4CAF82]"
            />
            <span className="text-sm text-gray-600">{feature.label}</span>
          </label>
        ))}
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
      )}
      {sucesso && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Plano criado e sincronizado no Stripe.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-[#1A4D3A] text-white text-sm font-medium rounded-lg
          hover:bg-[#143d2e] disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Criando...' : 'Criar plano'}
      </button>
    </form>
  )
}
