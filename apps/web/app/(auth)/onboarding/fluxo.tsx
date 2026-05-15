'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react'
import {
  formatarReais,
  getPisosByCategoria,
  getTemplateBySlug,
  type DashboardTemplate,
} from '@mallora/lib'
import { createSupabaseClient } from '@/lib/supabase/client'
import { logout } from '@/lib/actions/auth'
import { schemaDadosLoja, schemaDadosResponsavel } from '@/lib/validations/onboarding'
import { iconeDaCategoria } from './icones-categoria'
import type { DadosOnboarding } from './page'

interface Categoria {
  id: string
  slug: string
  nome: string
  ordem: number
}

interface Plano {
  id: string
  nome: string
  preco_mensal: number
  max_lojas: number
  max_produtos: number
  tem_estoque: boolean
  tem_relatorios: boolean
  tem_antecipacao: boolean
}

interface Props {
  carregando: boolean
  onFinalizar: (dados: Partial<DadosOnboarding>) => void
}

type EnderecoResolvido = {
  rua: string
  bairro: string
  cidade: string
  estado: string
}

const TOTAL_ETAPAS = 11

const TRANSICAO = { duration: 0.55, ease: [0.22, 1, 0.36, 1] } as const

// ============================================================================
// Máscaras de input (CNPJ, telefone, CEP) — formatam visualmente enquanto o
// usuário digita. As validações sempre olham apenas para os dígitos.
// ============================================================================

const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '')

function mascararCnpj(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

const featuresDoTemplate = (template: DashboardTemplate): string[] => {
  const features: string[] = []
  if (template.produto.permiteVariacoes !== 'nunca') {
    features.push('Variações de produto (tamanho, cor, etc.)')
  }
  if (template.produto.permiteModificadores) {
    features.push('Modificadores (adicionais, ponto da carne, etc.)')
  }
  if (template.modulos.estoque) features.push('Controle de estoque integrado')
  if (template.modulos.agenda) features.push('Agenda de horários')
  if (template.modulos.entregadores) features.push('Gestão de entregadores')
  return features
}

async function consultarCep(cep: string): Promise<EnderecoResolvido> {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  const dados = await resposta.json()
  if (dados.erro) throw new Error('CEP não encontrado')
  return {
    rua: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.localidade ?? '',
    estado: dados.uf ?? '',
  }
}

export function FluxoOnboarding({ carregando, onFinalizar }: Props) {
  const [etapa, setEtapa] = useState(0)
  const [dados, setDados] = useState<Partial<DadosOnboarding>>({})
  const [erro, setErro] = useState<string | null>(null)

  // Estado auxiliar para as etapas dependentes de dados remotos
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [buscaCategoria, setBuscaCategoria] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Campos individuais para inputs controlados
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [nomeLoja, setNomeLoja] = useState('')
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [planoId, setPlanoId] = useState('')

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase
      .from('categories')
      .select('id, slug, nome, ordem')
      .is('tenant_id', null)
      .eq('ativa', true)
      .order('ordem')
      .then(({ data }) => {
        if (data) {
          const validas = (data as Categoria[]).filter((c) => !!c.slug)
          setCategorias(validas)
        }
      })

    supabase
      .from('plans')
      .select('*')
      .eq('ativo', true)
      .order('preco_mensal')
      .then(({ data }) => {
        if (data) setPlanos(data as Plano[])
      })
  }, [])

  const categoriaSelecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId),
    [categorias, categoriaId],
  )

  const categoriasFiltradas = useMemo(() => {
    const termo = buscaCategoria
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
    if (!termo) return categorias
    return categorias.filter((c) =>
      c.nome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .includes(termo),
    )
  }, [buscaCategoria, categorias])

  function avancar() {
    setErro(null)
    setEtapa((e) => Math.min(e + 1, TOTAL_ETAPAS - 1))
  }

  function voltar() {
    setErro(null)
    setEtapa((e) => Math.max(e - 1, 0))
  }

  async function tratarContinuar() {
    setErro(null)
    switch (etapa) {
      case 0: {
        const r = schemaDadosResponsavel.shape.nome_responsavel.safeParse(nomeResponsavel.trim())
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, nome_responsavel: nomeResponsavel.trim() }))
        return avancar()
      }
      case 1: {
        const r = schemaDadosResponsavel.shape.cpf_cnpj.safeParse(cpfCnpj)
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, cpf_cnpj: apenasDigitos(cpfCnpj) }))
        return avancar()
      }
      case 2: {
        const r = schemaDadosResponsavel.shape.telefone.safeParse(telefone)
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, telefone: apenasDigitos(telefone) }))
        return avancar()
      }
      case 3: {
        const r = schemaDadosResponsavel.shape.email.safeParse(email.trim())
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, email: email.trim() }))
        return avancar()
      }
      case 4: {
        const r = schemaDadosResponsavel.shape.senha.safeParse(senha)
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, senha }))
        return avancar()
      }
      case 5: {
        if (!categoriaId) return setErro('Selecione uma categoria para continuar.')
        setDados((p) => ({ ...p, categoria_id: categoriaId }))
        return avancar()
      }
      case 6: {
        // Confirmação — segue direto
        return avancar()
      }
      case 7: {
        const r = schemaDadosLoja.shape.nome_loja.safeParse(nomeLoja.trim())
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, nome_loja: nomeLoja.trim() }))
        return avancar()
      }
      case 8: {
        const limpo = cep.replace(/\D/g, '')
        if (limpo.length !== 8) return setErro('Digite os 8 dígitos do CEP.')
        if (!dados.endereco?.rua) {
          // Garante que temos o endereço resolvido antes de seguir
          setBuscandoCep(true)
          try {
            const resolvido = await consultarCep(limpo)
            setDados((p) => ({
              ...p,
              endereco: {
                cep: limpo,
                rua: resolvido.rua,
                numero: '',
                complemento: '',
                bairro: resolvido.bairro,
                cidade: resolvido.cidade,
                estado: resolvido.estado,
              },
            }))
          } catch {
            setBuscandoCep(false)
            return setErro('CEP não encontrado. Verifique e tente novamente.')
          }
          setBuscandoCep(false)
        }
        return avancar()
      }
      case 9: {
        if (!numero.trim()) return setErro('Informe o número do endereço.')
        const enderecoAtual = dados.endereco
        if (!enderecoAtual) return setErro('Endereço inválido. Volte e refaça o CEP.')
        const enderecoCompleto = {
          ...enderecoAtual,
          numero: numero.trim(),
          complemento: complemento.trim() || undefined,
        }
        const r = schemaDadosLoja.shape.endereco.safeParse(enderecoCompleto)
        if (!r.success) return setErro(r.error.errors[0].message)
        setDados((p) => ({ ...p, endereco: enderecoCompleto }))
        return avancar()
      }
      case 10: {
        if (!planoId) return setErro('Selecione um plano para criar sua conta.')
        const final: Partial<DadosOnboarding> = { ...dados, plan_id: planoId }
        onFinalizar(final)
        return
      }
    }
  }

  // Quando o usuário termina de digitar o CEP completo, faz lookup automático
  // pra mostrar a previa do endereço já na próxima tela.
  useEffect(() => {
    const limpo = cep.replace(/\D/g, '')
    if (etapa !== 8 || limpo.length !== 8) return
    if (dados.endereco?.cep === limpo) return

    let cancelado = false
    setBuscandoCep(true)
    consultarCep(limpo)
      .then((resolvido) => {
        if (cancelado) return
        setDados((p) => ({
          ...p,
          endereco: {
            cep: limpo,
            rua: resolvido.rua,
            numero: '',
            complemento: '',
            bairro: resolvido.bairro,
            cidade: resolvido.cidade,
            estado: resolvido.estado,
          },
        }))
        setErro(null)
      })
      .catch(() => {
        if (cancelado) return
        setErro('CEP não encontrado. Verifique e tente novamente.')
      })
      .finally(() => {
        if (!cancelado) setBuscandoCep(false)
      })

    return () => {
      cancelado = true
    }
  }, [cep, etapa, dados.endereco?.cep])

  const podeAvancar = useMemo(() => {
    switch (etapa) {
      case 0:
        return nomeResponsavel.trim().length >= 3
      case 1:
        return apenasDigitos(cpfCnpj).length === 14
      case 2:
        return apenasDigitos(telefone).length >= 10
      case 3:
        return /\S+@\S+\.\S+/.test(email.trim())
      case 4:
        return senha.length >= 6
      case 5:
        return !!categoriaId
      case 6:
        return true
      case 7:
        return nomeLoja.trim().length >= 2
      case 8:
        return apenasDigitos(cep).length === 8 && !buscandoCep && !!dados.endereco?.rua
      case 9:
        return numero.trim().length > 0
      case 10:
        return !!planoId && !carregando
      default:
        return false
    }
  }, [
    etapa,
    nomeResponsavel,
    cpfCnpj,
    telefone,
    email,
    senha,
    categoriaId,
    nomeLoja,
    cep,
    buscandoCep,
    dados.endereco?.rua,
    numero,
    planoId,
    carregando,
  ])

  return (
    <motion.div
      key="onboarding-fluxo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="fixed inset-0 z-40 flex flex-col bg-[#09090B] text-white overflow-hidden"
    >
      {/* Fundo: grid sutil + glow lime */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#C1F148] opacity-[0.06] blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-60 -left-60 w-[460px] h-[460px] rounded-full bg-[#C1F148] opacity-[0.04] blur-[160px]"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-6 shrink-0">
        <div className="flex items-center">
          <Image
            src="/brand/mallevo-logo.png"
            alt="Mallevo"
            width={669}
            height={106}
            priority
            className="h-7 w-auto drop-shadow-[0_0_18px_rgba(193,241,72,0.18)]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_ETAPAS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === etapa
                  ? 'w-8 bg-[#C1F148]'
                  : i < etapa
                    ? 'w-2 bg-[#C1F148]/60'
                    : 'w-2 bg-white/15'
              }`}
            />
          ))}
        </div>

        <form action={logout} className="shrink-0">
          <button
            type="submit"
            className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </form>
      </header>

      {/* Conteúdo das perguntas */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-6 lg:px-10 py-12 lg:py-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={etapa}
              initial={{ opacity: 0, y: 50, filter: 'blur(14px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -50, filter: 'blur(14px)' }}
              transition={TRANSICAO}
            >
              {etapa === 0 && (
                <PerguntaTexto
                  eyebrow={`Passo 01 · ${TOTAL_ETAPAS}`}
                  titulo="Como devemos te chamar?"
                  subtitulo="Use seu nome completo. É assim que aparecerá nas comunicações oficiais com o Mallevo."
                  placeholder="Ex.: Maria Eduarda Souza"
                  value={nomeResponsavel}
                  onChange={setNomeResponsavel}
                  autoComplete="name"
                />
              )}

              {etapa === 1 && (
                <PerguntaTexto
                  eyebrow={`Passo 02 · ${TOTAL_ETAPAS}`}
                  titulo="Qual o CNPJ da sua empresa?"
                  subtitulo="Aceitamos apenas pessoa jurídica. Usamos o CNPJ para emitir notas, repassar pagamentos e manter sua conta em conformidade."
                  placeholder="00.000.000/0000-00"
                  value={cpfCnpj}
                  onChange={setCpfCnpj}
                  mask={mascararCnpj}
                  maxLength={18}
                  autoComplete="off"
                  inputMode="numeric"
                />
              )}

              {etapa === 2 && (
                <PerguntaTexto
                  eyebrow={`Passo 03 · ${TOTAL_ETAPAS}`}
                  titulo="Em qual número falamos com você?"
                  subtitulo="De preferência um WhatsApp ativo. É por aqui que avisamos sobre pedidos, repasses e suporte."
                  placeholder="(37) 99999-0000"
                  value={telefone}
                  onChange={setTelefone}
                  mask={mascararTelefone}
                  maxLength={15}
                  autoComplete="tel"
                  inputMode="tel"
                />
              )}

              {etapa === 3 && (
                <PerguntaTexto
                  eyebrow={`Passo 04 · ${TOTAL_ETAPAS}`}
                  titulo="Qual e-mail você vai usar para entrar?"
                  subtitulo="Esse será o login do painel e onde enviamos recibos, relatórios e avisos importantes."
                  placeholder="voce@suaempresa.com.br"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  type="email"
                  inputMode="email"
                />
              )}

              {etapa === 4 && (
                <PerguntaTexto
                  eyebrow={`Passo 05 · ${TOTAL_ETAPAS}`}
                  titulo="Crie uma senha forte."
                  subtitulo="Use ao menos 6 caracteres. Misture letras, números e símbolos para deixar sua conta mais segura."
                  placeholder="Mínimo de 6 caracteres"
                  value={senha}
                  onChange={setSenha}
                  type="password"
                  autoComplete="new-password"
                />
              )}

              {etapa === 5 && (
                <EscolhaCategoria
                  busca={buscaCategoria}
                  onBusca={setBuscaCategoria}
                  categorias={categoriasFiltradas}
                  selecionada={categoriaId}
                  onSelecionar={(id) => {
                    setCategoriaId(id)
                    setErro(null)
                  }}
                />
              )}

              {etapa === 6 && categoriaSelecionada && (
                <ConfirmacaoCategoria categoria={categoriaSelecionada} />
              )}

              {etapa === 7 && (
                <PerguntaTexto
                  eyebrow={`Passo 08 · ${TOTAL_ETAPAS}`}
                  titulo="Qual o nome da sua loja?"
                  subtitulo="É como os clientes vão encontrar você no shopping digital. Pode mudar depois nas configurações."
                  placeholder="Ex.: Padaria do Bairro"
                  value={nomeLoja}
                  onChange={setNomeLoja}
                  autoComplete="organization"
                />
              )}

              {etapa === 8 && (
                <PerguntaCep
                  cep={cep}
                  onChange={setCep}
                  buscando={buscandoCep}
                  enderecoResolvido={dados.endereco?.rua ? dados.endereco : undefined}
                />
              )}

              {etapa === 9 && (
                <PerguntaNumero
                  numero={numero}
                  complemento={complemento}
                  onNumero={setNumero}
                  onComplemento={setComplemento}
                  enderecoResolvido={dados.endereco}
                />
              )}

              {etapa === 10 && (
                <EscolhaPlano
                  planos={planos}
                  selecionado={planoId}
                  onSelecionar={(id) => {
                    setPlanoId(id)
                    setErro(null)
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Mensagem de erro inline */}
          <AnimatePresence>
            {erro && (
              <motion.p
                key={erro}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-6 text-sm text-rose-300/90"
              >
                {erro}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer com navegação */}
      <footer className="relative z-10 shrink-0 border-t border-white/[0.06] bg-[#09090B]/80 backdrop-blur-md">
        <div className="w-full max-w-3xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={voltar}
            disabled={etapa === 0 || carregando}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <button
            type="button"
            onClick={tratarContinuar}
            disabled={!podeAvancar}
            className="flex items-center gap-2 bg-[#C1F148] text-[#09090B] px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-[#d4ff5c] transition-all shadow-[0_0_40px_rgba(193,241,72,0.25)] disabled:bg-white/[0.06] disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {etapa === TOTAL_ETAPAS - 1 ? (
              carregando ? (
                <>
                  Criando conta
                  <div className="w-4 h-4 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin" />
                </>
              ) : (
                <>
                  Criar minha conta
                  <ArrowRight className="w-4 h-4" />
                </>
              )
            ) : (
              <>
                Continuar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </motion.div>
  )
}

// ============================================================================
// Sub-componentes
// ============================================================================

interface PerguntaTextoProps {
  eyebrow: string
  titulo: string
  subtitulo: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email' | 'password' | 'tel'
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  mask?: (valor: string) => string
  maxLength?: number
}

function PerguntaTexto({
  eyebrow,
  titulo,
  subtitulo,
  placeholder,
  value,
  onChange,
  type = 'text',
  autoComplete,
  inputMode,
  mask,
  maxLength,
}: PerguntaTextoProps) {
  return (
    <div>
      <Eyebrow texto={eyebrow} />
      <Titulo>{titulo}</Titulo>
      <Subtitulo>{subtitulo}</Subtitulo>
      <div className="mt-10">
        <input
          autoFocus
          type={type}
          value={value}
          onChange={(e) => onChange(mask ? mask(e.target.value) : e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          className="w-full bg-transparent text-3xl md:text-4xl font-medium text-white placeholder:text-white/20 border-b-2 border-white/10 focus:border-[#C1F148] focus:outline-none pb-4 transition-colors duration-300"
        />
      </div>
    </div>
  )
}

interface PerguntaCepProps {
  cep: string
  onChange: (v: string) => void
  buscando: boolean
  enderecoResolvido?: {
    rua: string
    bairro: string
    cidade: string
    estado: string
  }
}

function PerguntaCep({ cep, onChange, buscando, enderecoResolvido }: PerguntaCepProps) {
  return (
    <div>
      <Eyebrow texto={`Passo 09 · ${TOTAL_ETAPAS}`} />
      <Titulo>Onde a sua loja fica?</Titulo>
      <Subtitulo>
        Comece pelo CEP. A gente preenche o resto do endereço para você economizar tempo.
      </Subtitulo>
      <div className="mt-10 max-w-md">
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={cep}
          onChange={(e) => onChange(mascararCep(e.target.value))}
          placeholder="00000-000"
          maxLength={9}
          className="w-full bg-transparent text-4xl md:text-5xl font-medium text-white placeholder:text-white/20 border-b-2 border-white/10 focus:border-[#C1F148] focus:outline-none pb-4 tracking-[0.05em] transition-colors duration-300"
        />
        <div className="mt-4 h-6 flex items-center text-sm text-zinc-500">
          {buscando ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              Buscando endereço…
            </span>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {enderecoResolvido && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="mt-8 max-w-md p-5 rounded-2xl border border-[#C1F148]/20 bg-[#C1F148]/[0.04]"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#C1F148] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-[#09090B]" strokeWidth={3} />
              </div>
              <div className="text-sm">
                <p className="text-white font-medium">
                  {enderecoResolvido.rua || 'Endereço sem rua cadastrada'}
                </p>
                <p className="text-zinc-400 mt-1">
                  {[enderecoResolvido.bairro, enderecoResolvido.cidade, enderecoResolvido.estado]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface PerguntaNumeroProps {
  numero: string
  complemento: string
  onNumero: (v: string) => void
  onComplemento: (v: string) => void
  enderecoResolvido?: DadosOnboarding['endereco']
}

function PerguntaNumero({
  numero,
  complemento,
  onNumero,
  onComplemento,
  enderecoResolvido,
}: PerguntaNumeroProps) {
  return (
    <div>
      <Eyebrow texto={`Passo 10 · ${TOTAL_ETAPAS}`} />
      <Titulo>Qual o número e o complemento?</Titulo>
      <Subtitulo>Finalize o endereço para os entregadores e clientes encontrarem você.</Subtitulo>

      {enderecoResolvido && (
        <div className="mt-6 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-sm">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Endereço</p>
          <p className="text-white">
            {enderecoResolvido.rua}{' '}
            <span className="text-zinc-500">
              · {enderecoResolvido.bairro} · {enderecoResolvido.cidade}/{enderecoResolvido.estado}
            </span>
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Número
          </label>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={numero}
            onChange={(e) => onNumero(e.target.value)}
            placeholder="123"
            className="w-full bg-transparent text-2xl md:text-3xl font-medium text-white placeholder:text-white/20 border-b-2 border-white/10 focus:border-[#C1F148] focus:outline-none pb-3 transition-colors duration-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Complemento <span className="text-zinc-600 normal-case">(opcional)</span>
          </label>
          <input
            type="text"
            value={complemento}
            onChange={(e) => onComplemento(e.target.value)}
            placeholder="Sala, andar…"
            className="w-full bg-transparent text-2xl md:text-3xl font-medium text-white placeholder:text-white/20 border-b-2 border-white/10 focus:border-[#C1F148] focus:outline-none pb-3 transition-colors duration-300"
          />
        </div>
      </div>
    </div>
  )
}

interface EscolhaCategoriaProps {
  busca: string
  onBusca: (v: string) => void
  categorias: Categoria[]
  selecionada: string
  onSelecionar: (id: string) => void
}

function EscolhaCategoria({
  busca,
  onBusca,
  categorias,
  selecionada,
  onSelecionar,
}: EscolhaCategoriaProps) {
  return (
    <div className="relative">
      {/* Cabeçalho + busca: ficam fixos no topo enquanto as categorias rolam por baixo */}
      <div className="sticky top-0 z-20 -mt-12 pt-12 lg:-mt-16 lg:pt-16 -mx-6 px-6 lg:-mx-10 lg:px-10 bg-[#09090B]">
        <Eyebrow texto={`Passo 06 · ${TOTAL_ETAPAS}`} />
        <Titulo>Que tipo de negócio você tem?</Titulo>
        <Subtitulo>
          Sua categoria define como o painel é configurado, em qual vitrine sua loja aparece e
          quais ferramentas ficam disponíveis.
        </Subtitulo>

        <div className="mt-10 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar categoria…"
            className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C1F148]/50 focus:bg-white/[0.05] transition-all"
          />
        </div>

        {/* Gradiente de sombra: cards entram/saem "da sombra" ao rolar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-16 bg-gradient-to-b from-[#09090B] via-[#09090B]/70 to-transparent"
        />
      </div>

      {categorias.length === 0 ? (
        <p className="mt-12 text-sm text-zinc-500">
          Nenhuma categoria encontrada. Tente outro termo.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
          {categorias.map((cat) => {
            const Icone = iconeDaCategoria(cat.slug)
            const ativo = selecionada === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelecionar(cat.id)}
                className={`group flex flex-col items-center justify-center gap-3 px-3 py-5 rounded-2xl border transition-all duration-300 text-center ${
                  ativo
                    ? 'border-[#C1F148] bg-[#C1F148]/[0.08] shadow-[0_0_30px_rgba(193,241,72,0.12)]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    ativo
                      ? 'bg-[#C1F148] text-[#09090B]'
                      : 'bg-white/[0.04] text-zinc-300 group-hover:text-white'
                  }`}
                >
                  <Icone className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <span
                  className={`text-sm font-medium leading-tight transition-colors ${
                    ativo ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                  }`}
                >
                  {cat.nome}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConfirmacaoCategoria({ categoria }: { categoria: Categoria }) {
  const template = getTemplateBySlug(categoria.slug)
  const pisos = getPisosByCategoria(categoria.slug)
  const features = featuresDoTemplate(template)
  const Icone = iconeDaCategoria(categoria.slug)

  return (
    <div>
      <Eyebrow texto={`Passo 07 · ${TOTAL_ETAPAS}`} />
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-2xl bg-[#C1F148] flex items-center justify-center shadow-[0_0_40px_rgba(193,241,72,0.25)]">
          <Icone className="w-7 h-7 text-[#09090B]" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Você escolheu</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            {categoria.nome}
          </h2>
        </div>
      </div>

      <p className="mt-8 text-lg text-zinc-300 leading-relaxed max-w-2xl">
        Sua loja vai aparecer{' '}
        {pisos.length > 1 ? 'nas vitrines' : pisos.length === 1 ? 'na vitrine' : 'no shopping'}{' '}
        {pisos.map((p, i) => (
          <span key={p.slug}>
            {i > 0 && (i === pisos.length - 1 ? ' e ' : ', ')}
            <span className="font-semibold text-white">{p.nome}</span>
          </span>
        ))}
        .
      </p>

      {features.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
            Seu painel já vem otimizado com
          </p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-zinc-200">
                <span className="w-5 h-5 rounded-full bg-[#C1F148]/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#C1F148]" strokeWidth={3} />
                </span>
                <span className="text-base">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-10 text-sm text-zinc-500 max-w-2xl">
        Essa escolha define o funcionamento da loja. Caso precise trocar depois, é só falar com o
        suporte.
      </p>
    </div>
  )
}

interface EscolhaPlanoProps {
  planos: Plano[]
  selecionado: string
  onSelecionar: (id: string) => void
}

function EscolhaPlano({ planos, selecionado, onSelecionar }: EscolhaPlanoProps) {
  return (
    <div>
      <Eyebrow texto={`Passo 11 · ${TOTAL_ETAPAS}`} />
      <Titulo>Escolha o plano da sua loja.</Titulo>
      <Subtitulo>
        Comissão fixa de R$ 1,00 por pedido — sem porcentagem. Você troca de plano quando quiser.
      </Subtitulo>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {planos.map((plano) => {
          const ativo = selecionado === plano.id
          return (
            <button
              key={plano.id}
              type="button"
              onClick={() => onSelecionar(plano.id)}
              className={`group relative flex flex-col text-left rounded-2xl border transition-all duration-300 overflow-hidden ${
                ativo
                  ? 'border-[#C1F148]/50 bg-gradient-to-b from-[#C1F148]/[0.08] via-[#C1F148]/[0.02] to-transparent shadow-[0_8px_40px_-12px_rgba(193,241,72,0.4)] ring-1 ring-[#C1F148]/20'
                  : 'border-white/[0.06] bg-gradient-to-b from-white/[0.045] to-white/[0.005] hover:border-white/15 hover:from-white/[0.07]'
              }`}
            >
              {/* Halo lime sutil vazando pelo topo quando selecionado */}
              {ativo && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-32 bg-[#C1F148] opacity-[0.18] blur-3xl"
                />
              )}

              {/* Header — nome + indicador na mesma linha, preço logo abaixo */}
              <div className="relative px-6 pt-6 pb-5">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500">
                    {plano.nome}
                  </p>
                  <div
                    aria-hidden
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      ativo
                        ? 'bg-[#C1F148] scale-100'
                        : 'border border-white/15 bg-white/[0.02] scale-90 group-hover:scale-100 group-hover:border-white/25'
                    }`}
                  >
                    {ativo && <Check className="w-3 h-3 text-[#09090B]" strokeWidth={3.5} />}
                  </div>
                </div>

                {plano.preco_mensal === 0 ? (
                  <p className="text-2xl font-semibold text-white tracking-tight whitespace-nowrap">
                    Sob consulta
                  </p>
                ) : (
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="text-3xl font-bold text-white tracking-tight">
                      {formatarReais(plano.preco_mensal)}
                    </span>
                    <span className="text-sm text-zinc-500 font-medium">/mês</span>
                  </div>
                )}
              </div>

              {/* Divisor entre header e benefícios */}
              <div
                aria-hidden
                className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
              />

              {/* Lista de benefícios — flex-1 garante que todos os cards tenham a mesma altura */}
              <ul className="flex-1 px-6 pt-5 pb-6 space-y-3">
                <ItemPlano ativo={ativo}>
                  Até <strong className="font-semibold text-white">{plano.max_lojas}</strong>{' '}
                  {plano.max_lojas === 1 ? 'loja' : 'lojas'}
                </ItemPlano>
                <ItemPlano ativo={ativo}>
                  Até <strong className="font-semibold text-white">{plano.max_produtos}</strong>{' '}
                  produtos
                </ItemPlano>
                {plano.tem_estoque && <ItemPlano ativo={ativo}>Controle de estoque</ItemPlano>}
                {plano.tem_relatorios && <ItemPlano ativo={ativo}>Relatórios avançados</ItemPlano>}
                {plano.tem_antecipacao && (
                  <ItemPlano ativo={ativo}>Antecipação de recebíveis</ItemPlano>
                )}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ItemPlano({ children, ativo }: { children: React.ReactNode; ativo: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-zinc-300">
      <span
        className={`mt-[3px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          ativo ? 'bg-[#C1F148] text-[#09090B]' : 'bg-white/[0.05] text-zinc-500'
        }`}
      >
        <Check className="w-2.5 h-2.5" strokeWidth={4} />
      </span>
      <span>{children}</span>
    </li>
  )
}

// ============================================================================
// Pequenos blocos de tipografia para garantir consistência entre perguntas
// ============================================================================

function Eyebrow({ texto }: { texto: string }) {
  return (
    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#C1F148]/70 mb-4">
      {texto}
    </p>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
      {children}
    </h2>
  )
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed">{children}</p>
}
