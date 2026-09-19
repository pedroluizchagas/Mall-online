import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { tokenizarCartao } from '@/lib/pagarme'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrderStore } from '@/store/useOrderStore'
import { formatarReais } from '@mallevo/lib'
import { ItemCarrinhoCard, formatarAgendamento } from '@/components/ItemCarrinhoCard'
import { SeletorEndereco } from '@/components/SeletorEndereco'
import { SeletorPagamento } from '@/components/SeletorPagamento'
import { SeletorParcelas } from '@/components/SeletorParcelas'
import {
  FormularioCartao,
  type DadosCartao,
} from '@/components/FormularioCartao'
import { GlowNeon, useFontesMarquee } from '@/components/home/Marquise'
import { VidroFosco } from '@/components/home/VidroFosco'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { TijoloLoja } from '@/components/TijoloLoja'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { consumerDesign } from '@/lib/consumer-design'
import { useLuzDoDia } from '@/lib/luz-do-dia'
import { usePreferencias } from '@/store/usePreferencias'
import { enderecoPadrao } from '@/lib/enderecos'
import { distanciaMetros, obterLocalizacaoAtual } from '@/lib/localizacao'
import type { Endereco } from '@mallevo/types'

/**
 * Checkout ("Seu pedido") — a mesma arquitetura do Início: MARQUISE escura
 * com a identidade do pedido (a loja, com a própria pele no tijolo, o que
 * vai e a promessa de entrega acesa em accent), FOLHA clara (vidro fosco +
 * luz do dia) com itens, endereço, pagamento, observações e resumo em
 * letreiros da casa (`SecaoFolha`). CTA flutuante no pé.
 *
 * Toda a lógica de pagamento (gateway-only, aviso de distância, trava de
 * reentrada, fluxos cartão/Pix) é a mesma de antes.
 *
 * Spec: docs/system-design/consumer/07-telas.md §9
 */

const { colors, radius, shadow } = consumerDesign

// Gateway-only (política Mallevo): pagamento sempre via Pagar.me.
// Dinheiro/maquininha removidos do mobile + storefront. As flags
// `aceita_dinheiro`/`aceita_cartao_maquininha` permanecem no schema mas
// são ignoradas pelos consumer-facing apps.
type FormaPagamento = 'online_cartao' | 'online_pix'

/**
 * A partir de quanto vale perguntar "você está longe deste endereço?".
 *
 * 2 km fica acima do raio de um bairro (pedir do trabalho para a casa na
 * mesma região não incomoda) e bem abaixo de "outra cidade". O que se quer
 * pegar é a troca de endereço esquecida: quem se mudou, quem estava na casa
 * dos pais no último pedido, quem tem o endereço do trabalho como padrão e
 * está pedindo de casa num domingo.
 */
const LIMIAR_DISTANCIA_M = 2000

export default function TelaCheckout() {
  const insets = useSafeAreaInsets()
  const {
    itens,
    store_id,
    store_nome,
    store_taxa_entrega,
    subtotal,
    total,
    limparCarrinho,
  } = useCartStore()

  const ehAgendamento = itens.some((i) => !!i.agendamento)
  const itemAgendamento = itens.find((i) => !!i.agendamento)

  const { consumer } = useAuthStore()
  const { setPedidoAtivo } = useOrderStore()
  const fontes = useFontesMarquee()
  const luzAtiva = usePreferencias((s) => s.luzDoDia)
  const luz = useLuzDoDia(luzAtiva)

  const [loja, setLoja] = useState<any>(null)
  const [enderecoSelecionado, setEnderecoSelecionado] =
    useState<Endereco | null>(null)
  const [formaPagamento, setFormaPagamento] =
    useState<FormaPagamento>('online_cartao')
  const [installments, setInstallments] = useState(1)
  const [dadosCartao, setDadosCartao] = useState<DadosCartao | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [processando, setProcessando] = useState(false)
  const [etapa, setEtapa] = useState<'revisao' | 'processando' | 'concluido'>(
    'revisao'
  )
  /**
   * O aviso de distância pergunta no máximo uma vez por endereço escolhido.
   * Ref e não state: mudá-lo não deve repintar a tela, e o valor precisa
   * estar atualizado já na chamada recursiva de `handleFazerPedido`.
   */
  const confirmouDistancia = useRef(false)
  /** Trava de reentrada do botão de pagar — ver handleFazerPedido. */
  const enviando = useRef(false)

  useEffect(() => {
    if (!store_id) {
      router.back()
      return
    }

    async function carregarLoja() {
      const { data } = await supabase
        .from('stores')
        .select(
          'id, nome, taxa_entrega, tempo_entrega, aceita_pix, aceita_cartao_online, logo_url, theme'
        )
        .eq('id', store_id!)
        .single()

      setLoja(data)

      // Gateway-only: default cartão; se a loja não aceita, cai em Pix;
      // se nem isso, mantém `online_cartao` (SeletorPagamento renderiza
      // "Nenhuma forma disponível" e o CTA é bloqueado por validar()).
      if (data?.aceita_cartao_online) {
        setFormaPagamento('online_cartao')
      } else if (data?.aceita_pix) {
        setFormaPagamento('online_pix')
      } else {
        setFormaPagamento('online_cartao')
      }
    }

    carregarLoja()
  }, [store_id])

  // Efeito separado do carregamento da loja porque depende dos endereços:
  // se o perfil ainda estava hidratando quando o checkout abriu (ou falhou
  // e só chegou depois), a lista muda e o padrão precisa ser escolhido
  // então — senão a tela fica sem endereço e pede um que o usuário já tem.
  // Só age enquanto nada foi escolhido: nunca sobrescreve a escolha manual.
  useEffect(() => {
    if (enderecoSelecionado) return
    const padrao = enderecoPadrao(consumer?.enderecos ?? [])
    if (padrao) setEnderecoSelecionado(padrao)
  }, [consumer?.enderecos, enderecoSelecionado])

  useEffect(() => {
    if (formaPagamento !== 'online_cartao') {
      setInstallments(1)
    }
  }, [formaPagamento])

  function validar(): string | null {
    if (itens.length === 0) return 'Carrinho vazio.'
    if (!ehAgendamento && !enderecoSelecionado) {
      return 'Selecione um endereço de entrega.'
    }
    if (!formaPagamento) return 'Selecione uma forma de pagamento.'
    if (formaPagamento === 'online_cartao' && !dadosCartao) {
      return 'Preencha os dados do cartão.'
    }
    return null
  }

  /**
   * Avisa quando o endereço de entrega está longe de onde o usuário está.
   *
   * Devolve `true` se o pedido deve PARAR e esperar a resposta do diálogo.
   * Qualquer coisa que impeça a comparação — sem permissão, sem GPS, sem
   * coordenada no endereço, timeout — devolve `false` e o pagamento segue:
   * esta é uma cortesia, nunca um bloqueio de venda.
   */
  async function pausarPorDistancia(): Promise<boolean> {
    if (ehAgendamento) return false
    if (confirmouDistancia.current) return false

    const destino = enderecoSelecionado
    if (!destino?.latitude || !destino?.longitude) return false

    const atual = await obterLocalizacaoAtual()
    if (!atual) return false

    const metros = distanciaMetros(atual, {
      latitude: destino.latitude,
      longitude: destino.longitude,
    })
    if (metros <= LIMIAR_DISTANCIA_M) return false

    const km = (metros / 1000).toFixed(1).replace('.', ',')

    Alert.alert(
      'Você está longe deste endereço',
      `Sua localização atual está a cerca de ${km} km de "${
        destino.apelido ?? destino.rua
      }".\n\nConfirma a entrega neste endereço?`,
      [
        { text: 'Revisar endereço', style: 'cancel' },
        {
          text: 'Confirmar entrega',
          onPress: () => {
            confirmouDistancia.current = true
            handleFazerPedido()
          },
        },
      ]
    )
    return true
  }

  async function handleFazerPedido() {
    // Trava de reentrada SÍNCRONA. `processando` é state e só desabilita o
    // botão no próximo render — entre o toque e esse render cabe outro
    // toque, e daí saem duas cobranças. A checagem de distância pode
    // esperar até 5s pelo GPS, o que escancara essa janela.
    if (enviando.current) return
    enviando.current = true

    const erro = validar()
    if (erro) {
      Alert.alert('Atenção', erro)
      enviando.current = false
      return
    }

    // O botão já entra em carregando: a espera pelo GPS não pode parecer
    // que o toque não funcionou.
    setProcessando(true)

    // Antes de qualquer cobrança: o endereço é mesmo este?
    if (await pausarPorDistancia()) {
      setProcessando(false)
      enviando.current = false
      return
    }

    setEtapa('processando')

    try {
      if (formaPagamento === 'online_cartao') {
        await fluxoCartao()
      } else {
        await fluxoPix()
      }
      // Sucesso não destrava: a tela já navegou para o pedido, e um toque
      // atrasado não pode disparar uma segunda cobrança.
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível processar o pedido.')
      setProcessando(false)
      setEtapa('revisao')
      enviando.current = false
    }
  }

  async function obterSessaoOuFalhar() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada. Faça login novamente.')
    return session
  }

  function payloadBase() {
    return {
      store_id,
      itens: itens.map((i) => ({
        product_id: i.product_id,
        nome: i.nome,
        preco: i.preco,
        quantidade: i.quantidade,
        observacoes: i.observacoes,
        modifiers:
          i.modifiers && i.modifiers.length > 0
            ? i.modifiers.map((m) => ({ modifier_id: m.modifier_id }))
            : [],
        variant_id: i.variant?.variant_id ?? null,
        agendamento: i.agendamento
          ? {
              inicio_at: i.agendamento.inicio_at,
              fim_at: i.agendamento.fim_at,
              staff_id: i.agendamento.staff_id,
            }
          : null,
      })),
      endereco_entrega: ehAgendamento ? null : enderecoSelecionado,
      observacoes: observacoes.trim() || undefined,
    }
  }

  async function chamarCreatePagarmeOrder(body: Record<string, unknown>) {
    const session = await obterSessaoOuFalhar()
    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-pagarme-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    )
    const resultado = await resposta.json()
    if (!resposta.ok) throw new Error(resultado.error ?? 'Erro no servidor.')
    return resultado as {
      order_id: string
      status?: string
      qr_code?: string
      qr_code_url?: string
    }
  }

  async function fluxoCartao() {
    if (!dadosCartao) throw new Error('Dados do cartão ausentes.')

    const token = await tokenizarCartao(dadosCartao)
    setDadosCartao(null)

    const resultado = await chamarCreatePagarmeOrder({
      ...payloadBase(),
      forma_pagamento: 'online_cartao',
      card_token: token.id,
      installments,
    })

    limparCarrinho()
    setPedidoAtivo(resultado.order_id)
    setEtapa('concluido')
    router.replace(`/pedido/${resultado.order_id}`)
  }

  async function fluxoPix() {
    const resultado = await chamarCreatePagarmeOrder({
      ...payloadBase(),
      forma_pagamento: 'online_pix',
    })

    limparCarrinho()
    setPedidoAtivo(resultado.order_id)
    setEtapa('concluido')
    router.replace(`/checkout/pix?order_id=${resultado.order_id}`)
  }


  if (etapa === 'processando') {
    return (
      <LoadingState
        modo="tela"
        variante="escuro"
        mensagem="Processando seu pedido..."
      />
    )
  }

  const qtdTotal = itens.reduce((a, i) => a + i.quantidade, 0)
  const freteGratis = store_taxa_entrega === 0

  const marquise = (
    <View
      style={{
        backgroundColor: colors.marquee,
        paddingTop: insets.top + 10,
        // 24 extras ficam escondidos atrás da folha que sobe por cima.
        paddingBottom: 48,
        overflow: 'hidden',
      }}
    >
      <GlowNeon />
      <View style={{ paddingHorizontal: 24 }}>
        <BotaoVoltar />

        <Text style={[estilos.microMudo, { marginTop: 24 }]}>Seu pedido em</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 }}>
          <TijoloLoja
            nome={store_nome ?? 'Loja'}
            logoUrl={loja?.logo_url}
            theme={loja?.theme}
            tamanho={52}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                fontes.statement,
                { fontSize: 24, lineHeight: 28, color: colors.white, letterSpacing: -0.5 },
              ]}
              numberOfLines={2}
            >
              {store_nome}
            </Text>
            {itens.length > 0 && (
              <Text
                style={{ fontSize: 13.5, fontWeight: '500', color: colors.marqueeInkSoft, marginTop: 3 }}
                numberOfLines={1}
              >
                {qtdTotal} {qtdTotal === 1 ? 'item' : 'itens'}
                {ehAgendamento
                  ? ' · atendimento na loja'
                  : ` · ${freteGratis ? 'Frete grátis' : `Frete ${formatarReais(store_taxa_entrega)}`}`}
              </Text>
            )}
          </View>
        </View>

        {/* A promessa acesa: quanto tempo até chegar. */}
        {!ehAgendamento && itens.length > 0 && loja?.tempo_entrega ? (
          <Text
            style={[
              fontes.acento,
              { fontSize: 20, lineHeight: 26, color: colors.accent, letterSpacing: -0.3, marginTop: 16 },
            ]}
          >
            chega em cerca de {loja.tempo_entrega} min.
          </Text>
        ) : null}
      </View>
    </View>
  )

  if (itens.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="light" animated />
        {marquise}
        <View style={{ flex: 1, marginTop: -24, backgroundColor: colors.canvas, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, overflow: 'hidden' }}>
          <VidroFosco luz={luz} />
          <EmptyState
            icone="bag"
            titulo="Carrinho vazio"
            descricao="Adicione itens para fazer um pedido."
            acao={{
              label: 'Voltar às lojas',
              aoTocar: () => router.back(),
            }}
          />
        </View>
      </View>
    )
  }

  const labelBotao = (() => {
    if (ehAgendamento) {
      return `Confirmar agendamento — ${formatarReais(total())}`
    }
    if (formaPagamento === 'online_cartao') {
      return `Pagar ${formatarReais(total())} em ${installments}×`
    }
    return `Gerar Pix de ${formatarReais(total())}`
  })()

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" animated />

      {/* Céu atrás do overscroll superior (iOS rubber-band). */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420, backgroundColor: colors.marquee }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {marquise}

        {/* ── Folha ── */}
        <View
          style={{
            flex: 1,
            marginTop: -24,
            backgroundColor: colors.canvas,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingTop: 30,
            paddingBottom: 140 + insets.bottom,
            overflow: 'hidden',
            gap: 28,
          }}
        >
          <VidroFosco luz={luz} />

          {/* Itens */}
          <SecaoFolha
            sobrelinha="O que vai"
            titulo="Seus itens"
            direita={
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.inkSoft }}>
                {qtdTotal} {qtdTotal === 1 ? 'ITEM' : 'ITENS'}
              </Text>
            }
          >
            <CartaoFolha padding={0}>
              {itens.map((item, idx) => (
                <ItemCarrinhoCard
                  key={item.linha_id}
                  item={item}
                  ultimo={idx === itens.length - 1}
                />
              ))}
            </CartaoFolha>
          </SecaoFolha>

          {ehAgendamento && itemAgendamento?.agendamento && (
            <SecaoFolha sobrelinha="Quando" titulo="Seu horário">
              <CartaoFolha>
                <LinhaIcone
                  icone="clock"
                  texto={formatarAgendamento(itemAgendamento.agendamento)}
                  forte
                />
                <LinhaIcone icone="store" texto={`${store_nome} · atendimento no estabelecimento`} />
              </CartaoFolha>
            </SecaoFolha>
          )}

          {!ehAgendamento && (
            <SeletorEndereco
              enderecos={consumer?.enderecos ?? []}
              selecionado={enderecoSelecionado}
              onSelecionar={(end) => {
                setEnderecoSelecionado(end)
                // Endereço novo, pergunta nova: a confirmação valia para o
                // anterior.
                confirmouDistancia.current = false
              }}
            />
          )}

          {loja && (
            <SeletorPagamento
              loja={loja}
              selecionado={formaPagamento}
              onSelecionar={setFormaPagamento}
            />
          )}

          {formaPagamento === 'online_cartao' && (
            <>
              <FormularioCartao onChange={setDadosCartao} />
              <SeletorParcelas
                total={total()}
                selecionado={installments}
                onSelecionar={setInstallments}
              />
            </>
          )}

          <SecaoFolha sobrelinha="Algum recado?" titulo="Observações">
            <Input
              rotulo="Para a loja ou o entregador (opcional)"
              valor={observacoes}
              aoMudar={setObservacoes}
              placeholder="Ex: interfone 201, deixar com porteiro..."
              multilinha
              maxLength={200}
            />
          </SecaoFolha>

          {/* Resumo */}
          <SecaoFolha sobrelinha="Fechando a conta" titulo="Resumo">
            <CartaoFolha>
              <View style={{ gap: 8 }}>
                <LinhaResumo
                  rotulo={`Subtotal (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})`}
                  valor={formatarReais(subtotal())}
                />
                {!ehAgendamento && (
                  <LinhaResumo
                    rotulo="Taxa de entrega"
                    valor={freteGratis ? 'Grátis' : formatarReais(store_taxa_entrega)}
                    valorAccent={freteGratis}
                  />
                )}
                <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
                <LinhaResumo rotulo="Total" valor={formatarReais(total())} destacado />
              </View>
            </CartaoFolha>
          </SecaoFolha>
        </View>
      </ScrollView>

      {/* CTA flutuante — surface sem risco, só sombra. */}
      <View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
          },
          shadow.floating,
        ]}
      >
        <Botao
          label={labelBotao}
          onPress={handleFazerPedido}
          variante="primario"
          tamanho="lg"
          iconeDireita={formaPagamento === 'online_pix' ? 'phone' : 'check'}
          carregando={processando}
        />
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças
// ─────────────────────────────────────────────────────────

function BotaoVoltar() {
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name="chevron-left" size={18} color={colors.white} strokeWidth={2.2} />
    </TouchableOpacity>
  )
}

function LinhaIcone({
  icone,
  texto,
  forte = false,
}: {
  icone: ConsumerIconName
  texto: string
  forte?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
      <ConsumerIcon name={icone} size={16} color={forte ? colors.ink : colors.inkMuted} strokeWidth={2} />
      <Text
        style={{
          flex: 1,
          fontSize: forte ? 14.5 : 13.5,
          fontWeight: forte ? '700' : '500',
          color: forte ? colors.ink : colors.inkMuted,
        }}
      >
        {texto}
      </Text>
    </View>
  )
}

function LinhaResumo({
  rotulo,
  valor,
  destacado,
  valorAccent,
}: {
  rotulo: string
  valor: string
  destacado?: boolean
  valorAccent?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{
          fontSize: destacado ? 16 : 14,
          fontWeight: destacado ? '800' : '500',
          color: destacado ? colors.ink : colors.inkMuted,
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          fontSize: destacado ? 16 : 14,
          fontWeight: destacado ? '800' : '600',
          color: valorAccent ? colors.success : colors.ink,
        }}
      >
        {valor}
      </Text>
    </View>
  )
}

const estilos = {
  microMudo: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
}
