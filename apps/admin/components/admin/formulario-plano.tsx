'use client'

import { useTransition, useState } from 'react'
import { criarPlano } from '@/lib/actions/admin'

const inputClass = 'w-full border rounded-md px-3 py-2.5 text-[13px] text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

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
          <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
            Nome do plano *
          </label>
          <input
            name="nome"
            required
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
            placeholder="Ex: Básico, Pro, Enterprise"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
            Preço mensal (R$) *
          </label>
          <input
            name="preco_mensal"
            type="number"
            min="0"
            step="0.01"
            required
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
          Descrição
        </label>
        <input
          name="descricao"
          className={inputClass}
          style={{ borderColor: 'var(--line)' }}
          placeholder="Descrição breve do plano"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'max_lojas', label: 'Máx. lojas', default: '1' },
          { name: 'max_produtos', label: 'Máx. produtos', default: '30' },
          { name: 'max_entregadores', label: 'Máx. entregadores', default: '1' },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
              {field.label}
            </label>
            <input
              name={field.name}
              type="number"
              min="1"
              defaultValue={field.default}
              required
              className={inputClass}
              style={{ borderColor: 'var(--line)' }}
            />
          </div>
        ))}
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
              className="w-4 h-4 accent-brick-dk"
            />
            <span className="text-[13px] text-ink-2">{feature.label}</span>
          </label>
        ))}
      </div>

      {erro && (
        <p className="text-[13px] rounded-md px-3 py-2" style={{ background: '#fde8e4', color: 'var(--err)' }}>
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-[13px] rounded-md px-3 py-2" style={{ background: '#dcfce7', color: 'var(--ok)' }}>
          Plano criado e sincronizado no Stripe.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2.5 rounded-full text-[13px] font-bold
          hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        {isPending ? 'Criando...' : 'Criar plano'}
      </button>
    </form>
  )
}
