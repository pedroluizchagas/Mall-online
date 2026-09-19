import { useMemo, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { router } from 'expo-router'
import { usePedidosStore, STATUS_ATIVOS, type Pedido } from '@/store/usePedidosStore'
import { atualizarStatusPedido } from '@/lib/pedidos'
import { PedidoCard } from '@/components/PedidoCard'
import { CartaoPedidoVivo, CartaoVivoApagado } from '@/components/pedidos/CartaoPedidoVivo'
import { SeletorLoja } from '@/components/SeletorLoja'
import { PartnerIcon } from '@/components/PartnerIcon'
import { TelaMarquise } from '@/components/marquise/TelaMarquise'
import { CartaoVidro, Portaria, Statement } from '@/components/marquise/Marquise'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Pedidos — a mesma arquitetura do Início e da tela de Pedidos do
 * consumer: MARQUISE com o que pede ação AGORA (pedidos novos, um cartão
 * ao vivo cada, com "Confirmar" inline), FOLHA com o que já está rodando
 * (em andamento) e o que já passou (finalizados, com filtro de período).
 *
 * Os chips de status saíram: a divisão novos / em andamento / finalizados
 * já responde as três perguntas de uma vez. O período fica, porque os
 * finalizados crescem sem parar — e espelha o Dashboard.
 * docs/partner-app/05-stage-3-pedidos.md · docs/system-design/partner/01-telas.md §2
 */

type FiltroPeriodo = 'hoje' | '7d' | 'mes'

const FILTROS_PERIODO: { key: FiltroPeriodo; rotulo: string }[] = [
  { key: 'hoje', rotulo: 'Hoje' },
  { key: '7d', rotulo: '7 dias' },
  { key: 'mes', rotulo: 'Mês' },
]

function inicioDoPeriodo(periodo: FiltroPeriodo): Date {
  const d = new Date()
  if (periodo === 'hoje') d.setHours(0, 0, 0, 0)
  if (periodo === '7d') d.setDate(d.getDate() - 7)
  if (periodo === 'mes') d.setDate(d.getDate() - 30)
  return d
}

const { colors } = partnerDesign

export default function TelaPedidos() {
  const { pedidos, carregando, erro, carregarPedidos, aplicarPedido } = usePedidosStore()
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('hoje')
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const grupos = useMemo(() => {
    const inicio = inicioDoPeriodo(periodo).getTime()
    const novos: Pedido[] = []
    const andamento: Pedido[] = []
    const finalizados: Pedido[] = []
    for (const p of pedidos) {
      if (p.status === 'novo') novos.push(p)
      else if (STATUS_ATIVOS.includes(p.status)) andamento.push(p)
      // Ativos sempre aparecem; só os finalizados obedecem ao período.
      else if (new Date(p.criado_em).getTime() >= inicio) finalizados.push(p)
    }
    return { novos, andamento, finalizados }
  }, [pedidos, periodo])

  async function confirmar(pedido: Pedido) {
    if (confirmando) return
    setConfirmando(pedido.id)
    aplicarPedido({ ...pedido, status: 'confirmado' })
    const r = await atualizarStatusPedido(pedido.id, 'confirmado')
    setConfirmando(null)
    if (r.erro) {
      aplicarPedido(pedido)
      Alert.alert('Não foi possível confirmar', r.erro)
    }
  }

  const resumo = carregando && pedidos.length === 0
    ? 'Buscando seus pedidos…'
    : [
        grupos.novos.length > 0
          ? `${grupos.novos.length} ${grupos.novos.length === 1 ? 'novo' : 'novos'}`
          : 'Nenhum novo',
        grupos.andamento.length > 0 ? `${grupos.andamento.length} em andamento` : null,
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <TelaMarquise
      refreshing={carregando}
      onRefresh={() => void carregarPedidos()}
      marquise={
        <>
          <Portaria esquerda={<SeletorLoja escuro />} />

          <Statement
            sobrelinha="Operação"
            linha="Do balcão"
            acento="à porta do cliente."
            sublinha={resumo}
          />

          <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 12 }}>
            {carregando && pedidos.length === 0 ? (
              <CartaoVivoApagado />
            ) : grupos.novos.length > 0 ? (
              grupos.novos.map((p) => (
                <CartaoPedidoVivo
                  key={p.id}
                  pedido={p}
                  aoTocar={() => router.push(`/pedido/${p.id}`)}
                  acao={{
                    rotulo: 'Confirmar pedido',
                    aoTocar: () => void confirmar(p),
                    carregando: confirmando === p.id,
                  }}
                />
              ))
            ) : (
              <CartaoVidro padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.marqueeGlassStrong,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PartnerIcon name="bell" size={17} color={colors.marqueeInkSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white }}>
                      Nenhum pedido novo
                    </Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '500',
                        color: colors.marqueeInkSoft,
                        marginTop: 2,
                      }}
                    >
                      Quando chegar, ele aparece aqui para você confirmar.
                    </Text>
                  </View>
                </View>
              </CartaoVidro>
            )}
          </View>
        </>
      }
    >
      {erro && (
        <View style={{ paddingHorizontal: 16 }}>
          <CartaoFolha>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.danger }}>
              {erro} — puxe para tentar de novo.
            </Text>
          </CartaoFolha>
        </View>
      )}

      <SecaoFolha
        sobrelinha="Confirmados, em preparo e a caminho"
        titulo="Em andamento"
        direita={<Contagem n={grupos.andamento.length} />}
      >
        {grupos.andamento.length === 0 ? (
          <CartaoFolha>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
              Nada em andamento
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 3 }}>
              Confirme um pedido novo e ele passa a viver aqui até a entrega.
            </Text>
          </CartaoFolha>
        ) : (
          <View style={{ gap: 12 }}>
            {grupos.andamento.map((p) => (
              <PedidoCard key={p.id} pedido={p} />
            ))}
          </View>
        )}
      </SecaoFolha>

      <SecaoFolha
        sobrelinha="Entregues e cancelados"
        titulo="Finalizados"
        direita={<Contagem n={grupos.finalizados.length} />}
      >
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {FILTROS_PERIODO.map((f) => (
            <Chip
              key={f.key}
              rotulo={f.rotulo}
              ativo={periodo === f.key}
              aoTocar={() => setPeriodo(f.key)}
              tamanho="sm"
            />
          ))}
        </View>
        {grupos.finalizados.length === 0 ? (
          <EmptyState
            icone="orders"
            titulo="Nada finalizado no período"
            descricao="Amplie o período para ver pedidos mais antigos."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {grupos.finalizados.map((p) => (
              <PedidoCard key={p.id} pedido={p} />
            ))}
          </View>
        )}
      </SecaoFolha>
    </TelaMarquise>
  )
}

function Contagem({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.inkSoft }}>
      {n} {n === 1 ? 'PEDIDO' : 'PEDIDOS'}
    </Text>
  )
}
