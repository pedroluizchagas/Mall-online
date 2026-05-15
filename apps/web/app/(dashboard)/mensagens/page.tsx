import { MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { MessageThreadOrigem } from '@mallevo/types'
import { MetricasHeader } from './_components/metricas-header'
import { Filtros, type FiltroMensagens } from './_components/filtros'
import { ThreadCard, type ThreadItem } from './_components/thread-card'
import { Paginacao } from './_components/paginacao'
import { RealtimeListaThreads } from './_components/realtime-lista-threads'
import { BroadcastDialog } from './_components/broadcast-dialog'

const PAGE_SIZE = 20

interface SearchParams { filtro?: string; pagina?: string }

function intEntre(v: string | undefined, min: number, max: number): number | null {
  const n = v ? Number.parseInt(v, 10) : NaN
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

interface LinhaThread {
  id: string
  origem: string
  ultima_em: string
  nao_lidas_lojista: number
  arquivada: boolean
  consumers: { nome: string | null } | { nome: string | null }[] | null
}

export default async function PaginaMensagens({ searchParams }: { searchParams: SearchParams }) {
  const filtro: FiltroMensagens =
    searchParams.filtro === 'nao_lidas' || searchParams.filtro === 'arquivadas'
      ? searchParams.filtro
      : 'todas'
  const pagina = intEntre(searchParams.pagina, 1, 1_000_000) ?? 1

  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) {
    return <div className="p-9"><p className="text-ink-3">Tenant não encontrado.</p></div>
  }

  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)
  const inicioHojeIso = inicioHoje.toISOString()

  let listaQuery = supabase
    .from('message_threads')
    .select(
      'id, origem, ultima_em, nao_lidas_lojista, arquivada, consumers!left(nome)',
      { count: 'exact' },
    )
    .eq('tenant_id', tenant.id)
    .order('ultima_em', { ascending: false })

  if (filtro === 'arquivadas') listaQuery = listaQuery.eq('arquivada', true)
  else listaQuery = listaQuery.eq('arquivada', false)
  if (filtro === 'nao_lidas') listaQuery = listaQuery.gt('nao_lidas_lojista', 0)

  const inicio = (pagina - 1) * PAGE_SIZE
  listaQuery = listaQuery.range(inicio, inicio + PAGE_SIZE - 1)

  const [metricasResultado, listaResultado, mensagensHojeResultado] = await Promise.all([
    supabase
      .from('message_threads')
      .select('nao_lidas_lojista')
      .eq('tenant_id', tenant.id)
      .eq('arquivada', false),
    listaQuery,
    supabase
      .from('messages')
      .select('id, message_threads!inner(tenant_id)', { count: 'exact', head: true })
      .eq('message_threads.tenant_id', tenant.id)
      .gte('criada_em', inicioHojeIso),
  ])

  const linhasMetricas = (metricasResultado.data ?? []) as Array<{ nao_lidas_lojista: number }>
  const totalConversas = linhasMetricas.length
  const naoLidas = linhasMetricas.reduce((s, t) => s + (t.nao_lidas_lojista ?? 0), 0)
  const mensagensHoje = mensagensHojeResultado.error ? 0 : (mensagensHojeResultado.count ?? 0)

  const linhasLista = (listaResultado.data ?? []) as LinhaThread[]
  const totalLista = listaResultado.count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(totalLista / PAGE_SIZE))
  const idsPagina = linhasLista.map((l) => l.id)

  // Buscar a última mensagem de cada thread visível (snippet do card).
  let ultimoPorThread = new Map<string, string>()
  if (idsPagina.length > 0) {
    const { data: ultimas } = await supabase
      .from('messages')
      .select('thread_id, corpo, criada_em')
      .in('thread_id', idsPagina)
      .order('criada_em', { ascending: false })
    for (const m of (ultimas ?? []) as Array<{ thread_id: string; corpo: string }>) {
      if (!ultimoPorThread.has(m.thread_id)) ultimoPorThread.set(m.thread_id, m.corpo)
    }
  }

  const threads: ThreadItem[] = linhasLista.map((t) => {
    const c = Array.isArray(t.consumers) ? t.consumers[0] : t.consumers
    return {
      id: t.id,
      consumer_nome: c?.nome ?? null,
      origem: (t.origem as MessageThreadOrigem) ?? 'cliente',
      ultima_em: t.ultima_em,
      nao_lidas_lojista: t.nao_lidas_lojista,
      arquivada: t.arquivada,
      ultimo_corpo: ultimoPorThread.get(t.id) ?? null,
    }
  })

  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Mensagens"
        subtitulo="Converse com seus clientes sem sair do dashboard."
        acoes={<BroadcastDialog />}
      />

      <MetricasHeader
        totalConversas={totalConversas}
        naoLidas={naoLidas}
        mensagensHoje={mensagensHoje}
      />

      <Filtros filtroAtivo={filtro} />

      {threads.length === 0 ? (
        <EmptyState
          icone={MessageCircle}
          titulo={
            filtro === 'arquivadas'
              ? 'Sem conversas arquivadas'
              : filtro === 'nao_lidas'
                ? 'Tudo lido por aqui'
                : 'Sem conversas ainda'
          }
          descricao={
            filtro === 'arquivadas'
              ? 'Threads arquivadas aparecem aqui depois que você as arquiva.'
              : filtro === 'nao_lidas'
                ? 'Quando um cliente enviar uma nova mensagem, ela aparecerá aqui em destaque.'
                : 'Quando seus clientes mandarem mensagens, elas aparecerão aqui.'
          }
        />
      ) : (
        <div className="space-y-3">
          {threads.map((t) => <ThreadCard key={t.id} thread={t} />)}
        </div>
      )}

      <Paginacao pagina={pagina} totalPaginas={totalPaginas} />

      <RealtimeListaThreads threadIds={idsPagina} />
    </div>
  )
}
