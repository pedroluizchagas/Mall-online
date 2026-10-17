import Link from 'next/link'
import { formatarReais } from '@mallevo/lib'
import { getVisaoGeral } from '@/lib/consultas'
import { contagem, numero, quando, saudacao } from '@/lib/format'
import { dataPorExtenso, horaDeDivinopolis, mesAtual, rotuloDoMes, somarMeses } from '@/lib/hoje'
import { metaRecebimentos } from '@/lib/status'
import { PlacaVidro, Sobrelinha, Statement } from '@/components/admin/marquise'
import { Folha, SecaoFolha } from '@/components/admin/folha'
import { KPI } from '@/components/admin/kpi'
import { variacao } from '@/lib/metricas'
import { BadgeStatus } from '@/components/admin/badge-status'
import { Tijolo } from '@/components/admin/tijolo'
import { FilaAcao, type ItemAcao } from '@/components/admin/visao-geral/fila-acao'
import { GraficoMeses } from '@/components/admin/visao-geral/grafico-meses'
import { BarraDistribuicao } from '@/components/admin/visao-geral/distribuicao'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

export const dynamic = 'force-dynamic'

/**
 * Visão geral — o shopping inteiro na arquitetura do Início do lojista:
 *
 * - MARQUISE (o que está ao vivo): saudação, o statement da casa, os números
 *   de hoje em placas de vidro e a fila do que pede a administração.
 * - FOLHA (o acervo): os últimos 12 meses, os lojistas por situação, o mês
 *   corrente comparado com o mesmo trecho do anterior, quem chegou por último
 *   e os atalhos dos bastidores.
 *
 * Todo número sai do banco; "hoje" e "mês" são de Divinópolis.
 */
export default async function PaginaVisaoGeral() {
  const v = await getVisaoGeral()
  const agora = new Date()
  const mes = mesAtual(agora)
  const nomeMesAnterior = rotuloDoMes(somarMeses(mes, -1)).split(' de ')[0]

  const itens: ItemAcao[] = []
  if (v.pendentes.total > 0) {
    const primeiro = v.pendentes.primeiros[0]
    itens.push({
      id: 'entregadores',
      icone: 'bike',
      titulo: `${contagem(v.pendentes.total, 'entregador aguardando', 'entregadores aguardando')} aprovação`,
      descricao: `${v.pendentes.primeiros.map((p) => p.nome.split(/\s+/)[0]).join(', ')}${v.pendentes.total > 3 ? '…' : ''} — o primeiro chegou ${quando(primeiro.criadoEm, agora.getTime())}.`,
      cta: { label: 'Revisar', href: '/admin/entregadores?status=pendente' },
    })
  }
  if (v.recebimentosComProblema > 0) {
    itens.push({
      id: 'recebimentos',
      icone: 'alert',
      titulo: `${contagem(v.recebimentosComProblema, 'lojista', 'lojistas')} com recebimento travado`,
      descricao: 'Recusado, bloqueado ou suspenso no Pagar.me — a loja não recebe pelo online.',
      cta: { label: 'Ver lojistas', href: '/admin/lojistas?recebimentos=com_problema' },
    })
  }
  if (v.assinaturasEmAtraso > 0) {
    itens.push({
      id: 'assinaturas',
      icone: 'clock',
      titulo: `${contagem(v.assinaturasEmAtraso, 'assinatura', 'assinaturas')} em atraso`,
      descricao: 'O lojista já vê o aviso de regularização no painel dele.',
      cta: { label: 'Ver lojistas', href: '/admin/lojistas?assinatura=em_atraso' },
    })
  }
  if (v.lojasEmOutros > 0) {
    itens.push({
      id: 'outros',
      icone: 'inbox',
      titulo: `${contagem(v.lojasEmOutros, 'loja', 'lojas')} sem nicho definido`,
      descricao: 'Estão em “Outros”: reclassifique para a loja ganhar o template e o piso certos.',
      cta: { label: 'Reclassificar', href: '/admin/lojas-outros' },
    })
  }

  const resumo =
    v.emAndamento === 0 && v.entregadoresOnline === 0
      ? 'Tudo calmo no shopping agora — nenhum pedido em andamento.'
      : [
          v.emAndamento > 0 ? contagem(v.emAndamento, 'pedido em andamento', 'pedidos em andamento') : 'Nenhum pedido em andamento',
          contagem(v.entregadoresOnline, 'entregador online', 'entregadores online'),
        ].join(' · ')

  const contexto = `vs. mesmo período de ${nomeMesAnterior}`
  const delta = (atual: number, anterior: number) => {
    const pct = variacao(atual, anterior)
    return pct === null ? null : { pct, contexto }
  }

  return (
    <>
      {/* ── Marquise ───────────────────────────────────────────────── */}
      <section aria-labelledby="titulo-visao" className="sobre-escuro relative px-6 pb-16 pt-7 text-white sm:px-10 sm:pt-9">
        <div className="mx-auto max-w-[1280px]">
          <div className="entra flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Sobrelinha aoVivo>
              {saudacao(horaDeDivinopolis(agora))}, {v.primeiroNome} · {dataPorExtenso(agora)}
            </Sobrelinha>
            <Link
              href={`/admin/financeiro?mes=${mes}`}
              className="group inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--m-glass)] pl-4 pr-3 text-[13px] font-semibold text-[color:var(--m-ink-2)] ring-1 ring-inset ring-[color:var(--m-line)] transition-colors hover:bg-[color:var(--m-glass-2)] hover:text-white"
            >
              Conciliação de {rotuloDoMes(mes).split(' de ')[0]}
              <PartnerIcon name="chevron-right" size={14} strokeWidth={2.2} />
            </Link>
          </div>

          <div className="mt-8 grid gap-12 xl:grid-cols-12 xl:gap-10">
            <div className="xl:col-span-7">
              <div className="entra" style={{ ['--d' as string]: '0.05s' }}>
                <Statement
                  id="titulo-visao"
                  className="text-[clamp(42px,5vw,72px)]"
                  linha="O shopping inteiro,"
                  acesa={<>ao vivo.</>}
                />
                <p className="mt-5 text-[16px] leading-relaxed text-[color:var(--m-ink-2)]">{resumo}</p>
              </div>

              <div className="entra mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ ['--d' as string]: '0.14s' }}>
                <PlacaVidro icone="cash" valor={formatarReais(v.hoje.gmv)} rotulo="GMV entregue hoje" />
                <PlacaVidro icone="check-double" valor={numero(v.hoje.pedidos)} rotulo="Entregues hoje" />
                <PlacaVidro icone="wallet" valor={formatarReais(v.hoje.comissoes)} rotulo="Comissões hoje" />
                <PlacaVidro icone="orders" valor={numero(v.emAndamento)} rotulo="Em andamento agora" />
                <PlacaVidro icone="store" valor={numero(v.lojistasAtivos)} rotulo="Lojistas ativos" href="/admin/lojistas" />
                <PlacaVidro
                  icone="bike"
                  valor={numero(v.entregadoresOnline)}
                  rotulo="Entregadores online"
                  href="/admin/entregadores?status=aprovado"
                />
              </div>
            </div>

            <div className="entra xl:col-span-5 xl:self-end" style={{ ['--d' as string]: '0.22s' }}>
              <div className="flex items-center justify-between">
                <p className="micro text-[color:var(--m-ink-3)]">Pede sua ação</p>
                {itens.length > 0 && (
                  <span className="rounded-full bg-[color:var(--brick)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--brick-ink)] tabular-nums">
                    {itens.length}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <FilaAcao itens={itens} />
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
              className="flex flex-col xl:col-span-8"
              sobrelinha="Últimos 12 meses · pedidos entregues"
              titulo="Movimento do shopping"
              acao={{ label: 'Conciliação', href: '/admin/financeiro' }}
            >
              <GraficoMeses
                serie={v.serie.map((p) => ({
                  mes: p.mes,
                  curto: rotuloDoMes(p.mes, 'curto'),
                  longo: rotuloDoMes(p.mes),
                  gmv: p.gmv,
                  pedidos: p.pedidos,
                  comissoes: p.comissoes,
                }))}
              />
            </SecaoFolha>

            <SecaoFolha
              id="lojistas"
              className="flex flex-col xl:col-span-4"
              sobrelinha={contagem(v.lojistasTotal, 'lojista cadastrado', 'lojistas cadastrados')}
              titulo="Lojistas por situação"
              acao={{ label: 'Ver todos', href: '/admin/lojistas' }}
            >
              <div className="cartao flex flex-1 flex-col gap-7 p-5 sm:p-6">
                <BarraDistribuicao
                  rotulo="Assinatura"
                  segmentos={[
                    { id: 'ativa', rotulo: 'Ativa', valor: v.distribuicao.assinatura.ativa ?? 0, tom: 'ok' },
                    { id: 'trial', rotulo: 'Em teste', valor: v.distribuicao.assinatura.trial ?? 0, tom: 'info' },
                    { id: 'em_atraso', rotulo: 'Em atraso', valor: v.distribuicao.assinatura.em_atraso ?? 0, tom: 'aviso' },
                    { id: 'cancelada', rotulo: 'Cancelada', valor: v.distribuicao.assinatura.cancelada ?? 0, tom: 'perigo' },
                    { id: 'suspensa', rotulo: 'Suspensa', valor: v.distribuicao.assinatura.suspensa ?? 0, tom: 'neutro' },
                    { id: 'sem', rotulo: 'Sem assinatura', valor: v.distribuicao.assinatura.sem ?? 0, tom: 'vazio' },
                  ]}
                />
                <BarraDistribuicao
                  rotulo="Recebimentos"
                  segmentos={[
                    { id: 'verificado', rotulo: 'Verificado', valor: v.distribuicao.recebimentos.verificado, tom: 'ok' },
                    { id: 'em_andamento', rotulo: 'Em andamento', valor: v.distribuicao.recebimentos.em_andamento, tom: 'aviso' },
                    { id: 'com_problema', rotulo: 'Com problema', valor: v.distribuicao.recebimentos.com_problema, tom: 'perigo' },
                    { id: 'inativo', rotulo: 'Inativo', valor: v.distribuicao.recebimentos.inativo, tom: 'neutro' },
                  ]}
                />
              </div>
            </SecaoFolha>
          </div>

          <SecaoFolha
            id="este-mes"
            sobrelinha={`${rotuloDoMes(mes)} · até agora`}
            titulo="Este mês"
            acao={{ label: 'Abrir conciliação', href: `/admin/financeiro?mes=${mes}` }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPI
                rotulo="Pedidos entregues"
                valor={numero(v.mes.pedidos)}
                delta={delta(v.comparacao.atual.pedidos, v.comparacao.anterior.pedidos)}
              />
              <KPI rotulo="GMV" valor={formatarReais(v.mes.gmv)} delta={delta(v.comparacao.atual.gmv, v.comparacao.anterior.gmv)} />
              <KPI rotulo="Ticket médio" valor={formatarReais(v.mes.ticketMedio)} sub="GMV ÷ pedidos entregues" />
              <KPI
                rotulo="Comissões"
                valor={formatarReais(v.mes.comissoes)}
                delta={delta(v.comparacao.atual.comissoes, v.comparacao.anterior.comissoes)}
                sub="O que fica com a plataforma"
                destaque
              />
            </div>
            {v.repassesACaminho.quantidade > 0 && (
              <Link
                href="/admin/financeiro"
                className="cartao group mt-4 flex items-center gap-3.5 p-4 transition-shadow hover:shadow-md"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink">
                  <PartnerIcon name="route" size={18} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">
                    {formatarReais(v.repassesACaminho.valor)} em{' '}
                    {contagem(v.repassesACaminho.quantidade, 'repasse a caminho', 'repasses a caminho')}
                  </span>
                  <span className="block text-[12.5px] text-ink-3">Agendados ou em processamento no Pagar.me.</span>
                </span>
                <PartnerIcon
                  name="chevron-right"
                  size={16}
                  strokeWidth={2.2}
                  className="shrink-0 text-ink-3 transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </SecaoFolha>

          <div className="grid gap-x-6 gap-y-12 lg:grid-cols-2">
            <SecaoFolha
              id="novos"
              className="flex flex-col"
              sobrelinha="Chegaram por último"
              titulo="Novos no shopping"
              acao={{ label: 'Ver lojistas', href: '/admin/lojistas' }}
            >
              <div className="cartao flex flex-1 flex-col p-2">
                {v.novosLojistas.length === 0 ? (
                  <p className="px-4 py-10 text-center text-[14px] text-ink-3">Nenhum lojista cadastrado ainda.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col p-0">
                    {v.novosLojistas.map((l, i) => (
                      <li key={l.id} className={i > 0 ? 'border-t border-line' : undefined}>
                        <Link
                          href={`/admin/lojistas?busca=${encodeURIComponent(l.email || l.nome)}`}
                          className="flex items-center gap-3.5 rounded-[14px] px-3 py-3 transition-colors hover:bg-bg-2"
                        >
                          <Tijolo nome={l.loja?.nome ?? l.nome} foto={l.loja?.logo} className="size-10" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-semibold text-ink">{l.loja?.nome ?? l.nome}</span>
                            <span className="block truncate text-[12.5px] text-ink-3">
                              {l.loja ? `${l.nome} · ` : ''}{quando(l.criadoEm, agora.getTime())}
                            </span>
                          </span>
                          <BadgeStatus meta={metaRecebimentos(l.recebimentos)} contexto="Recebimentos" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SecaoFolha>

            <SecaoFolha id="atalhos" className="flex flex-col" sobrelinha="Atalhos" titulo="Bastidores">
              <div className="cartao flex flex-1 flex-col p-2">
                <ul className="m-0 flex list-none flex-col p-0">
                  {ATALHOS.map((a, i) => (
                    <li key={a.href} className={i > 0 ? 'border-t border-line' : undefined}>
                      <Link
                        href={a.href}
                        className="group flex items-center gap-3.5 rounded-[14px] px-3 py-3 transition-colors hover:bg-bg-2"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-2 text-ink transition-colors group-hover:bg-bg">
                          <PartnerIcon name={a.icone} size={18} strokeWidth={1.9} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">{a.rotulo}</span>
                          <span className="block truncate text-[12.5px] text-ink-3">{a.descricao}</span>
                        </span>
                        <PartnerIcon
                          name="chevron-right"
                          size={16}
                          strokeWidth={2.2}
                          className="shrink-0 text-ink-3 transition-transform duration-300 ease-entrada group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </SecaoFolha>
          </div>
        </div>
      </Folha>
    </>
  )
}

const ATALHOS: { href: string; icone: PartnerIconName; rotulo: string; descricao: string }[] = [
  {
    href: '/admin/entregadores?status=pendente',
    icone: 'bike',
    rotulo: 'Aprovar entregadores',
    descricao: 'A fila de cadastros, com a foto da CNH',
  },
  {
    href: '/admin/lojas-outros',
    icone: 'inbox',
    rotulo: 'Reclassificar lojas',
    descricao: 'Levar cada loja de “Outros” para o nicho certo',
  },
  {
    href: '/admin/financeiro',
    icone: 'wallet',
    rotulo: 'Conciliação do mês',
    descricao: 'GMV, comissões e repasses',
  },
  {
    href: '/admin/planos#novo-plano',
    icone: 'tag',
    rotulo: 'Novo plano',
    descricao: 'Nasce no Stripe e entra na lista de planos',
  },
]
