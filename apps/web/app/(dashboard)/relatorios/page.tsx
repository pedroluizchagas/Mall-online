import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { createSupabaseServer } from '@/lib/supabase/server'
import { agregarItens, calcularResumo, distribuirPor } from '@mallevo/lib'
import { intervaloAnterior, intervaloPeriodo, periodoValido } from './_lib/periodo'
import { abaValida, type AbaRelatorio } from './_lib/abas'
import { FiltroPeriodo } from './_components/filtro-periodo'
import { AbasRelatorio } from './_components/abas-relatorio'
import { MetricasHeader, type ResumoMetricas } from './_components/metricas-header'
import { BarraDistribuicao, type ItemDistribuicao } from './_components/barra-distribuicao'
import { TopProdutos, type ProdutoAgregado } from './_components/top-produtos'
import { TabelaRelatorio } from './_components/tabela-relatorio'
import { HeatmapHoras } from './_components/heatmap-horas'
import { ExportarCsvButton } from './_components/exportar-csv-button'

/**
 * Relatórios (dashboard-redesign 04 §4.2) — 5 abas: Visão geral, Produtos,
 * Pedidos, Clientes e Bairros. Aba + período persistem na URL (?aba=,
 * ?periodo=). Fetches extras rodam SÓ na aba que precisa deles.
 *
 * Fora de escopo (schema não suporta hoje): tempo médio por etapa e motivos
 * de cancelamento (orders não tem timestamps por etapa nem motivo); margem
 * por produto (sem campo de custo). Export XLSX/PDF fica para a edge
 * function `build-report`.
 */

interface SearchParams {
  periodo?: string
  aba?: string
}

interface PedidoLinha {
  id: string
  status: string
  total: number
  subtotal: number | null
  taxa_entrega: number | null
  platform_fee_amount: number | null
  forma_pagamento: string | null
  tipo: string | null
  criado_em: string
  cancelado_em: string | null
  consumer_id: string | null
  endereco_entrega: { bairro?: string } | null
}

interface ItemLinha {
  product_id: string | null
  nome: string
  quantidade: number
  subtotal: number
}

const ROTULOS_STATUS: Record<string, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  em_preparo: 'Em preparo',
  aguardando_entregador: 'Aguardando entregador',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const ROTULOS_PAGAMENTO: Record<string, string> = {
  pix: 'PIX',
  cartao: 'Cartão',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
}

const ROTULOS_TIPO: Record<string, string> = {
  entrega: 'Entrega',
  agendamento: 'Agendamento',
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function rotulo(mapa: Record<string, string>, valor: string | null): string {
  if (!valor) return 'Não informado'
  return mapa[valor] ?? valor
}

function brl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// calcularResumo / distribuirPor / agregarItens vivem em @mallevo/lib
// (src/relatorios/agregados.ts), compartilhados com o Partner App —
// fonte única das agregações (docs/partner-app/07).

export default async function PaginaRelatorios({ searchParams }: { searchParams: SearchParams }) {
  const periodo = periodoValido(searchParams.periodo)
  const aba = abaValida(searchParams.aba)
  const supabase = createSupabaseServer()
  const { data: tenant } = await supabase.from('tenants').select('id').single()

  if (!tenant) {
    return (
      <div className="p-9">
        <p className="text-ink-3">Tenant não encontrado.</p>
      </div>
    )
  }

  const intervalo = intervaloPeriodo(periodo)
  const anterior = intervaloAnterior(intervalo)

  const colunasPedido =
    'id, status, total, subtotal, taxa_entrega, platform_fee_amount, forma_pagamento, tipo, criado_em, cancelado_em, consumer_id, endereco_entrega'

  const selecionarItens = (inicio: Date, fim: Date) =>
    supabase
      .from('order_items')
      .select('product_id, nome, quantidade, subtotal, orders!inner(tenant_id, criado_em)')
      .eq('orders.tenant_id', tenant.id)
      .gte('orders.criado_em', inicio.toISOString())
      .lte('orders.criado_em', fim.toISOString())

  const [pedidosAtual, pedidosAnterior, itensAtual] = await Promise.all([
    supabase
      .from('orders')
      .select(colunasPedido)
      .eq('tenant_id', tenant.id)
      .gte('criado_em', intervalo.inicio.toISOString())
      .lte('criado_em', intervalo.fim.toISOString()),
    supabase
      .from('orders')
      .select(colunasPedido)
      .eq('tenant_id', tenant.id)
      .gte('criado_em', anterior.inicio.toISOString())
      .lt('criado_em', anterior.fim.toISOString()),
    selecionarItens(intervalo.inicio, intervalo.fim),
  ])

  const linhasAtual = (pedidosAtual.data ?? []) as unknown as PedidoLinha[]
  const linhasAnterior = (pedidosAnterior.data ?? []) as unknown as PedidoLinha[]
  const linhasItens = (itensAtual.data ?? []) as unknown as ItemLinha[]

  const semDados = linhasAtual.length === 0

  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Relatórios"
        subtitulo="Análises agregadas de vendas, produtos, clientes e bairros."
        acoes={<ExportarCsvButton periodo={periodo} />}
      />

      <FiltroPeriodo periodoAtivo={periodo} />
      <AbasRelatorio abaAtiva={aba} periodo={periodo} />

      {semDados ? (
        <EmptyState
          icone={BarChart3}
          titulo="Sem pedidos no período"
          descricao="Quando houver pedidos no intervalo selecionado, métricas, distribuições e rankings aparecerão aqui."
        />
      ) : (
        <ConteudoAba
          aba={aba}
          linhasAtual={linhasAtual}
          linhasAnterior={linhasAnterior}
          linhasItens={linhasItens}
          selecionarItensAnterior={() => selecionarItens(anterior.inicio, anterior.fim)}
          tenantId={tenant.id}
          inicioPeriodoISO={intervalo.inicio.toISOString()}
        />
      )}
    </div>
  )
}

// ============================================================================
// Conteúdo por aba
// ============================================================================

async function ConteudoAba({
  aba,
  linhasAtual,
  linhasAnterior,
  linhasItens,
  selecionarItensAnterior,
  tenantId,
  inicioPeriodoISO,
}: {
  aba: AbaRelatorio
  linhasAtual: PedidoLinha[]
  linhasAnterior: PedidoLinha[]
  linhasItens: ItemLinha[]
  selecionarItensAnterior: () => PromiseLike<{ data: unknown[] | null }>
  tenantId: string
  inicioPeriodoISO: string
}) {
  const supabase = createSupabaseServer()

  // ── Visão geral ──────────────────────────────────────────────────────────
  if (aba === 'visao-geral') {
    const topProdutos = Array.from(agregarItens(linhasItens).values())
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 10)

    return (
      <div className="space-y-5">
        <MetricasHeader atual={calcularResumo(linhasAtual)} anterior={calcularResumo(linhasAnterior)} />
        <HeatmapHoras pedidos={linhasAtual.filter((p) => p.status !== 'cancelado')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BarraDistribuicao
            titulo="Formas de pagamento"
            itens={distribuirPor(
              linhasAtual.filter((p) => p.status !== 'cancelado'),
              (p) => p.forma_pagamento ?? 'nao_informado',
              (k) => (k === 'nao_informado' ? 'Não informado' : rotulo(ROTULOS_PAGAMENTO, k)),
            )}
          />
          <BarraDistribuicao
            titulo="Tipo de pedido"
            itens={distribuirPor(
              linhasAtual.filter((p) => p.status !== 'cancelado'),
              (p) => p.tipo ?? 'entrega',
              (k) => rotulo(ROTULOS_TIPO, k),
            )}
          />
        </div>
        <TopProdutos produtos={topProdutos} />
      </div>
    )
  }

  // ── Produtos ─────────────────────────────────────────────────────────────
  if (aba === 'produtos') {
    const [itensAnterioresRes, estoqueRes] = await Promise.all([
      selecionarItensAnterior(),
      supabase
        .from('products')
        .select('nome, stock_quantity, stock_minimo')
        .eq('tenant_id', tenantId)
        .eq('track_stock', true),
    ])

    const agregadoAtual = agregarItens(linhasItens)
    const agregadoAnterior = agregarItens((itensAnterioresRes.data ?? []) as unknown as ItemLinha[])

    const top20 = Array.from(agregadoAtual.values())
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 20)

    // Em queda: vendeu no período anterior e caiu ≥25% (ou zerou) agora.
    const emQueda = Array.from(agregadoAnterior.entries())
      .map(([chave, antes]) => {
        const agora = agregadoAtual.get(chave)
        return { nome: antes.nome, antes: antes.quantidade, agora: agora?.quantidade ?? 0 }
      })
      .filter((p) => p.antes >= 3 && p.agora < p.antes * 0.75)
      .sort((a, b) => a.agora / a.antes - b.agora / b.antes)
      .slice(0, 10)

    const estoqueBaixo = ((estoqueRes.data ?? []) as {
      nome: string
      stock_quantity: number | null
      stock_minimo: number | null
    }[])
      .filter((p) => (p.stock_quantity ?? 0) <= (p.stock_minimo ?? 10))
      .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))

    return (
      <div className="space-y-5">
        <TopProdutos produtos={top20} titulo="Top 20 produtos" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <TabelaRelatorio
            titulo="Em queda"
            descricao="Venderam no período anterior e caíram 25% ou mais neste."
            colunas={[
              { titulo: 'Produto' },
              { titulo: 'Antes', alinhar: 'right' },
              { titulo: 'Agora', alinhar: 'right' },
              { titulo: 'Δ', alinhar: 'right' },
            ]}
            linhas={emQueda.map((p) => [
              p.nome,
              p.antes,
              p.agora,
              <span key="d" style={{ color: 'var(--err, #B3402F)' }}>
                −{Math.round((1 - p.agora / p.antes) * 100)}%
              </span>,
            ])}
            vazio="Nenhum produto em queda relevante."
          />
          <TabelaRelatorio
            titulo="Estoque baixo"
            descricao="Produtos com controle de estoque no mínimo ou abaixo."
            colunas={[
              { titulo: 'Produto' },
              { titulo: 'Em estoque', alinhar: 'right' },
              { titulo: 'Mínimo', alinhar: 'right' },
            ]}
            linhas={estoqueBaixo.map((p) => [p.nome, p.stock_quantity ?? 0, p.stock_minimo ?? 10])}
            vazio="Nenhum produto com estoque baixo."
          />
        </div>
      </div>
    )
  }

  // ── Pedidos ──────────────────────────────────────────────────────────────
  if (aba === 'pedidos') {
    const cancelados = linhasAtual.filter((p) => p.status === 'cancelado').length
    const taxaCancelamento = linhasAtual.length > 0 ? (cancelados / linhasAtual.length) * 100 : 0

    const naoCancelados = linhasAtual.filter((p) => p.status !== 'cancelado')
    const porDia = DIAS_SEMANA.map((nome, dia) => {
      const doDia = naoCancelados.filter((p) => new Date(p.criado_em).getDay() === dia)
      const receita = doDia.reduce((s, p) => s + (p.total ?? 0), 0)
      return {
        nome,
        pedidos: doDia.length,
        ticket: doDia.length > 0 ? Math.round(receita / doDia.length) : 0,
      }
    })

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <BarraDistribuicao
            titulo="Distribuição por status"
            itens={distribuirPor(linhasAtual, (p) => p.status, (k) => rotulo(ROTULOS_STATUS, k))}
          />
          <TabelaRelatorio
            titulo="Cancelamentos"
            colunas={[{ titulo: 'Métrica' }, { titulo: 'Valor', alinhar: 'right' }]}
            linhas={[
              ['Pedidos no período', linhasAtual.length],
              ['Cancelados', cancelados],
              [
                'Taxa de cancelamento',
                <span
                  key="t"
                  style={{ color: taxaCancelamento > 10 ? 'var(--err, #B3402F)' : undefined }}
                >
                  {taxaCancelamento.toFixed(1)}%
                </span>,
              ],
            ]}
          />
        </div>
        <TabelaRelatorio
          titulo="Pedidos por dia da semana"
          descricao="Volume e ticket médio por dia — onde concentrar promoções e equipe."
          colunas={[
            { titulo: 'Dia' },
            { titulo: 'Pedidos', alinhar: 'right' },
            { titulo: 'Ticket médio', alinhar: 'right' },
          ]}
          linhas={porDia.map((d) => [d.nome, d.pedidos, d.pedidos > 0 ? brl(d.ticket) : '—'])}
        />
      </div>
    )
  }

  // ── Clientes ─────────────────────────────────────────────────────────────
  if (aba === 'clientes') {
    const validos = linhasAtual.filter((p) => p.status !== 'cancelado' && p.consumer_id)
    const porCliente = new Map<string, { pedidos: number; total: number }>()
    for (const p of validos) {
      const atual = porCliente.get(p.consumer_id!) ?? { pedidos: 0, total: 0 }
      atual.pedidos += 1
      atual.total += p.total ?? 0
      porCliente.set(p.consumer_id!, atual)
    }
    const ids = Array.from(porCliente.keys()).slice(0, 1000)

    // Recorrente = já tinha pedido ANTES do início do período.
    const { data: anteriores } = ids.length
      ? await supabase
          .from('orders')
          .select('consumer_id')
          .eq('tenant_id', tenantId)
          .lt('criado_em', inicioPeriodoISO)
          .in('consumer_id', ids)
          .limit(5000)
      : { data: [] }
    const recorrentes = new Set((anteriores ?? []).map((o) => o.consumer_id as string))

    const novos = ids.filter((id) => !recorrentes.has(id)).length
    const totalClientes = ids.length
    const totalPedidos = validos.length
    const frequenciaMedia = totalClientes > 0 ? totalPedidos / totalClientes : 0
    const receitaTotal = validos.reduce((s, p) => s + (p.total ?? 0), 0)
    const ticketPorCliente = totalClientes > 0 ? Math.round(receitaTotal / totalClientes) : 0

    const topIds = Array.from(porCliente.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
    const { data: nomes } = topIds.length
      ? await supabase
          .from('consumers')
          .select('id, nome')
          .in('id', topIds.map(([id]) => id))
      : { data: [] }
    const nomePor = new Map((nomes ?? []).map((c) => [c.id as string, c.nome as string]))

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <BarraDistribuicao
            titulo="Novos × recorrentes"
            itens={[
              { rotulo: 'Novos no período', valor: novos },
              { rotulo: 'Recorrentes', valor: totalClientes - novos },
            ]}
          />
          <TabelaRelatorio
            titulo="Resumo"
            colunas={[{ titulo: 'Métrica' }, { titulo: 'Valor', alinhar: 'right' }]}
            linhas={[
              ['Clientes no período', totalClientes],
              ['Frequência média', `${frequenciaMedia.toFixed(1)} pedidos/cliente`],
              ['Gasto médio por cliente', brl(ticketPorCliente)],
            ]}
          />
        </div>
        <TabelaRelatorio
          titulo="Top clientes"
          descricao="Maiores clientes do período por valor gasto."
          colunas={[
            { titulo: 'Cliente' },
            { titulo: 'Pedidos', alinhar: 'right' },
            { titulo: 'Total gasto', alinhar: 'right' },
          ]}
          linhas={topIds.map(([id, agg]) => [
            nomePor.get(id) ?? 'Cliente',
            agg.pedidos,
            brl(agg.total),
          ])}
        />
      </div>
    )
  }

  // ── Bairros ──────────────────────────────────────────────────────────────
  const validosBairro = linhasAtual.filter((p) => p.status !== 'cancelado')
  const porBairro = new Map<string, { pedidos: number; receita: number }>()
  for (const p of validosBairro) {
    const bairro = p.endereco_entrega?.bairro?.trim() || 'Não informado'
    const atual = porBairro.get(bairro) ?? { pedidos: 0, receita: 0 }
    atual.pedidos += 1
    atual.receita += p.total ?? 0
    porBairro.set(bairro, atual)
  }
  const totalPedidosBairros = validosBairro.length
  const bairros = Array.from(porBairro.entries()).sort((a, b) => b[1].pedidos - a[1].pedidos)

  return (
    <TabelaRelatorio
      titulo="Pedidos por bairro"
      descricao="De onde vêm seus pedidos — volume, receita e ticket médio por região."
      colunas={[
        { titulo: 'Bairro' },
        { titulo: 'Pedidos', alinhar: 'right' },
        { titulo: '% do total', alinhar: 'right' },
        { titulo: 'Receita', alinhar: 'right' },
        { titulo: 'Ticket médio', alinhar: 'right' },
      ]}
      linhas={bairros.map(([bairro, agg]) => [
        bairro,
        agg.pedidos,
        `${((agg.pedidos / totalPedidosBairros) * 100).toFixed(1)}%`,
        brl(agg.receita),
        brl(Math.round(agg.receita / agg.pedidos)),
      ])}
    />
  )
}
