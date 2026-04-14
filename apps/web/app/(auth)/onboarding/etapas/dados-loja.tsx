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
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-brand-800 tracking-tight">
          Dados da loja
        </h2>
        <p className="text-gray-400 text-sm mt-1.5">
          Configure as informações do seu estabelecimento
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome + Categoria */}
        <div>
          <label className="label">Nome da loja</label>
          <input
            name="nome_loja"
            type="text"
            defaultValue={dadosIniciais.nome_loja}
            placeholder="Ex: Pizzaria do João"
            className="input-field"
          />
          {erros.nome_loja && (
            <p className="text-xs text-red-500 mt-1.5">{erros.nome_loja}</p>
          )}
        </div>

        <div>
          <label className="label">Categoria</label>
          <select
            name="categoria_id"
            defaultValue={dadosIniciais.categoria_id}
            className="input-field"
          >
            <option value="">Selecione uma categoria</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icone ? `${cat.icone} ` : ''}{cat.nome}
              </option>
            ))}
          </select>
          {erros.categoria_id && (
            <p className="text-xs text-red-500 mt-1.5">{erros.categoria_id}</p>
          )}
        </div>

        {/* Bloco de endereço */}
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Endereço</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">CEP</label>
              <div className="relative">
                <input
                  name="cep"
                  type="text"
                  defaultValue={dadosIniciais.endereco?.cep}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className="input-field"
                />
                {buscandoCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin text-brand-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  </div>
                )}
              </div>
              {erros['endereco.cep'] && (
                <p className="text-xs text-red-500 mt-1.5">{erros['endereco.cep']}</p>
              )}
            </div>

            <div>
              <label className="label">Rua</label>
              <input
                name="rua"
                type="text"
                value={endereco.rua}
                onChange={e => setEndereco(prev => ({ ...prev, rua: e.target.value }))}
                className="input-field"
              />
              {erros['endereco.rua'] && (
                <p className="text-xs text-red-500 mt-1.5">{erros['endereco.rua']}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Número</label>
                <input
                  name="numero"
                  type="text"
                  defaultValue={dadosIniciais.endereco?.numero}
                  className="input-field"
                />
                {erros['endereco.numero'] && (
                  <p className="text-xs text-red-500 mt-1.5">{erros['endereco.numero']}</p>
                )}
              </div>
              <div>
                <label className="label">Complemento</label>
                <input
                  name="complemento"
                  type="text"
                  defaultValue={dadosIniciais.endereco?.complemento}
                  placeholder="Apto, sala..."
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label">Bairro</label>
              <input
                name="bairro"
                type="text"
                value={endereco.bairro}
                onChange={e => setEndereco(prev => ({ ...prev, bairro: e.target.value }))}
                className="input-field"
              />
              {erros['endereco.bairro'] && (
                <p className="text-xs text-red-500 mt-1.5">{erros['endereco.bairro']}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cidade</label>
                <input
                  name="cidade"
                  type="text"
                  value={endereco.cidade}
                  onChange={e => setEndereco(prev => ({ ...prev, cidade: e.target.value }))}
                  className="input-field"
                />
                {erros['endereco.cidade'] && (
                  <p className="text-xs text-red-500 mt-1.5">{erros['endereco.cidade']}</p>
                )}
              </div>
              <div>
                <label className="label">Estado</label>
                <input
                  name="estado"
                  type="text"
                  value={endereco.estado}
                  onChange={e => setEndereco(prev => ({ ...prev, estado: e.target.value }))}
                  maxLength={2}
                  placeholder="MG"
                  className="input-field uppercase"
                />
                {erros['endereco.estado'] && (
                  <p className="text-xs text-red-500 mt-1.5">{erros['endereco.estado']}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onVoltar}
            className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl font-medium hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 text-sm"
          >
            Voltar
          </button>
          <button type="submit" className="flex-1 btn-primary">
            Continuar
          </button>
        </div>
      </form>
    </div>
  )
}
