import { Text, TouchableOpacity, View } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { PartnerIcon } from '@/components/PartnerIcon'
import {
  BarraProgresso,
  CartaoVidro,
  PontoAoVivo,
  useFontesMarquee,
} from '@/components/marquise/Marquise'
import { partnerDesign, tempoRelativo } from '@/lib/partner-design'
import { metaDoStatus } from '@/lib/status-pedido'
import type { Pedido } from '@/store/usePedidosStore'

/**
 * Cartão de pedido AO VIVO — um pedido que pede a atenção do lojista, na
 * marquise (Início e Pedidos). Port do cartão ao vivo do consumer:
 * vidro fumê sobre `marquee`, ponto pulsando, status por extenso na
 * fonte-statement, barra de progresso accent.
 *
 * O que o lojista precisa a mais: quem é o cliente, há quanto tempo o
 * pedido espera, e — quando o status pede ação — o botão da ação, sem
 * abrir o detalhe (`acao`).
 */

const { colors, radius } = partnerDesign

interface Props {
  pedido: Pedido
  aoTocar: () => void
  /** Ação rápida (ex.: "Confirmar") — pílula accent no pé do cartão. */
  acao?: { rotulo: string; aoTocar: () => void; carregando?: boolean }
}

export function CartaoPedidoVivo({ pedido, aoTocar, acao }: Props) {
  const fontes = useFontesMarquee()
  const meta = metaDoStatus(pedido.status)
  const itens = (pedido.order_items ?? []).map((i) => `${i.quantidade}× ${i.nome}`).join(', ')
  const cliente = pedido.consumers?.nome ?? 'Cliente'
  const espera = tempoRelativo(pedido.criado_em)

  return (
    <CartaoVidro
      aoTocar={aoTocar}
      rotulo={`${meta.rotuloLongo}, ${cliente}, ${formatarReais(pedido.total)}. Abrir pedido`}
    >
      <View style={{ gap: 12 }}>
        {/* Sobrelinha: ao vivo · cliente · espera */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PontoAoVivo cor={meta.pedeAcao ? colors.accent : colors.marqueeInkSoft} />
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: '700',
              color: colors.marqueeInkMuted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
            numberOfLines={1}
          >
            {cliente}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accent }}>
            {espera === 'agora' ? 'agora' : `há ${espera}`}
          </Text>
        </View>

        {/* Status por extenso + o que fazer */}
        <View style={{ gap: 3 }}>
          <Text
            style={[
              fontes.statement,
              { fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: colors.white },
            ]}
            numberOfLines={1}
          >
            {meta.rotuloLongo}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.marqueeInkSoft }}>
            {meta.descricao}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BarraProgresso valor={meta.progresso} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.marqueeInkSoft }}>
            {Math.round(meta.progresso * 100)}%
          </Text>
        </View>

        {/* Rodapé: itens · total · abrir */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text
            style={{ flex: 1, fontSize: 12.5, fontWeight: '500', color: colors.marqueeInkSoft }}
            numberOfLines={1}
          >
            {itens || 'Sem itens'}
          </Text>
          <Text
            style={{ fontSize: 14, fontWeight: '800', color: colors.white, letterSpacing: -0.2 }}
          >
            {formatarReais(pedido.total)}
          </Text>
          {!acao && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.accent }}>Abrir</Text>
              <PartnerIcon name="chevron-right" size={13} color={colors.accent} strokeWidth={2.4} />
            </View>
          )}
        </View>

        {acao && (
          <TouchableOpacity
            onPress={acao.aoTocar}
            disabled={acao.carregando}
            activeOpacity={partnerDesign.opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel={acao.rotulo}
            style={{
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: acao.carregando ? partnerDesign.opacity.disabled : 1,
            }}
          >
            <PartnerIcon name="check" size={16} color={colors.ink} strokeWidth={2.4} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
              {acao.carregando ? 'Um instante…' : acao.rotulo}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </CartaoVidro>
  )
}

/** Cartão ao vivo apagado, enquanto os pedidos carregam. */
export function CartaoVivoApagado() {
  return (
    <View
      style={{
        backgroundColor: colors.marqueeGlass,
        borderWidth: 1,
        borderColor: colors.marqueeLine,
        borderRadius: radius.lg,
        padding: 18,
        gap: 12,
        minHeight: 132,
      }}
    />
  )
}
