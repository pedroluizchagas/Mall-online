'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { schemaDadosLoja } from '@/lib/validations/onboarding'
import type { DadosOnboarding } from '../page'

interface Props {
  dadosIniciais: Partial<DadosOnboarding>
  onAvancar: (dados: Partial<DadosOnboarding>) => void
  onVoltar: () => void
}

interface Categoria {
  id: string
  nome: string
  icone: string | null
}

async function buscarCep(cep: string) {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  const dados = await resposta.json()
  if (dados.erro) throw new Error('CEP não encontrado')
  return {
    rua: dados.logradouro,
    bairro: dados.bairro,
    cidade: dados.localidade,
    estado: dados.uf,
  }
}

export function EtapaDadosLoja({ dadosIniciais, onAvancar, onVoltar }: Props) {
  const [erros, setErros] = useState<Record<string, string>>({})
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [endereco, setEndereco] = useState({
    rua: dadosIniciais.endereco?.rua ?? '',
    bairro: dadosIniciais.endereco?.bairro ?? '',
    cidade: dadosIniciais.endereco?.cidade ?? '',
    estado: dadosIniciais.endereco?.estado ?? '',
  })
  const [buscandoCep, setBuscandoCep] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase
      .from('categories')
      .select('id, nome, icone')
      .is('tenant_id', null)
      .eq('ativa', true)
      .order('ordem')
      .then(({ data }) => {
        if (data) setCategorias(data as Categoria[])
      })
  }, [])

  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value.replace(/\D/g, '')
    if (cep.length !== 8) return

    setBuscandoCep(true)
    try {
      const dados = await buscarCep(cep)
      setEndereco(dados)
    } catch {
      setErros(prev => ({ ...prev, 'endereco.cep': 'CEP não encontrado' }))
    } finally {
      setBuscandoCep(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const dados = {
      nome_loja: formData.get('nome_loja') as string,
      categoria_id: formData.get('categoria_id') as string,
      endereco: {
        cep: (formData.get('cep') as string).replace(/\D/g, ''),
        rua: formData.get('rua') as string,
        numero: formData.get('numero') as string,
        complemento: (formData.get('complemento') as string) || undefined,
        bairro: formData.get('bairro') as string,
        cidade: formData.get('cidade') as string,
        estado: formData.get('estado') as string,
      },
    }

    const resultado = schemaDadosLoja.safeParse(dados)

    if (!resultado.success) {
      const novosErros: Record<string, string> = {}
      resultado.error.errors.forEach(err => {
        const key = err.path.join('.')
        novosErros[key] = err.message
      })
      setErros(novosErros)
      return
    }

    setErros({})
    onAvancar(dados)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#1A4D3A] mb-1">
        Dados da loja
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Configure as informações do seu estabelecimento
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da loja
          </label>
          <input
            name="nome_loja"
            type="text"
            defaultValue={dadosIniciais.nome_loja}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros.nome_loja && (
            <p className="text-sm text-red-600 mt-1">{erros.nome_loja}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <select
            name="categoria_id"
            defaultValue={dadosIniciais.categoria_id}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82] bg-white"
          >
            <option value="">Selecione uma categoria</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icone ? `${cat.icone} ` : ''}{cat.nome}
              </option>
            ))}
          </select>
          {erros.categoria_id && (
            <p className="text-sm text-red-600 mt-1">{erros.categoria_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CEP
          </label>
          <input
            name="cep"
            type="text"
            defaultValue={dadosIniciais.endereco?.cep}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {buscandoCep && (
            <p className="text-sm text-gray-400 mt-1">Buscando endereço...</p>
          )}
          {erros['endereco.cep'] && (
            <p className="text-sm text-red-600 mt-1">{erros['endereco.cep']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rua
          </label>
          <input
            name="rua"
            type="text"
            value={endereco.rua}
            onChange={e => setEndereco(prev => ({ ...prev, rua: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros['endereco.rua'] && (
            <p className="text-sm text-red-600 mt-1">{erros['endereco.rua']}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número
            </label>
            <input
              name="numero"
              type="text"
              defaultValue={dadosIniciais.endereco?.numero}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
            {erros['endereco.numero'] && (
              <p className="text-sm text-red-600 mt-1">{erros['endereco.numero']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complemento
            </label>
            <input
              name="complemento"
              type="text"
              defaultValue={dadosIniciais.endereco?.complemento}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bairro
          </label>
          <input
            name="bairro"
            type="text"
            value={endereco.bairro}
            onChange={e => setEndereco(prev => ({ ...prev, bairro: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
          />
          {erros['endereco.bairro'] && (
            <p className="text-sm text-red-600 mt-1">{erros['endereco.bairro']}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade
            </label>
            <input
              name="cidade"
              type="text"
              value={endereco.cidade}
              onChange={e => setEndereco(prev => ({ ...prev, cidade: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
            {erros['endereco.cidade'] && (
              <p className="text-sm text-red-600 mt-1">{erros['endereco.cidade']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <input
              name="estado"
              type="text"
              value={endereco.estado}
              onChange={e => setEndereco(prev => ({ ...prev, estado: e.target.value }))}
              maxLength={2}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
            {erros['endereco.estado'] && (
              <p className="text-sm text-red-600 mt-1">{erros['endereco.estado']}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onVoltar}
            className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#1A4D3A] text-white py-3 rounded-lg font-medium hover:bg-[#163d2e] transition-colors"
          >
            Continuar
          </button>
        </div>
      </form>
    </div>
  )
}
