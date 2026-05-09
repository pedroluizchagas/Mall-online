import { Bike } from 'lucide-react'
import { headers } from 'next/headers'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MetricasHeader } from './_components/metricas-header'
import { Filtros, type FiltroEntregadores } from './_components/filtros'
import { EntregadorCard, type EntregadorItem, type CourierStatus } from './_components/entregador-card'
import { ConviteCard, type ConviteItem } from './_components/convite-card'
import { ConvidarDialog } from './_components/convidar-dialog'

interface SearchParams { filtro?: string }

function resolverBaseUrl(): string {
  const h = headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_APP_URL ?? ''
}

export default async function PaginaEntregadores({ searchParams }: { searchParams: SearchParams }) {
  const filtro: FiltroEntregadores =
    searchParams.filtro === 'inativos' || searchParams.filtro === 'todos'
      ? searchParams.filtro
      : 'ativos'

  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()
  if (!tenant) {
    return <div className="p-9"><p className="text-ink-3">Tenant não encontrado.</p></div>
  }

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let listaQuery = supabase
    .from('couriers')
    .select('id, nome, telefone, status, online')
    .eq('tenant_id', tenant.id)
    .order('nome', { ascending: true })

  if (filtro === 'ativos') listaQuery = listaQuery.eq('status', 'aprovado')
  if (filtro === 'inativos') listaQuery = listaQuery.in('status', ['suspenso', 'reprovado', 'pendente'])

  const [contagensResultado, convitesResultado, listaResultado, entregues7dResultado] = await Promise.all([
    supabase
      .from('couriers')
      .select('status')
      .eq('tenant_id', tenant.id),
    supabase
      .from('courier_invites')
      .select('token, nome, telefone, email, expira_em, criada_em')
      .eq('tenant_id', tenant.id)
      .is('usado_em', null)
      .order('criada_em', { ascending: false }),
    listaQuery,
    supabase
      .from('delivery_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'entregue')
      .gte('entregue_em', seteDiasAtras),
  ])

  const linhasContagens = (contagensResultado.data ?? []) as Array<{ status: CourierStatus }>
  const ativos = linhasContagens.filter((c) => c.status === 'aprovado').length
  const inativos = linhasContagens.filter((c) => c.status !== 'aprovado').length
  const convitesPendentes = convitesResultado.data?.length ?? 0
  const entregues7d = entregues7dResultado.error ? null : (entregues7dResultado.count ?? 0)

  const entregadores: EntregadorItem[] = (listaResultado.data ?? []).map((c) => ({
    id: c.id as string,
    nome: c.nome as string,
    telefone: (c.telefone as string | null) ?? null,
    status: c.status as CourierStatus,
    online: Boolean(c.online),
  }))

  const convites: ConviteItem[] = (convitesResultado.data ?? []).map((c) => ({
    token: c.token as string,
    nome: c.nome as string,
    telefone: c.telefone as string,
    email: (c.email as string | null) ?? null,
    expira_em: c.expira_em as string,
    criada_em: c.criada_em as string,
  }))

  const baseUrl = resolverBaseUrl()
  const semEntregadores = entregadores.length === 0

  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Entregadores"
        subtitulo="Convide, ative e acompanhe quem entrega para sua loja."
        acoes={<ConvidarDialog baseUrl={baseUrl} />}
      />

      <MetricasHeader
        ativos={ativos}
        inativos={inativos}
        convitesPendentes={convitesPendentes}
        entregues7d={entregues7d}
      />

      <Filtros filtroAtivo={filtro} />

      {convites.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">
            Convites pendentes ({convites.length})
          </h2>
          <div className="space-y-3">
            {convites.map((c) => <ConviteCard key={c.token} convite={c} baseUrl={baseUrl} />)}
          </div>
        </section>
      )}

      <section>
        {convites.length > 0 && (
          <h2 className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">
            Entregadores
          </h2>
        )}
        {semEntregadores ? (
          <EmptyState
            icone={Bike}
            titulo={
              filtro === 'ativos'
                ? 'Nenhum entregador ativo'
                : filtro === 'inativos'
                  ? 'Nenhum entregador inativo'
                  : 'Sem entregadores ainda'
            }
            descricao={
              filtro === 'ativos'
                ? 'Convide entregadores próprios pelo botão acima ou troque o filtro para ver outros status.'
                : 'Tente trocar o filtro para ver os demais entregadores.'
            }
          />
        ) : (
          <div className="space-y-3">
            {entregadores.map((e) => <EntregadorCard key={e.id} entregador={e} />)}
          </div>
        )}
      </section>
    </div>
  )
}
