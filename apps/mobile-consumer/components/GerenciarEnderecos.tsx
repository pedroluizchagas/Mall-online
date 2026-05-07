import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Endereco, Json } from '@mallora/types'
import { Card } from '@/components/ui/Card'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

interface Props {
  enderecos: Endereco[]
  onAtualizar: (novos: Endereco[]) => void
}

export function GerenciarEnderecos({ enderecos, onAtualizar }: Props) {
  const [removendo, setRemovendo] = useState<number | null>(null)

  async function handleRemover(indice: number) {
    Alert.alert('Remover endereço', 'Deseja remover este endereço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setRemovendo(indice)

          const novos = enderecos.filter((_, i) => i !== indice)
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            await supabase
              .from('consumers')
              .update({ enderecos: novos as unknown as Json })
              .eq('user_id', user.id)
          }

          onAtualizar(novos)
          setRemovendo(null)
        },
      },
    ])
  }

  if (enderecos.length === 0) {
    return (
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Card preenchimento="md" sombra="none">
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <ConsumerIcon name="pin" size={20} color={colors.accent} />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.ink,
              }}
            >
              Nenhum endereço salvo
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.inkMuted,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              Adicione um endereço ao fazer seu próximo pedido.
            </Text>
          </View>
        </Card>
      </View>
    )
  }

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 8 }}>
      {enderecos.map((end, i) => (
        <Card key={i} preenchimento="md" sombra="none">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
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
              <ConsumerIcon name="pin" size={16} color={colors.accent} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.ink,
                }}
              >
                {end.apelido ?? end.rua}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.inkMuted,
                  fontWeight: '500',
                }}
                numberOfLines={1}
              >
                {end.rua}, {end.numero}
                {end.complemento ? ` — ${end.complemento}` : ''}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.inkSoft,
                  fontWeight: '500',
                }}
                numberOfLines={1}
              >
                {end.bairro} — {end.cidade}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleRemover(i)}
              disabled={removendo === i}
              activeOpacity={consumerDesign.opacity.pressedSoft}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: softColor(colors.danger),
                opacity: removendo === i ? consumerDesign.opacity.disabled : 1,
              }}
            >
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {removendo === i ? '...' : 'Remover'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </View>
  )
}
