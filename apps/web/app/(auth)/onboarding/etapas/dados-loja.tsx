'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { schemaDadosLoja } from '@/lib/validations/onboarding'
import type { DadosOnboarding } from '../page'
import { ArrowLeft, ArrowRight, Store, MapPin, Building2, LayoutGrid, Tag } from 'lucide-react'

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

const InputWrapper = ({ 
  name, 
  type = 'text', 
  defaultValue, 
  placeholder, 
  error, 
  onChange, 
  onBlur, 
  maxLength, 
  icon: Icon 
}: {
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  error?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  maxLength?: number
  icon: React.ElementType
}) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-zinc-400" />
    </div>
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      maxLength={maxLength}
      className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
        error 
          ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
          : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
      }`}
    />
  </div>
)

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
        cep: (formData.get('cep') as string || '').replace(/\D/g, ''),
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
    <div className="w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
          Dados da Loja
        </h2>
        <p className="text-zinc-500 text-lg">
          Configure as informações principais do seu estabelecimento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Nome da loja
            </label>
            <InputWrapper
              name="nome_loja"
              defaultValue={dadosIniciais.nome_loja}
              placeholder="Minha Loja Incrível"
              error={erros.nome_loja}
              icon={Store}
            />
            {erros.nome_loja && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.nome_loja}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Categoria
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LayoutGrid className="h-5 w-5 text-zinc-400" />
              </div>
              <select
                name="categoria_id"
                defaultValue={dadosIniciais.categoria_id}
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 focus:outline-none focus:bg-white transition-all duration-200 appearance-none ${
                  erros.categoria_id 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              >
                <option value="" disabled selected className="text-zinc-400">Selecione uma categoria</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icone ? `${cat.icone} ` : ''}{cat.nome}
                  </option>
                ))}
              </select>
            </div>
            {erros.categoria_id && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.categoria_id}</p>
            )}
          </div>

          <div className="pt-4 pb-2">
            <h3 className="text-lg font-semibold text-zinc-800 flex items-center gap-2 border-b border-gray-100 pb-2">
              <MapPin className="w-5 h-5 text-zinc-800" />
              Endereço
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                CEP
              </label>
              <div className="relative">
                <InputWrapper
                  name="cep"
                  defaultValue={dadosIniciais.endereco?.cep}
                  placeholder="00000-000"
                  onBlur={handleCepBlur}
                  error={erros['endereco.cep']}
                  icon={MapPin}
                />
                {buscandoCep && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {erros['endereco.cep'] && (
                <p className="text-sm text-red-500 mt-1.5 ml-1">{erros['endereco.cep']}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Rua
              </label>
              <input
                name="rua"
                type="text"
                value={endereco.rua}
                onChange={e => setEndereco(prev => ({ ...prev, rua: e.target.value }))}
                placeholder="Nome da rua, avenida..."
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.rua'] ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
              {erros['endereco.rua'] && (
                <p className="text-sm text-red-500 mt-1.5 ml-1">{erros['endereco.rua']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Número
              </label>
              <input
                name="numero"
                type="text"
                defaultValue={dadosIniciais.endereco?.numero}
                placeholder="123"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.numero'] ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
              {erros['endereco.numero'] && (
                <p className="text-sm text-red-500 mt-1.5 ml-1">{erros['endereco.numero']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Complemento
              </label>
              <input
                name="complemento"
                type="text"
                defaultValue={dadosIniciais.endereco?.complemento}
                placeholder="Sala, Andar, etc. (Opcional)"
                className="w-full px-4 py-3.5 bg-gray-50/50 border-2 border-transparent rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200 transition-all duration-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Bairro
              </label>
              <input
                name="bairro"
                type="text"
                value={endereco.bairro}
                onChange={e => setEndereco(prev => ({ ...prev, bairro: e.target.value }))}
                placeholder="Nome do bairro"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.bairro'] ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
              {erros['endereco.bairro'] && (
                <p className="text-sm text-red-500 mt-1.5 ml-1">{erros['endereco.bairro']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Cidade
              </label>
              <input
                name="cidade"
                type="text"
                value={endereco.cidade}
                onChange={e => setEndereco(prev => ({ ...prev, cidade: e.target.value }))}
                placeholder="Sua cidade"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.cidade'] ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
              {erros['endereco.cidade'] && (
                <p className="text-sm text-red-500 mt-1.5 ml-1">{erros['endereco.cidade']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Estado
              </label>
              <input
                name="estado"
                type="text"
                value={endereco.estado}
                onChange={e => setEndereco(prev => ({ ...prev, estado: e.target.value }))}
                maxLength={2}
                placeholder="UF"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 uppercase ${
                  erros['endereco.estado'] ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
              {erros['endereco.estado'] && (
                <p className="text-sm text-red-500 mt-1.5 ml-1">{erros['endereco.estado']}</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onVoltar}
            className="flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-zinc-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#C1F148] text-zinc-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#aee623] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C1F148]/20"
          >
            Escolher Plano
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
