import Link from 'next/link'
import { getTemplateByStore } from '@mallevo/lib'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getAvaliacaoMedia, getInsightBairro, getSaudeLoja } from '@/lib/actions/home'
import { getRepasses, getTopProdutos } from '@/lib/actions/financeiro'
import { money, saudacao } from '@/lib/format'
import { dataPorExtenso, horaDaLoja, horasDoExpediente, inicioDoDiaDaLoja } from '@/lib/hoje'
import { urlDaLoja } from '@/lib/storefront-url'
import { SetupWizard } from '@/components/dashboard/setup-wizard'
import { MovimentoCard } from '@/components/dashboard/movimento-card'
import { MaisVendidosCard } from '@/components/dashboard/mais-vendidos-card'
import { RepasseCard } from '@/components/dashboard/repasse-card'
import { InsightBar } from '@/components/dashboard/insight-bar'
import { SaudeLojaCard } from '@/components/dashboard/saude-loja-card'
import { CartaoVidro, PlacaVidro, Sobrelinha, Statement } from '@/components/dashboard/marquise'
import { Folha, SecaoFolha } from '@/components/dashboard/folha'
import { AtualizarAoVivo } from '@/components/dashboard/inicio/atualizar-ao-vivo'
import { CartaoPedidoVivo, type PedidoVivo } from '@/components/dashboard/inicio/cartao-pedido-vivo'
import { EmAndamentoCard } from '@/components/dashboard/inicio/em-andamento-card'
import { AtalhosCard } from '@/components/dashboard/inicio/atalhos-card'
import { PartnerIcon } from '@/components/ui/partner-icon'

export const dynamic = 'force-dynamic'

const STATUS_ATIVOS = ['novo', 'confirmado', 'em_preparo', 'aguardando_entregador', 'saiu_para_entrega'] as const

type StoreComCategoria = {
  id: string
  nome: string | null
  slug: string | null
  horarios: unknown
  taxa_entrega: number | null
  raio_entrega_km: number | null
  categoria: { id: string; slug: string | null; nome: string; icone: string | null } | null
}

type PedidoDoDia = {
  id: string
  status: string
  total: number
  taxa_entrega: number | null
  platform_fee_amount: number | null
  criado_em: string
}

type PedidoAtivo = {
  id: string
  status: string
  total: number
  criado_em: string
  consumers: { nome: string | null } | null
  order_items: { nome: string; quantidade: number }[] | null
}

/**
 * Início — o balcão na arquitetura do app do lojista:
 *
 * - MARQUISE (o que está ao vivo): saudação, o statement da casa, os números
 *   do dia em placas de vidro e os pedidos NOVOS pedindo ação, cada um com
 *   "Confirmar" inline. Atualiza sozinha a cada mudança em `orders`.
 * - FOLHA (o acervo): movimento por hora, o que está em andamento, os mais
 *   vendidos de verdade, recebimentos, atalhos e a saúde da loja.
 *
 * "Hoje" é o dia no relógio de Divinópolis (o servidor roda em UTC).
 */
export default async function PaginaInicio() {
  const supabase = createSupabaseServer()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, pagarme_onboarding_status, nome_responsavel')
    .limit(1)

  const tenant = tenants?.[0] as
    | { id: string; pagarme_onboarding_status: string; nome_responsavel: string | null }
    | undefined
  const tenantId = tenant?.id ?? ''

  const [{ data: lojaBruta }, { count: totalProdutos }] = await Promise.all([
    supabase
      .from('stores')
      .select(
        'id, nome, slug, horarios, taxa_entrega, raio_entrega_km, categoria:categories!stores_categoria_id_fkey(id, slug, nome, icone)',
      )
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle(),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])
  const loja = lojaBruta as StoreComCategoria | null

  const horariosConfigurados = !!(loja?.horarios && Object.keys(loja.horarios as object).length > 0)
  const entregaConfigurada = !!(loja?.taxa_entrega !== null && loja?.raio_entrega_km && loja.raio_entrega_km > 0)
  const temProdutos = (totalProdutos ?? 0) > 0
  const recebimentosOk = tenant?.pagarme_onboarding_status === 'active'

  if (!(recebimentosOk && temProdutos && horariosConfigurados && entregaConfigurada)) {
    return (
      <SetupWizard
        nomeLoja={loja?.nome ?? 'Minha loja'}
        recebimentosOk={recebimentosOk}
        temProdutos={temProdutos}
        horariosConfigurados={horariosConfigurados}
        entregaConfigurada={entregaConfigurada}
      />
    )
  }

  // ===== Balcão aberto =====
  const agora = new Date()
  const template = getTemplateByStore(loja ?? {})

  const [{ data: pedidosHojeBrutos }, { data: pedidosAtivosBrutos }, topProdutos, repasses, saude, avaliacaoMedia, insight] =
    await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total, taxa_entrega, platform_fee_amount, criado_em')
        .eq('tenant_id', tenantId)
        .gte('criado_em', inicioDoDiaDaLoja(agora)),
      supabase
        .from('orders')
        .select('id, status, total, criado_em, consumers(nome), order_items(nome, quantidade)')
        .eq('tenant_id', tenantId)
        .in('status', STATUS_ATIVOS)
        .order('criado_em', { ascending: false })
        .limit(40),
      getTopProdutos(4),
      getRepasses('pendentes'),
      getSaudeLoja(),
      getAvaliacaoMedia(),
      getInsightBairro(),
    ])

  // Números do dia — cancelado não é receita.
  const pedidosHoje = ((pedidosHojeBrutos ?? []) as PedidoDoDia[]).filter((o) => o.status !== 'cancelado')
  const receitaHoje = pedidosHoje.reduce((s, o) => s + Number(o.total ?? 0), 0)
  const ticketMedio = pedidosHoje.length ? Math.round(receitaHoje / pedidosHoje.length) : 0
  const entreguesHoje = pedidosHoje.filter((o) => o.status === 'entregue')
  const liquidoHoje = entreguesHoje.reduce(
    (s, o) => s + Number(o.total ?? 0) - Number(o.taxa_entrega ?? 0) - Number(o.platform_fee_amount ?? 0),
    0,
  )

  // Fila — novos pedem ação na marquise; o resto vai para "Em andamento".
  const ativos: PedidoVivo[] = ((pedidosAtivosBrutos ?? []) as unknown as PedidoAtivo[]).map((o) => ({
    id: o.id,
    status: o.status,
    total: Number(o.total ?? 0),
    criado_em: o.criado_em,
    cliente: o.consumers?.nome ?? null,
    itens: (o.order_items ?? []).map((i) => ({ nome: i.nome, quantidade: Number(i.quantidade ?? 1) })),
  }))
  const novos = ativos.filter((o) => o.status === 'novo').reverse() // o mais antigo primeiro
  const andamento = ativos.filter((o) => o.status !== 'novo')
  const preparo = ativos.filter((o) => ['confirmado', 'em_preparo', 'aguardando_entregador'].includes(o.status)).length
  const entrega = ativos.filter((o) => o.status === 'saiu_para_entrega').length

  // Movimento por hora, no relógio da loja.
  const horasDosPedidos = pedidosHoje.map((o) => horaDaLoja(o.criado_em))
  const horas = horasDoExpediente(loja?.horarios, agora, horasDosPedidos)
  const hourly = horas.map((h) => ({ h: `${h}h`, n: horasDosPedidos.filter((x) => x === h).length }))
  const pico = hourly.reduce((a, b) => (b.n > a.n ? b : a), hourly[0] ?? { h: '—', n: 0 })
  const horaAgora = horaDaLoja(agora)
  const indiceAgora = horas.indexOf(horaAgora)

  const primeiroNome = (tenant?.nome_responsavel ?? '').trim().split(/\s+/)[0] || 'lojista'
  const resumo =
    ativos.length === 0
      ? 'Tudo tranquilo por aqui — nenhum pedido em aberto.'
      : [
          novos.length > 0 ? `${novos.length} ${novos.length === 1 ? 'novo' : 'novos'}` : null,
          preparo > 0 ? `${preparo} em preparo` : null,
          entrega > 0 ? `${entrega} em entrega` : null,
        ]
          .filter(Boolean)
          .join(' · ')

  const singular = template.produto.labels.produtoSingular

  return (
    <>
      <AtualizarAoVivo tenantId={tenantId} />

      {/* ── Marquise ───────────────────────────────────────────────── */}
      <section aria-labelledby="titulo-inicio" className="sobre-escuro relative px-6 pb-16 pt-7 text-white sm:px-10 sm:pt-9">
        <div className="mx-auto max-w-[1280px]">
          <div className="entra flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Sobrelinha aoVivo>
              {saudacao(horaAgora)}, {primeiroNome} · {dataPorExtenso(agora)}
            </Sobrelinha>
            {loja?.slug && (
              <a
                href={urlDaLoja(loja.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--m-glass)] pl-4 pr-3 text-[13px] font-semibold text-[color:var(--m-ink-2)] ring-1 ring-inset ring-[color:var(--m-line)] transition-colors hover:bg-[color:var(--m-glass-2)] hover:text-white"
              >
                Ver minha vitrine
                <PartnerIcon name="external" size={14} strokeWidth={2.1} />
              </a>
            )}
          </div>

          <div className="mt-8 grid gap-12 xl:grid-cols-12 xl:gap-10">
            <div className="xl:col-span-7">
              <div className="entra" style={{ ['--d' as string]: '0.05s' }}>
                <Statement
                  id="titulo-inicio"
                  className="text-[clamp(42px,5vw,72px)]"
                  linha="Sua loja,"
                  acesa={<>ao vivo no{' '}shopping.</>}
                />
                <p className="mt-5 text-[16px] leading-relaxed text-[color:var(--m-ink-2)]">
                  {resumo}
                </p>
              </div>

              <div className="entra mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ ['--d' as string]: '0.14s' }}>
                <PlacaVidro icone="cash" valor={money(receitaHoje)} rotulo="Receita hoje" />
                <PlacaVidro
                  icone="orders"
                  valor={pedidosHoje.length}
                  rotulo={pedidosHoje.length === 1 ? 'Pedido hoje' : 'Pedidos hoje'}
                />
                <PlacaVidro icone="trend" valor={money(ticketMedio)} rotulo="Ticket médio" />
                <PlacaVidro
                  icone="bell"
                  valor={novos.length}
                  rotulo={novos.length === 1 ? 'Novo' : 'Novos'}
                  alerta={novos.length > 0}
                  href="/pedidos?f=novo"
                />
                <PlacaVidro icone="chef" valor={preparo} rotulo="Em preparo" href="/pedidos?f=em_preparo" />
                <PlacaVidro icone="bike" valor={entrega} rotulo="Em entrega" href="/pedidos?f=saiu_para_entrega" />
              </div>
            </div>

            <div className="entra xl:col-span-5 xl:self-end" style={{ ['--d' as string]: '0.22s' }}>
              <div className="flex items-center justify-between">
                <p className="micro text-[color:var(--m-ink-3)]">Pede sua ação</p>
                {novos.length > 0 && (
                  <span className="rounded-full bg-[color:var(--brick)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--brick-ink)] tabular-nums">
                    {novos.length}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {novos.length > 0 ? (
                  novos.slice(0, 3).map((p) => <CartaoPedidoVivo key={p.id} pedido={p} />)
                ) : (
                  <SemAcaoPendente />
                )}
                {novos.length > 3 && (
                  <Link
                    href="/pedidos?f=novo"
                    className="inline-flex items-center justify-center gap-1 py-1 text-[13px] font-bold text-[color:var(--brick)]"
                  >
                    Mais {novos.length - 3} aguardando em Pedidos
                    <PartnerIcon name="chevron-right" size={14} strokeWidth={2.4} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Folha ──────────────────────────────────────────────────── */}
      <Folha>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-6 pt-10 sm:px-10 sm:pt-12">
          <div className="grid gap-x-6 gap-y-12 xl:grid-cols-12">
            <SecaoFolha
              id="movimento"
              className="flex flex-col xl:col-span-7"
              sobrelinha="Hoje"
              titulo="Movimento do dia"
              acao={{ label: 'Relatórios', href: '/relatorios' }}
            >
              <MovimentoCard
                hourly={hourly}
                pico={pico}
                agora={indiceAgora >= 0 ? hourly[indiceAgora].n : 0}
                indiceAgora={indiceAgora}
                totalHoje={pedidosHoje.length}
              />
            </SecaoFolha>
            <SecaoFolha
              id="andamento"
              className="flex flex-col xl:col-span-5"
              sobrelinha="Já confirmados"
              titulo="Em andamento"
              acao={andamento.length > 0 ? { label: 'Ver todos', href: '/pedidos' } : undefined}
            >
              <EmAndamentoCard pedidos={andamento.slice(0, 5)} total={andamento.length} />
            </SecaoFolha>
          </div>

          <div className="grid gap-x-6 gap-y-12 lg:grid-cols-3">
            <SecaoFolha id="mais-vendidos" className="flex flex-col" sobrelinha="Últimos 30 dias" titulo="Mais vendidos">
              <MaisVendidosCard produtos={topProdutos} />
            </SecaoFolha>
            <SecaoFolha
              id="recebimentos"
              className="flex flex-col"
              sobrelinha="Financeiro"
              titulo="Recebimentos"
              acao={{ label: 'Abrir', href: '/financeiro' }}
            >
              <RepasseCard
                aReceber={repasses.total_pendente}
                liquidoHoje={liquidoHoje}
                entreguesHoje={entreguesHoje.length}
                recebimentosAtivos={recebimentosOk}
              />
            </SecaoFolha>
            <SecaoFolha id="atalhos" className="flex flex-col" sobrelinha="Atalhos" titulo="Sua loja">
              <AtalhosCard
                avaliacao={avaliacaoMedia}
                atalhos={[
                  {
                    href: '/conteudo/novo',
                    icone: 'camera',
                    rotulo: 'Publicar no Explorar',
                    descricao: 'Foto ou vídeo de um produto',
                  },
                  {
                    href: '/produtos/novo',
                    icone: 'plus',
                    rotulo: `Novo ${singular.toLowerCase()}`,
                    descricao: `Entra em ${template.produto.labels.produtoPlural.toLowerCase()} e na vitrine`,
                  },
                  {
                    href: '/minha-loja',
                    icone: 'store',
                    rotulo: 'Vitrine',
                    descricao: 'O estilo e o conteúdo da sua loja',
                  },
                ]}
              />
            </SecaoFolha>
          </div>

          {saude.length > 0 && (
            <SecaoFolha id="saude" sobrelinha="Checklist" titulo="Saúde da loja">
              <SaudeLojaCard avisos={saude} />
            </SecaoFolha>
          )}

          {insight && <InsightBar insight={insight} />}
        </div>
      </Folha>
    </>
  )
}

/** Marquise sem pedido pedindo ação: uma linha de vidro dizendo isso. */
function SemAcaoPendente() {
  return (
    <CartaoVidro className="flex items-center gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-glass-2)] text-[color:var(--m-ink-2)]">
        <PartnerIcon name="check-double" size={18} strokeWidth={2} />
      </span>
      <span>
        <span className="block text-[15px] font-semibold text-white">Nenhum pedido esperando você</span>
        <span className="mt-0.5 block text-[13px] text-[color:var(--m-ink-2)]">
          Pedidos novos aparecem aqui na hora — confirme sem sair do Início.
        </span>
      </span>
    </CartaoVidro>
  )
}
