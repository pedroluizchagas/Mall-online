'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { schemaDadosLoja } from '@/lib/validations/onboarding'
import type { DadosOnboarding } from '../page'
import {
  ArrowLeft,
  ArrowRight,
  Store,
  MapPin,
  Search,
  Check,
} from 'lucide-react'
import {
  getPisosByCategoria,
  getTemplateBySlug,
  type DashboardTemplate,
} from '@mallora/lib'

interface Props {
  dadosIniciais: Partial<DadosOnboarding>
  onAvancar: (dados: Partial<DadosOnboarding>) => void
  onVoltar: () => void
}

interface Categoria {
  id: string
  slug: string
  nome: string
  icone: string | null
  ordem: number
}

const SLUGS_DESTAQUE = [
  'alimentos-bebidas',
  'vestuario-calcados',
  'farmacia-medicamentos',
  'pet-shop',
] as const

type EtapaInterna = 'selecao' | 'confirmacao' | 'dados'

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

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function featuresDoTemplate(template: DashboardTemplate): string[] {
  const features: string[] = []
  if (template.produto.permiteVariacoes !== 'nunca') {
    features.push('Variações de produto (tamanho, cor)')
  }
  if (template.produto.permiteModificadores) {
    features.push('Modificadores (adicionais, ponto da carne)')
  }
  if (template.modulos.estoque) {
    features.push('Controle de estoque')
  }
  if (template.modulos.agenda) {
    features.push('Agenda de horários')
  }
  if (template.modulos.entregadores) {
    features.push('Gestão de entregadores')
  }
  return features
}

export function EtapaDadosLoja({ dadosIniciais, onAvancar, onVoltar }: Props) {
  const [erros, setErros] = useState<Record<string, string>>({})
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaIdSelecionada, setCategoriaIdSelecionada] = useState<string>(
    dadosIniciais.categoria_id ?? '',
  )
  // Se já tinha categoria, começa direto em "dados" pra não bloquear o lojista
  // que só voltou no wizard pra editar nome/endereço.
  const [etapaInterna, setEtapaInterna] = useState<EtapaInterna>(
    dadosIniciais.categoria_id ? 'dados' : 'selecao',
  )
  const [busca, setBusca] = useState('')
  const [verTodas, setVerTodas] = useState(false)
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
      .select('id, slug, nome, icone, ordem')
      .is('tenant_id', null)
      .eq('ativa', true)
      .order('ordem')
      .then(({ data }) => {
        if (data) {
          // Filtra apenas as que têm slug — categorias antigas sem slug não
          // resolvem template e não devem aparecer no onboarding.
          const validas = (data as unknown as Categoria[]).filter((c) => !!c.slug)
          setCategorias(validas)
        }
      })
  }, [])

  const categoriasDestaque = useMemo(
    () => SLUGS_DESTAQUE
      .map((slug) => categorias.find((c) => c.slug === slug))
      .filter((c): c is Categoria => !!c),
    [categorias],
  )

  const categoriasRestantes = useMemo(
    () => categorias.filter((c) => !SLUGS_DESTAQUE.includes(c.slug as typeof SLUGS_DESTAQUE[number])),
    [categorias],
  )

  const categoriasFiltradas = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return categoriasRestantes
    return categorias.filter((c) => normalizar(c.nome).includes(termo))
  }, [busca, categorias, categoriasRestantes])

  const categoriaSelecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaIdSelecionada),
    [categorias, categoriaIdSelecionada],
  )

  function selecionarCategoria(cat: Categoria) {
    setCategoriaIdSelecionada(cat.id)
    setErros((prev) => ({ ...prev, categoria_id: '' }))
    setEtapaInterna('confirmacao')
  }

  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value.replace(/\D/g, '')
    if (cep.length !== 8) return

    setBuscandoCep(true)
    try {
      const dados = await buscarCep(cep)
      setEndereco(dados)
    } catch {
      setErros((prev) => ({ ...prev, 'endereco.cep': 'CEP não encontrado' }))
    } finally {
      setBuscandoCep(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const dados = {
      nome_loja: formData.get('nome_loja') as string,
      categoria_id: categoriaIdSelecionada,
      endereco: {
        cep: ((formData.get('cep') as string) || '').replace(/\D/g, ''),
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
      resultado.error.errors.forEach((err) => {
        const key = err.path.join('.')
        novosErros[key] = err.message
      })
      setErros(novosErros)
      return
    }

    setErros({})
    onAvancar(dados)
  }

  // ============ ETAPA A: seleção de categoria ============
  if (etapaInterna === 'selecao') {
    return (
      <div className="w-full">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
            Que tipo de negócio você tem?
          </h2>
          <p className="text-zinc-500 text-lg">
            Escolha a categoria que melhor descreve sua loja. Isso define como o
            seu dashboard funciona.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
          {/* Busca */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                if (e.target.value.trim()) setVerTodas(true)
              }}
              placeholder="Buscar categoria..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 border-transparent rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200 transition-all duration-200"
            />
          </div>

          {/* Mais comuns */}
          {!busca.trim() && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">
                Mais comuns
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoriasDestaque.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selecionarCategoria(cat)}
                    className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 bg-gray-50/50 hover:border-[#C1F148] hover:bg-white transition-all text-left"
                  >
                    <span className="text-3xl">{cat.icone ?? '🏪'}</span>
                    <span className="text-zinc-900 font-semibold text-base">
                      {cat.nome}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toggle ver todas */}
          {!busca.trim() && (
            <button
              type="button"
              onClick={() => setVerTodas((v) => !v)}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 underline"
            >
              {verTodas ? 'Ocultar outras categorias' : `Ver todas as categorias (${categoriasRestantes.length}) ▼`}
            </button>
          )}

          {/* Lista das outras (ou resultados de busca) */}
          {(verTodas || busca.trim()) && (
            <div>
              {busca.trim() && (
                <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">
                  Resultados ({categoriasFiltradas.length})
                </h3>
              )}
              {categoriasFiltradas.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Nenhuma categoria encontrada. Tente outro termo.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {categoriasFiltradas.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selecionarCategoria(cat)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#C1F148] hover:bg-gray-50/50 transition-all text-left"
                    >
                      <span className="text-xl">{cat.icone ?? '🏪'}</span>
                      <span className="text-zinc-800 font-medium text-sm">
                        {cat.nome}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onVoltar}
            className="flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-zinc-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          {categoriaIdSelecionada && (
            <button
              type="button"
              onClick={() => setEtapaInterna('confirmacao')}
              className="flex items-center gap-2 bg-[#C1F148] text-zinc-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#aee623] transition-all"
            >
              Continuar
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ============ ETAPA B: confirmação ============
  if (etapaInterna === 'confirmacao' && categoriaSelecionada) {
    const template = getTemplateBySlug(categoriaSelecionada.slug)
    const pisos = getPisosByCategoria(categoriaSelecionada.slug)
    const features = featuresDoTemplate(template)

    return (
      <div className="w-full">
        <div className="mb-10">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Você selecionou
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3 flex items-center gap-3">
            <span className="text-4xl">{categoriaSelecionada.icone ?? '🏪'}</span>
            {categoriaSelecionada.nome}
          </h2>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <p className="text-zinc-700 text-base">
            Sua loja vai aparecer{' '}
            {pisos.length > 1 ? 'nas vitrines' : 'na vitrine'}{' '}
            {pisos.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && (i === pisos.length - 1 ? ' e ' : ', ')}
                <span className="font-bold">
                  {p.icone} {p.nome}
                </span>
              </span>
            ))}
            {pisos.length === 0 && <span className="font-bold">do shopping</span>}.
          </p>

          {features.length > 0 && (
            <div>
              <p className="text-zinc-900 font-semibold mb-3">
                O Mallevo vai te dar um dashboard otimizado para vender:
              </p>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-700">
                    <Check className="w-5 h-5 text-[#7CB342] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-900">
              Esta escolha define como sua loja funciona.{' '}
              <strong>
                Você pode trocar mais tarde via suporte se for necessário.
              </strong>
            </p>
          </div>
        </div>

        <div className="pt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setEtapaInterna('selecao')}
            className="flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-zinc-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setEtapaInterna('dados')}
            className="flex items-center gap-2 bg-[#C1F148] text-zinc-900 px-8 py-4 rounded-xl font-semibold hover:bg-[#aee623] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C1F148]/20"
          >
            Confirmar e seguir
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // ============ ETAPA C: nome + endereço ============
  return (
    <div className="w-full">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-3">
            Dados da Loja
          </h2>
          <p className="text-zinc-500 text-lg">
            Configure as informações principais do seu estabelecimento.
          </p>
        </div>
        {categoriaSelecionada && (
          <button
            type="button"
            onClick={() => setEtapaInterna('selecao')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white text-sm text-zinc-700 self-start"
          >
            <span className="text-base">{categoriaSelecionada.icone ?? '🏪'}</span>
            <span className="font-medium">{categoriaSelecionada.nome}</span>
            <span className="text-xs text-zinc-500 underline ml-1">trocar</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Nome da loja
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Store className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                name="nome_loja"
                type="text"
                defaultValue={dadosIniciais.nome_loja}
                placeholder="Minha Loja Incrível"
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros.nome_loja
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                }`}
              />
            </div>
            {erros.nome_loja && (
              <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.nome_loja}</p>
            )}
          </div>

          {erros.categoria_id && (
            <p className="text-sm text-red-500 mt-1.5 ml-1">{erros.categoria_id}</p>
          )}

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
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  name="cep"
                  type="text"
                  defaultValue={dadosIniciais.endereco?.cep}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                    erros['endereco.cep']
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
                  }`}
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
                onChange={(e) => setEndereco((prev) => ({ ...prev, rua: e.target.value }))}
                placeholder="Nome da rua, avenida..."
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.rua']
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
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
                  erros['endereco.numero']
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
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
                onChange={(e) => setEndereco((prev) => ({ ...prev, bairro: e.target.value }))}
                placeholder="Nome do bairro"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.bairro']
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
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
                onChange={(e) => setEndereco((prev) => ({ ...prev, cidade: e.target.value }))}
                placeholder="Sua cidade"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                  erros['endereco.cidade']
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
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
                onChange={(e) => setEndereco((prev) => ({ ...prev, estado: e.target.value }))}
                maxLength={2}
                placeholder="UF"
                className={`w-full px-4 py-3.5 bg-gray-50/50 border-2 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white transition-all duration-200 uppercase ${
                  erros['endereco.estado']
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-transparent focus:border-[#C1F148] focus:ring-4 focus:ring-[#C1F148]/20 hover:border-gray-200'
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
            onClick={() => setEtapaInterna('confirmacao')}
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
