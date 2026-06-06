import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatarReais } from '@mallevo/lib'
import { HeaderTela } from '@/components/HeaderTela'
import { Botao } from '@/components/ui/Botao'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

interface PixOrder {
  id: string
  total: number
  payment_status: string
  pagarme_qr_code: string | null
  pagarme_qr_code_url: string | null
  pagarme_qr_code_expires_at: string | null
}

export default function TelaCheckoutPix() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>()
  const [pedido, setPedido] = useState<PixOrder | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!order_id) {
      setErro('Pedido não informado.')
      setCarregando(false)
      return
    }

    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, total, payment_status, pagarme_qr_code, pagarme_qr_code_url, pagarme_qr_code_expires_at'
        )
        .eq('id', order_id!)
        .single()

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setPedido(data as PixOrder)
      }
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [order_id])

  useEffect(() => {
    if (!order_id) return

    const canal = supabase
      .channel(`pedido-pix-${order_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order_id}`,
        },
        (payload) => {
          const novo = payload.new as PixOrder
          setPedido((prev) => (prev ? { ...prev, ...novo } : prev))

          if (novo.payment_status === 'pago') {
            router.replace(`/pedido/${order_id}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [order_id])

  async function compartilharCodigo() {
    if (!pedido?.pagarme_qr_code) return
    try {
      await Share.share({ message: pedido.pagarme_qr_code })
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível compartilhar.')
    }
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <LoadingState modo="tela" mensagem="Gerando seu Pix..." />
      </View>
    )
  }

  if (erro || !pedido) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <HeaderTela variante="voltar" titulo="Pagamento via Pix" />
        <EmptyState
          icone="info"
          titulo="Não foi possível abrir o pagamento"
          descricao={erro ?? 'Pedido não encontrado.'}
          acao={{
            label: 'Voltar ao início',
            aoTocar: () => router.replace('/'),
          }}
        />
      </View>
    )
  }

  const aguardandoQr = !pedido.pagarme_qr_code_url || !pedido.pagarme_qr_code

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HeaderTela variante="voltar" titulo="Pagamento via Pix" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* QR code central */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Card preenchimento="lg">
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.inkSoft,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  Total a pagar
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: colors.ink,
                    letterSpacing: -0.5,
                  }}
                >
                  {formatarReais(pedido.total)}
                </Text>
              </View>

              {aguardandoQr ? (
                <View
                  style={{
                    width: 240,
                    height: 240,
                    backgroundColor: colors.canvasAlt,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <ActivityIndicator size="large" color={colors.ink} />
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.inkMuted,
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                  >
                    Aguardando QR Code...
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: pedido.pagarme_qr_code_url! }}
                  style={{
                    width: 240,
                    height: 240,
                    backgroundColor: colors.white,
                    borderRadius: radius.md,
                  }}
                  resizeMode="contain"
                />
              )}

              <Text
                style={{
                  fontSize: 13,
                  color: colors.inkMuted,
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: 18,
                }}
              >
                Aponte o app do seu banco para o QR Code ou copie o código
                abaixo.
              </Text>
            </View>
          </Card>
        </View>

        {/* Pix copia e cola */}
        {!aguardandoQr && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.inkMuted,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 12,
                paddingHorizontal: 8,
              }}
            >
              Pix Copia e Cola
            </Text>
            <Card preenchimento="md">
              <View style={{ gap: 12 }}>
                <Text
                  selectable
                  style={{
                    fontSize: 12,
                    color: colors.ink,
                    fontFamily:
                      'monospace',
                    backgroundColor: colors.canvasAlt,
                    padding: 12,
                    borderRadius: radius.sm,
                    fontWeight: '500',
                  }}
                >
                  {pedido.pagarme_qr_code}
                </Text>
                <Botao
                  label="Copiar / Compartilhar código"
                  variante="primario"
                  tamanho="md"
                  iconeEsquerda="send"
                  onPress={compartilharCodigo}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Status de aguardando pagamento */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Card preenchimento="md">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon
                  name="clock"
                  size={18}
                  color={colors.accent}
                />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: colors.ink,
                  fontWeight: '500',
                  lineHeight: 18,
                }}
              >
                Aguardando confirmação do pagamento. Esta tela atualiza
                automaticamente.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}
