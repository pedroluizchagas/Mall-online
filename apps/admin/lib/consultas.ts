import type { User } from '@supabase/supabase-js'
import { CATEGORIA_SLUG_TO_TEMPLATE, type TemplateCodigo } from '@mallevo/lib'
import { createSupabaseServer } from '@/lib/supabase/server'
import { buscarTodas } from '@/lib/supabase/paginar'
import { exigirAdmin } from '@/lib/acesso'
import { inicioDoDia, intervaloDoMes, ultimosMeses, type Mes } from '@/lib/hoje'
import { casaBusca, contarPor, janelaDeComparacao, maisRecente, resumir, serieMensal, type Resumo } from '@/lib/metricas'
import { grupoDosRecebimentos, rotuloVeiculo, type GrupoRecebimentos } from '@/lib/status'

/**
 * Leituras da administração — renderizadas no servidor, fora do `'use
 * server'` (lá só ficam as mutações, para nenhuma consulta virar endpoint
 * de ação). Toda função confere o papel de admin antes de ler.
 *
 * Contratos que valem para todas:
 * - dinheiro em CENTAVOS;
 * - "hoje" e "mês" no relógio de Divinópolis (lib/hoje.ts);
 * - pedido conta no mês em que foi FEITO (`criado_em`, que não muda), não no
 *   da última atualização — senão um estorno tardio mudaria o mês fechado;
 * - nada de corte silencioso em 1000 linhas (lib/supabase/paginar.ts).
 */

type Supabase = ReturnType<typeof createSupabaseServer>

/** Pedidos que ainda estão no balcão de alguma loja. */
const STATUS_EM_ANDAMENTO = ['novo', 'confirmado', 'em_preparo', 'aguardando_entregador', 'saiu_para_entrega']

/** Assinatura que dá direito a operar (a mesma régua do painel web). */
const ASSINATURA_VIGENTE = ['ativa', 'trial']

// ─── Diretório ────────────────────────────────────────────────────────────

/** A categoria genérica "outros" é única globalmente (`tenant_id` nulo). */
async function idDaCategoriaOutros(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'outros')
    .is('tenant_id', null)
    .limit(1)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

async function contarLojasEmOutros(supabase: Supabase, idOutros: string | null): Promise<number> {
  if (!idOutros) return 0
  const { count } = await supabase.from('stores').select('id', { count: 'exact', head: true }).eq('categoria_id', idOutros)
  return count ?? 0
}

// ─── Lojistas ─────────────────────────────────────────────────────────────

const SELECT_LOJISTA = `
  id, nome_responsavel, email, telefone, ativo, pagarme_onboarding_status, criado_em,
  stores (id, nome, slug, logo_url, ativo, criado_em),
  tenant_subscriptions (billing_status, trial_termina_em, criado_em, plans (nome))
`

interface LinhaLojista {
  id: string
  nome_responsavel: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
  pagarme_onboarding_status: string | null
  criado_em: string
  stores: { id: string; nome: string; slug: string | null; logo_url: string | null; ativo: boolean; criado_em: string }[] | null
  tenant_subscriptions:
    | { billing_status: string; trial_termina_em: string | null; criado_em: string; plans: { nome: string } | null }[]
    | null
}

export interface Lojista {
  id: string
  nome: string
  email: string
  telefone: string | null
  /** `tenants.ativo` — o "Suspender" da administração. */
  ativo: boolean
  recebimentos: string | null
  criadoEm: string
  /** A primeira loja do lojista (a maioria tem uma só) e quantas são. */
  loja: { nome: string; slug: string | null; logo: string | null; noAr: boolean } | null
  totalLojas: number
  /** A assinatura vigente — a linha mais recente de `tenant_subscriptions`. */
  assinatura: { status: string; plano: string | null; trialTerminaEm: string | null } | null
}

function normalizarLojista(l: LinhaLojista): Lojista {
  const lojas = [...(l.stores ?? [])].sort((a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em))
  const sub = maisRecente(l.tenant_subscriptions)
  const loja = lojas[0]
  return {
    id: l.id,
    nome: l.nome_responsavel?.trim() || 'Sem nome',
    email: l.email ?? '',
    telefone: l.telefone,
    ativo: l.ativo,
    recebimentos: l.pagarme_onboarding_status,
    criadoEm: l.criado_em,
    loja: loja ? { nome: loja.nome, slug: loja.slug, logo: loja.logo_url, noAr: loja.ativo } : null,
    totalLojas: lojas.length,
    assinatura: sub ? { status: sub.billing_status, plano: sub.plans?.nome ?? null, trialTerminaEm: sub.trial_termina_em } : null,
  }
}

async function carregarLojistas(supabase: Supabase): Promise<Lojista[]> {
  const linhas = await buscarTodas<LinhaLojista>((de, ate) =>
    supabase
      .from('tenants')
      .select(SELECT_LOJISTA)
      .order('criado_em', { ascending: false })
      .order('id')
      .range(de, ate),
  )
  return linhas.map(normalizarLojista)
}

const statusDaAssinatura = (l: Lojista) => l.assinatura?.status ?? 'sem'

/** Quantos cartões a lista desenha de uma vez; acima disso, refine a busca. */
export const LIMITE_LISTA = 120

export async function getLojistas(filtro: { assinatura?: string; recebimentos?: string; busca?: string }) {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const todos = await carregarLojistas(supabase)
  const busca = filtro.busca?.trim() ?? ''
  const buscados = busca
    ? todos.filter((l) => casaBusca(busca, [l.nome, l.email, l.telefone, l.loja?.nome, l.loja?.slug]))
    : todos

  const passaAssinatura = (l: Lojista) => !filtro.assinatura || statusDaAssinatura(l) === filtro.assinatura
  const passaRecebimentos = (l: Lojista) =>
    !filtro.recebimentos || grupoDosRecebimentos(l.recebimentos) === filtro.recebimentos

  const filtrados = buscados.filter((l) => passaAssinatura(l) && passaRecebimentos(l))

  return {
    lojistas: filtrados.slice(0, LIMITE_LISTA),
    total: filtrados.length,
    totalGeral: todos.length,
    // Cada fileira de filtro conta com o OUTRO filtro aplicado.
    contagens: {
      assinatura: contarPor(buscados.filter(passaRecebimentos), statusDaAssinatura),
      recebimentos: contarPor(buscados.filter(passaAssinatura), (l) => grupoDosRecebimentos(l.recebimentos)),
    },
  }
}

// ─── Entregadores ─────────────────────────────────────────────────────────

const SELECT_ENTREGADOR = `
  id, nome, telefone, foto_url, tipo, status, veiculo, veiculo_tipo, veiculo_placa, online,
  pagarme_onboarding_status, criado_em, aprovado_em,
  tenants (nome_responsavel, stores (nome))
`

interface LinhaEntregador {
  id: string
  nome: string
  telefone: string | null
  foto_url: string | null
  tipo: string
  status: string
  veiculo: string | null
  veiculo_tipo: string | null
  veiculo_placa: string | null
  online: boolean
  pagarme_onboarding_status: string | null
  criado_em: string
  aprovado_em: string | null
  tenants: { nome_responsavel: string | null; stores: { nome: string }[] | null } | null
}

export interface Entregador {
  id: string
  nome: string
  telefone: string | null
  foto: string | null
  tipo: string
  status: string
  veiculo: string
  online: boolean
  recebimentos: string | null
  criadoEm: string
  aprovadoEm: string | null
  /** Entregador próprio: a loja que o cadastrou. */
  loja: string | null
  /** URL assinada (10 min) da foto da CNH no bucket privado. */
  cnhUrl: string | null
}

function normalizarEntregador(c: LinhaEntregador): Entregador {
  return {
    id: c.id,
    nome: c.nome?.trim() || 'Sem nome',
    telefone: c.telefone,
    foto: c.foto_url,
    tipo: c.tipo,
    status: c.status,
    veiculo: rotuloVeiculo(c.veiculo, c.veiculo_tipo, c.veiculo_placa),
    online: c.online,
    recebimentos: c.pagarme_onboarding_status,
    criadoEm: c.criado_em,
    aprovadoEm: c.aprovado_em,
    loja: c.tenants?.stores?.[0]?.nome ?? c.tenants?.nome_responsavel ?? null,
    cnhUrl: null,
  }
}

interface DocumentoEntregador {
  id: string
  cnh_foto_url: string | null
}

/** O banco guarda a URL pública antiga: `…/courier-docs/<uid>/cnh.jpg` → `<uid>/cnh.jpg`. */
function caminhoNoBucket(url: string | null): string | null {
  if (!url) return null
  const caminho = url.split('/courier-docs/')[1]
  return caminho ? caminho.split('?')[0] : null
}

/**
 * A foto da CNH não é legível direto na tabela (migration
 * 20261010150000_seguranca_dados_pessoais): vem pela RPC, que confere
 * is_admin() no banco, e mora no bucket privado `courier-docs` — o link vira
 * uma URL assinada de 10 minutos. O CPF que a RPC também devolve não sai do
 * servidor: a tela não o mostra.
 */
async function comCnh(supabase: Supabase, entregadores: Entregador[]): Promise<Entregador[]> {
  if (entregadores.length === 0) return []
  const { data: documentos } = await supabase.rpc('admin_documentos_entregadores', {
    p_ids: entregadores.map((e) => e.id),
  })
  const porId = new Map(((documentos ?? []) as DocumentoEntregador[]).map((d) => [d.id, caminhoNoBucket(d.cnh_foto_url)]))
  const caminhos = [...porId.values()].filter((c): c is string => c !== null)
  const { data: assinadas } = caminhos.length
    ? await supabase.storage.from('courier-docs').createSignedUrls(caminhos, 600)
    : { data: [] }
  const urlPorCaminho = new Map((assinadas ?? []).map((a) => [a.path, a.signedUrl]))
  return entregadores.map((e) => {
    const caminho = porId.get(e.id)
    return { ...e, cnhUrl: caminho ? urlPorCaminho.get(caminho) ?? null : null }
  })
}

export async function getEntregadores(filtro: { status?: string; recebimentos?: string; busca?: string }) {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const linhas = await buscarTodas<LinhaEntregador>((de, ate) =>
    supabase
      .from('couriers')
      .select(SELECT_ENTREGADOR)
      .order('criado_em', { ascending: false })
      .order('id')
      .range(de, ate),
  )
  const todos = linhas.map(normalizarEntregador)
  const busca = filtro.busca?.trim() ?? ''
  const buscados = busca ? todos.filter((e) => casaBusca(busca, [e.nome, e.telefone, e.veiculo, e.loja])) : todos

  const passaStatus = (e: Entregador) => !filtro.status || e.status === filtro.status
  const passaRecebimentos = (e: Entregador) =>
    !filtro.recebimentos || grupoDosRecebimentos(e.recebimentos) === filtro.recebimentos

  let filtrados = buscados.filter((e) => passaStatus(e) && passaRecebimentos(e))
  // Fila de aprovação: quem chegou primeiro é atendido primeiro.
  if (filtro.status === 'pendente') filtrados = [...filtrados].reverse()

  return {
    entregadores: await comCnh(supabase, filtrados.slice(0, LIMITE_LISTA)),
    total: filtrados.length,
    totalGeral: todos.length,
    contagens: {
      status: contarPor(buscados.filter(passaRecebimentos), (e) => e.status),
      recebimentos: contarPor(buscados.filter(passaStatus), (e) => grupoDosRecebimentos(e.recebimentos)),
    },
  }
}

// ─── Visão geral ──────────────────────────────────────────────────────────

interface PedidoEntregue {
  total: number | null
  platform_fee_amount: number | null
  criado_em: string
}

export interface VisaoGeral {
  /** Primeiro nome de quem está nos bastidores, para a saudação. */
  primeiroNome: string
  hoje: Resumo
  mes: Resumo
  /** O mês corrente até agora vs. o mesmo trecho do mês anterior. */
  comparacao: { atual: Resumo; anterior: Resumo; diaDoMes: number }
  serie: (Resumo & { mes: Mes })[]
  emAndamento: number
  lojistasAtivos: number
  lojistasTotal: number
  entregadoresOnline: number
  entregadoresAprovados: number
  pendentes: { total: number; primeiros: { id: string; nome: string; criadoEm: string }[] }
  lojasEmOutros: number
  recebimentosComProblema: number
  assinaturasEmAtraso: number
  repassesACaminho: { valor: number; quantidade: number }
  distribuicao: {
    assinatura: Record<string, number>
    recebimentos: Record<GrupoRecebimentos, number>
  }
  novosLojistas: Lojista[]
}

export async function getVisaoGeral(): Promise<VisaoGeral> {
  const supabase = createSupabaseServer()
  const user = await exigirAdmin()

  const agora = new Date()
  const meses = ultimosMeses(12, agora)
  const desde = intervaloDoMes(meses[0]).inicio
  const idOutros = await idDaCategoriaOutros(supabase)

  const [entregues, emAndamento, lojistas, entregadores, repasses, lojasEmOutros] = await Promise.all([
    buscarTodas<PedidoEntregue>((de, ate) =>
      supabase
        .from('orders')
        .select('total, platform_fee_amount, criado_em')
        .eq('status', 'entregue')
        .gte('criado_em', desde)
        .order('id')
        .range(de, ate),
    ),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', STATUS_EM_ANDAMENTO),
    carregarLojistas(supabase),
    buscarTodas<{ id: string; nome: string; status: string; online: boolean; criado_em: string }>((de, ate) =>
      supabase.from('couriers').select('id, nome, status, online, criado_em').order('id').range(de, ate),
    ),
    buscarTodas<{ valor_liquido: number }>((de, ate) =>
      supabase.from('payouts').select('valor_liquido').in('status', ['agendado', 'processando']).order('id').range(de, ate),
    ),
    contarLojasEmOutros(supabase, idOutros),
  ])

  // Hoje e o mês corrente, no relógio de Divinópolis; o mês anterior entra
  // só no MESMO trecho decorrido (nunca o mês cheio contra o parcial).
  const inicioHoje = Date.parse(inicioDoDia(agora))
  const { inicioAtual, inicioAnterior, corteAnterior } = janelaDeComparacao(agora)
  const doMes = entregues.filter((p) => Date.parse(p.criado_em) >= inicioAtual)
  const anterior = entregues.filter((p) => {
    const t = Date.parse(p.criado_em)
    return t >= inicioAnterior && t < corteAnterior
  })
  const diaDoMes = Math.floor((inicioHoje - inicioAtual) / 86_400_000) + 1

  const pendentes = entregadores
    .filter((e) => e.status === 'pendente')
    .sort((a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em))

  const recebimentos = contarPor(lojistas, (l) => grupoDosRecebimentos(l.recebimentos))

  return {
    primeiroNome: nomeDe(user).split(/\s+/)[0],
    hoje: resumir(entregues.filter((p) => Date.parse(p.criado_em) >= inicioHoje)),
    mes: resumir(doMes),
    comparacao: { atual: resumir(doMes), anterior: resumir(anterior), diaDoMes },
    serie: serieMensal(entregues, meses),
    emAndamento: emAndamento.count ?? 0,
    lojistasAtivos: lojistas.filter((l) => l.ativo).length,
    lojistasTotal: lojistas.length,
    entregadoresOnline: entregadores.filter((e) => e.status === 'aprovado' && e.online).length,
    entregadoresAprovados: entregadores.filter((e) => e.status === 'aprovado').length,
    pendentes: {
      total: pendentes.length,
      primeiros: pendentes.slice(0, 3).map((e) => ({ id: e.id, nome: e.nome, criadoEm: e.criado_em })),
    },
    lojasEmOutros,
    recebimentosComProblema: recebimentos.com_problema ?? 0,
    assinaturasEmAtraso: lojistas.filter((l) => l.assinatura?.status === 'em_atraso').length,
    repassesACaminho: {
      valor: repasses.reduce((s, r) => s + Number(r.valor_liquido ?? 0), 0),
      quantidade: repasses.length,
    },
    distribuicao: {
      assinatura: contarPor(lojistas, statusDaAssinatura),
      recebimentos: {
        verificado: recebimentos.verificado ?? 0,
        em_andamento: recebimentos.em_andamento ?? 0,
        com_problema: recebimentos.com_problema ?? 0,
        inativo: recebimentos.inativo ?? 0,
      },
    },
    novosLojistas: lojistas.slice(0, 5),
  }
}

// ─── Moldura ──────────────────────────────────────────────────────────────

/** O nome de exibição (metadado do usuário; senão o começo do e-mail). */
function nomeDe(user: User): string {
  const nome = typeof user.user_metadata?.nome === 'string' ? user.user_metadata.nome.trim() : ''
  return nome || user.email?.split('@')[0] || 'Administração'
}

export async function getMoldura() {
  const supabase = createSupabaseServer()
  const user = await exigirAdmin()
  const idOutros = await idDaCategoriaOutros(supabase)

  const [lojas, pendentes, lojasEmOutros] = await Promise.all([
    buscarTodas<{ horarios: unknown }>((de, ate) =>
      supabase.from('stores').select('horarios').eq('ativo', true).order('id').range(de, ate),
    ),
    supabase.from('couriers').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    contarLojasEmOutros(supabase, idOutros),
  ])

  return {
    nome: nomeDe(user),
    email: user.email ?? '',
    horariosDasLojas: lojas.map((l) => l.horarios),
    entregadoresPendentes: pendentes.count ?? 0,
    lojasEmOutros,
  }
}

// ─── Planos ───────────────────────────────────────────────────────────────

export interface Plano {
  id: string
  nome: string
  descricao: string | null
  preco_mensal: number
  max_lojas: number
  max_produtos: number
  max_entregadores: number
  max_posts: number | null
  tem_estoque: boolean
  tem_relatorios: boolean
  tem_antecipacao: boolean
  ativo: boolean
  stripe_price_id: string | null
  /** Lojistas cuja assinatura vigente é deste plano e está ativa ou em teste. */
  assinantes: number
}

export async function getPlanos(): Promise<Plano[]> {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const [planos, assinaturas] = await Promise.all([
    buscarTodas<Omit<Plano, 'assinantes'>>((de, ate) =>
      supabase
        .from('plans')
        .select(
          'id, nome, descricao, preco_mensal, max_lojas, max_produtos, max_entregadores, max_posts, tem_estoque, tem_relatorios, tem_antecipacao, ativo, stripe_price_id',
        )
        .order('preco_mensal')
        .order('id')
        .range(de, ate),
    ),
    buscarTodas<{ tenant_id: string; plan_id: string; billing_status: string; criado_em: string }>((de, ate) =>
      supabase.from('tenant_subscriptions').select('tenant_id, plan_id, billing_status, criado_em').order('id').range(de, ate),
    ),
  ])

  const porLojista = new Map<string, (typeof assinaturas)[number][]>()
  for (const a of assinaturas) porLojista.set(a.tenant_id, [...(porLojista.get(a.tenant_id) ?? []), a])
  const vigentes = [...porLojista.values()]
    .map((linhas) => maisRecente(linhas))
    .filter((a): a is (typeof assinaturas)[number] => a !== null && ASSINATURA_VIGENTE.includes(a.billing_status))
  const assinantes = contarPor(vigentes, (a) => a.plan_id)

  return planos.map((p) => ({ ...p, assinantes: assinantes[p.id] ?? 0 }))
}

// ─── Conciliação ──────────────────────────────────────────────────────────

interface PedidoConciliado extends PedidoEntregue {
  forma_pagamento: string | null
}

interface Repasse {
  valor_liquido: number | null
  taxa_antecipacao: number | null
  status: string
  tipo: string
  antecipado: boolean
}

export async function getConciliacao(mes: Mes) {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const { inicio, fim } = intervaloDoMes(mes)
  const [pedidos, repasses] = await Promise.all([
    buscarTodas<PedidoConciliado>((de, ate) =>
      supabase
        .from('orders')
        .select('total, platform_fee_amount, criado_em, forma_pagamento')
        .eq('status', 'entregue')
        .gte('criado_em', inicio)
        .lt('criado_em', fim)
        .order('id')
        .range(de, ate),
    ),
    buscarTodas<Repasse>((de, ate) =>
      supabase
        .from('payouts')
        .select('valor_liquido, taxa_antecipacao, status, tipo, antecipado')
        .gte('criado_em', inicio)
        .lt('criado_em', fim)
        .order('id')
        .range(de, ate),
    ),
  ])

  const soma = (lista: Repasse[], campo: 'valor_liquido' | 'taxa_antecipacao') =>
    lista.reduce((s, r) => s + Number(r[campo] ?? 0), 0)
  const concluidos = repasses.filter((r) => r.status === 'concluido')
  const aCaminho = repasses.filter((r) => r.status === 'agendado' || r.status === 'processando')
  const falharam = repasses.filter((r) => r.status === 'falhou')

  const porForma = new Map<string, PedidoConciliado[]>()
  for (const p of pedidos) {
    const forma = p.forma_pagamento ?? 'desconhecida'
    porForma.set(forma, [...(porForma.get(forma) ?? []), p])
  }

  const pedidosDoMes = resumir(pedidos)
  const receitaAntecipacao = soma(
    concluidos.filter((r) => r.antecipado),
    'taxa_antecipacao',
  )

  return {
    pedidos: pedidosDoMes,
    receita: {
      comissoes: pedidosDoMes.comissoes,
      antecipacoes: receitaAntecipacao,
      total: pedidosDoMes.comissoes + receitaAntecipacao,
    },
    porForma: [...porForma.entries()]
      .map(([forma, lista]) => ({ forma, ...resumir(lista) }))
      .sort((a, b) => b.gmv - a.gmv),
    repasses: {
      lojistas: soma(
        concluidos.filter((r) => r.tipo === 'lojista'),
        'valor_liquido',
      ),
      entregadores: soma(
        concluidos.filter((r) => r.tipo === 'entregador'),
        'valor_liquido',
      ),
      aCaminho: { valor: soma(aCaminho, 'valor_liquido'), quantidade: aCaminho.length },
      falharam: { valor: soma(falharam, 'valor_liquido'), quantidade: falharam.length },
    },
  }
}

// ─── Diretório: lojas em "Outros" e adoção ────────────────────────────────

export interface CategoriaGlobal {
  id: string
  slug: string | null
  nome: string
}

export async function getLojasEmOutros() {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const [idOutros, categorias] = await Promise.all([
    idDaCategoriaOutros(supabase),
    supabase.from('categories').select('id, slug, nome, ordem').is('tenant_id', null).order('ordem'),
  ])

  const lojas = idOutros
    ? await buscarTodas<{
        id: string
        nome: string | null
        slug: string | null
        logo_url: string | null
        ativo: boolean
        criado_em: string
        tenants: { nome_responsavel: string | null; email: string | null } | null
      }>((de, ate) =>
        supabase
          .from('stores')
          .select('id, nome, slug, logo_url, ativo, criado_em, tenants (nome_responsavel, email)')
          .eq('categoria_id', idOutros)
          .order('criado_em')
          .order('id')
          .range(de, ate),
      )
    : []

  return {
    categoriaExiste: idOutros !== null,
    // A mais antiga primeiro: está há mais tempo sem o nicho certo.
    lojas: lojas.map((l) => ({
      id: l.id,
      nome: l.nome?.trim() || 'Loja sem nome',
      slug: l.slug,
      logo: l.logo_url,
      noAr: l.ativo,
      criadoEm: l.criado_em,
      lojista: l.tenants?.nome_responsavel ?? null,
      email: l.tenants?.email ?? null,
    })),
    categorias: ((categorias.data ?? []) as CategoriaGlobal[]).filter((c) => c.slug !== 'outros'),
  }
}

export interface Troca {
  id: string
  quando: string
  motivo: string
  loja: string | null
  de: string | null
  para: string | null
}

export async function getAdocao() {
  const supabase = createSupabaseServer()
  await exigirAdmin()

  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [categoriasRes, lojas, trocasRes] = await Promise.all([
    supabase.from('categories').select('id, slug, nome, ordem').is('tenant_id', null).order('ordem'),
    buscarTodas<{ categoria_id: string | null }>((de, ate) =>
      supabase.from('stores').select('categoria_id').order('id').range(de, ate),
    ),
    supabase
      .from('store_categoria_changes')
      .select('id, changed_at, motivo, categoria_anterior, categoria_nova, store_id')
      .gte('changed_at', desde)
      .order('changed_at', { ascending: false })
      .limit(50),
  ])

  const categorias = (categoriasRes.data ?? []) as CategoriaGlobal[]
  const porCategoria = contarPor(lojas, (l) => l.categoria_id)
  const linhas = categorias.map((c) => ({ ...c, total: porCategoria[c.id] ?? 0 }))
  const conhecidas = new Set(categorias.map((c) => c.id))
  const semCategoria = lojas.filter((l) => !l.categoria_id || !conhecidas.has(l.categoria_id)).length

  // Loja sem categoria cai no template genérico (o mesmo fallback do painel).
  const porTemplate: Partial<Record<TemplateCodigo, number>> = { generic: semCategoria }
  for (const l of linhas) {
    const codigo = (CATEGORIA_SLUG_TO_TEMPLATE as Record<string, TemplateCodigo>)[l.slug ?? ''] ?? 'generic'
    porTemplate[codigo] = (porTemplate[codigo] ?? 0) + l.total
  }

  // Nomes das lojas e categorias das trocas (volume pequeno, em paralelo).
  const trocasBrutas = (trocasRes.data ?? []) as {
    id: string
    changed_at: string
    motivo: string
    categoria_anterior: string | null
    categoria_nova: string
    store_id: string
  }[]
  const idsLojas = [...new Set(trocasBrutas.map((t) => t.store_id))]
  const { data: nomesLojas } = idsLojas.length
    ? await supabase.from('stores').select('id, nome').in('id', idsLojas)
    : { data: [] as { id: string; nome: string | null }[] }
  const lojaPorId = new Map(((nomesLojas ?? []) as { id: string; nome: string | null }[]).map((l) => [l.id, l.nome]))
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c.nome]))

  const trocas: Troca[] = trocasBrutas.map((t) => ({
    id: t.id,
    quando: t.changed_at,
    motivo: t.motivo,
    loja: lojaPorId.get(t.store_id) ?? null,
    de: t.categoria_anterior ? categoriaPorId.get(t.categoria_anterior) ?? null : null,
    para: categoriaPorId.get(t.categoria_nova) ?? null,
  }))

  return {
    totalLojas: lojas.length,
    semCategoria,
    linhas,
    porTemplate,
    trocas,
  }
}
