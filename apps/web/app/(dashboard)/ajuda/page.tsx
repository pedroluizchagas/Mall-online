import { LifeBuoy } from 'lucide-react'
import type { SupportTicketStatus } from '@mallora/types'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MetricasHeader } from './_components/metricas-header'
import { Filtros, type FiltroTickets } from './_components/filtros'
import { TicketCard, type TicketItem } from './_components/ticket-card'
import { NovoTicketDialog } from './_components/novo-ticket-dialog'
import { Faq } from './_components/faq'

interface SearchParams { filtro?: string }

export default async function PaginaAjuda({ searchParams }: { searchParams: SearchParams }) {
  const filtro: FiltroTickets =
    searchParams.filtro === 'abertos' || searchParams.filtro === 'resolvidos'
      ? searchParams.filtro
      : 'tudo'

  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) {
    return <div className="p-9"><p className="text-ink-3">Tenant não encontrado.</p></div>
  }

  let listaQuery = supabase
    .from('support_tickets')
    .select('id, assunto, mensagem, prioridade, status, criada_em, atualizada_em')
    .eq('tenant_id', tenant.id)
    .order('atualizada_em', { ascending: false })

  if (filtro === 'abertos') listaQuery = listaQuery.in('status', ['aberto', 'em_andamento'])
  if (filtro === 'resolvidos') listaQuery = listaQuery.in('status', ['resolvido', 'fechado'])

  const [contagensResultado, listaResultado] = await Promise.all([
    supabase.from('support_tickets').select('status').eq('tenant_id', tenant.id),
    listaQuery,
  ])

  const contagens = (contagensResultado.data ?? []) as Array<{ status: SupportTicketStatus }>
  const abertos = contagens.filter((t) => t.status === 'aberto').length
  const emAndamento = contagens.filter((t) => t.status === 'em_andamento').length
  const resolvidos = contagens.filter((t) => t.status === 'resolvido' || t.status === 'fechado').length

  const tickets = (listaResultado.data ?? []) as TicketItem[]

  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Central de ajuda"
        subtitulo="Abra um ticket com nossa equipe ou consulte as perguntas frequentes."
        acoes={<NovoTicketDialog />}
      />

      <MetricasHeader abertos={abertos} emAndamento={emAndamento} resolvidos={resolvidos} />

      <Filtros filtroAtivo={filtro} />

      {tickets.length === 0 ? (
        <EmptyState
          icone={LifeBuoy}
          titulo={filtro === 'tudo' ? 'Nenhum ticket ainda' : 'Nenhum ticket para o filtro'}
          descricao={
            filtro === 'tudo'
              ? 'Quando precisar de ajuda, abra um ticket e nossa equipe responderá pelo email cadastrado.'
              : 'Tente outro filtro ou abra um novo ticket.'
          }
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}

      <Faq />
    </div>
  )
}
