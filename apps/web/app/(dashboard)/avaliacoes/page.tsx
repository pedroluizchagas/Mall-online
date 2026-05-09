import { Star } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MetricasHeader } from './_components/metricas-header'
import { Filtros, type FiltroAvaliacoes } from './_components/filtros'
import { ReviewCard, type ReviewItem } from './_components/review-card'
import { Paginacao } from './_components/paginacao'

const PAGE_SIZE = 20

interface SearchParams { filtro?: string; estrelas?: string; pagina?: string }

function intEntre(v: string | undefined, min: number, max: number): number | null {
  const n = v ? Number.parseInt(v, 10) : NaN
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

export default async function PaginaAvaliacoes({ searchParams }: { searchParams: SearchParams }) {
  const filtro: FiltroAvaliacoes =
    searchParams.filtro === 'sem_resposta' || searchParams.filtro === 'sinalizadas'
      ? searchParams.filtro
      : 'tudo'
  const estrelas = intEntre(searchParams.estrelas, 1, 5)
  const pagina = intEntre(searchParams.pagina, 1, 1_000_000) ?? 1

  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) {
    return <div className="p-9"><p className="text-ink-3">Tenant não encontrado.</p></div>
  }

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  let listaQuery = supabase
    .from('store_reviews')
    .select(
      'id, order_id, estrelas_loja, estrelas_entrega, comentario, resposta_lojista, respondida_em, sinalizada, motivo_sinalizacao, criada_em, consumers!inner(nome)',
      { count: 'exact' },
    )
    .eq('tenant_id', tenant.id)
    .order('criada_em', { ascending: false })

  if (filtro === 'sem_resposta') listaQuery = listaQuery.is('respondida_em', null)
  if (filtro === 'sinalizadas') listaQuery = listaQuery.eq('sinalizada', true)
  if (estrelas !== null) listaQuery = listaQuery.eq('estrelas_loja', estrelas)
  const inicio = (pagina - 1) * PAGE_SIZE
  listaQuery = listaQuery.range(inicio, inicio + PAGE_SIZE - 1)

  const [metricasMes, sinalizadasPendentes, listaResultado] = await Promise.all([
    supabase
      .from('store_reviews')
      .select('estrelas_loja, respondida_em')
      .eq('tenant_id', tenant.id)
      .gte('criada_em', inicioMes),
    supabase
      .from('store_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('sinalizada', true),
    listaQuery,
  ])

  const linhasMes = (metricasMes.data ?? []) as Array<{ estrelas_loja: number; respondida_em: string | null }>
  const totalMes = linhasMes.length
  const mediaMes = totalMes > 0 ? linhasMes.reduce((s, r) => s + r.estrelas_loja, 0) / totalMes : null
  const respondidasMes = linhasMes.filter((r) => r.respondida_em !== null).length
  const taxaRespostaMes = totalMes > 0 ? (respondidasMes / totalMes) * 100 : 0

  type LinhaLista = Omit<ReviewItem, 'consumer_nome'> & {
    consumers: { nome: string | null } | { nome: string | null }[] | null
  }
  const linhasLista = (listaResultado.data ?? []) as LinhaLista[]
  const totalLista = listaResultado.count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(totalLista / PAGE_SIZE))

  const reviews: ReviewItem[] = linhasLista.map((r) => {
    const c = Array.isArray(r.consumers) ? r.consumers[0] : r.consumers
    return { ...r, consumer_nome: c?.nome ?? null }
  })

  const semFiltros = filtro === 'tudo' && estrelas === null

  return (
    <div className="p-9 slide-up">
      <PageHeader titulo="Avaliações" subtitulo="Leia, responda e modere o que seus clientes estão dizendo." />

      <MetricasHeader
        mediaMes={mediaMes}
        taxaRespostaMes={taxaRespostaMes}
        totalMes={totalMes}
        sinalizadasPendentes={sinalizadasPendentes.count ?? 0}
      />

      <Filtros filtroAtivo={filtro} estrelasAtivo={estrelas} />

      {reviews.length === 0 ? (
        <EmptyState
          icone={Star}
          titulo={semFiltros ? 'Sem avaliações ainda' : 'Nenhuma avaliação para os filtros aplicados'}
          descricao={
            semFiltros
              ? 'Quando seus clientes avaliarem pedidos, as avaliações aparecerão aqui.'
              : 'Tente trocar o filtro ou limpar a seleção de estrelas.'
          }
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}

      <Paginacao pagina={pagina} totalPaginas={totalPaginas} />
    </div>
  )
}
