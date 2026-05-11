import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { EmptyState } from '@/components/dashboard/empty-state'
import { createSupabaseServer } from '@/lib/supabase/server'
import { intervaloAnterior, intervaloPeriodo, periodoValido } from './_lib/periodo'
import { FiltroPeriodo } from './_components/filtro-periodo'
import { MetricasHeader, type ResumoMetricas } from './_components/metricas-header'
import { BarraDistribuicao, type ItemDistribuicao } from './_components/barra-distribuicao'
import { TopProdutos, type ProdutoAgregado } from './_components/top-produtos'
import { ExportarCsvButton } from './_components/exportar-csv-button'

interface SearchParams { periodo?: string }

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
}

interface ItemLinha {
  product_id: string | null
  nome: string
  quantidade: number
  subtotal: number
  orders: { tenant_id: string; criado_em: string } | { tenant_id: string; criado_em: string }[] | null
}

const STATUS_CONCLUIDO = 'entregue'

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

function rotulo(mapa: Record<string, string>, valor: string | null): string {
  if (!valor) return 'Não informado'
  return mapa[valor] ?? valor
}

function calcularResumo(pedidos: PedidoLinha[]): ResumoMetricas {
  const concluidos = pedidos.filter((p) => p.status === STATUS_CONCLUIDO && p.cancelado_em === null)
  const bruto = concluidos.reduce((s, p) => s + (p.total ?? 0), 0)
  const liquido = concluidos.reduce(
    (s, p) => s + (p.total ?? 0) - (p.platform_fee_amount ?? 0) - (p.taxa_entrega ?? 0),
    0,
  )
  const count = concluidos.length
  return {
    faturamentoBruto: bruto,
    faturamentoLiquido: liquido,
    pedidosConcluidos: count,
    ticketMedio: count > 0 ? Math.round(bruto / count) : 0,
  }
}

function distribuirPor<K extends string>(
  pedidos: PedidoLinha[],
  chave: (p: PedidoLinha) => K,
  rotulador: (k: K) => string,
): ItemDistribuicao[] {
  const mapa = new Map<K, number>()
  for (const p of pedidos) {
    const k = chave(p)
    mapa.set(k, (mapa.get(k) ?? 0) + 1)
  }
  return Array.from(mapa.entries()).map(([k, valor]) => ({ rotulo: rotulador(k), valor }))
}

export default async function PaginaRelatorios({ searchParams }: { searchParams: SearchParams }) {
  const periodo = periodoValido(searchParams.periodo)
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
    'id, status, total, subtotal, taxa_entrega, platform_fee_amount, forma_pagamento, tipo, criado_em, cancelado_em'

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
    supabase
      .from('order_items')
      .select('product_id, nome, quantidade, subtotal, orders!inner(tenant_id, criado_em)')
      .eq('orders.tenant_id', tenant.id)
      .gte('orders.criado_em', intervalo.inicio.toISOString())
      .lte('orders.criado_em', intervalo.fim.toISOString()),
  ])

  const linhasAtual = (pedidosAtual.data ?? []) as PedidoLinha[]
  const linhasAnterior = (pedidosAnterior.data ?? []) as PedidoLinha[]
  const linhasItens = (itensAtual.data ?? []) as ItemLinha[]

  const resumoAtual = calcularResumo(linhasAtual)
  const resumoAnterior = calcularResumo(linhasAnterior)

  const distribuicaoStatus = distribuirPor(
    linhasAtual,
    (p) => p.status,
    (k) => rotulo(ROTULOS_STATUS, k),
  )

  const distribuicaoPagamento = distribuirPor(
    linhasAtual.filter((p) => p.status !== 'cancelado'),
    (p) => p.forma_pagamento ?? 'nao_informado',
    (k) => (k === 'nao_informado' ? 'Não informado' : rotulo(ROTULOS_PAGAMENTO, k)),
  )

  const distribuicaoTipo = distribuirPor(
    linhasAtual.filter((p) => p.status !== 'cancelado'),
    (p) => p.tipo ?? 'entrega',
    (k) => rotulo(ROTULOS_TIPO, k),
  )

  const agregadoProdutos = new Map<string, ProdutoAgregado>()
  for (const item of linhasItens) {
    const chave = item.product_id ?? `nome:${item.nome}`
    const atual = agregadoProdutos.get(chave) ?? {
      productId: item.product_id,
      nome: item.nome,
      quantidade: 0,
      receita: 0,
    }
    atual.quantidade += item.quantidade ?? 0
    atual.receita += item.subtotal ?? 0
    agregadoProdutos.set(chave, atual)
  }
  const topProdutos = Array.from(agregadoProdutos.values())
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10)

  const semDados = linhasAtual.length === 0

  return (
    <div className="p-9 slide-up">
      <PageHeader
        titulo="Relatórios"
        subtitulo="Análises agregadas de vendas, status e produtos."
        acoes={<ExportarCsvButton periodo={periodo} />}
      />

      <FiltroPeriodo periodoAtivo={periodo} />

      {semDados ? (
        <EmptyState
          icone={BarChart3}
          titulo="Sem pedidos no período"
          descricao="Quando houver pedidos no intervalo selecionado, métricas, distribuições e top produtos aparecerão aqui."
        />
      ) : (
        <div className="space-y-5">
          <MetricasHeader atual={resumoAtual} anterior={resumoAnterior} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <BarraDistribuicao titulo="Distribuição por status" itens={distribuicaoStatus} />
            <BarraDistribuicao titulo="Formas de pagamento" itens={distribuicaoPagamento} />
          </div>

          <BarraDistribuicao titulo="Tipo de pedido" itens={distribuicaoTipo} />

          <TopProdutos produtos={topProdutos} />
        </div>
      )}
    </div>
  )
}
