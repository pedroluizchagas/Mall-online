import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Separação de carga (docs/31-logistica-de-entrega.md §1.4).
 *
 * Mostra ao lojista o porte e as flags do pedido — calculados no checkout
 * pela cascata produto → categoria → loja — e coleta quantos volumes
 * físicos a separação gerou. O entregador confere volume a volume na
 * coleta, e o número alimenta a conferência exibida no app dele.
 */

const ROTULO_PORTE: Record<string, string> = {
  P: 'Pequeno',
  M: 'Médio',
  G: 'Grande',
  XG: 'Extra grande',
}

const DICA_PORTE: Record<string, string> = {
  P: 'Cabe em bag comum — qualquer entregador',
  M: 'Precisa de baú ou bag grande — moto ou carro',
  G: 'Só carro comporta',
  XG: 'Exige utilitário',
}

interface Props {
  pedidoId: string
  porte?: 'P' | 'M' | 'G' | 'XG' | null
  pesoG?: number | null
  refrigerada?: boolean | null
  fragil?: boolean | null
  altoValor?: boolean | null
  volumes?: number | null
  /** Só permite editar volumes enquanto o pedido está em preparo. */
  editavel: boolean
  onVolumesAtualizados?: (volumes: number) => void
}

export function CardSeparacao({
  pedidoId,
  porte,
  pesoG,
  refrigerada,
  fragil,
  altoValor,
  volumes,
  editavel,
  onVolumesAtualizados,
}: Props) {
  const { colors, radius, typography } = partnerDesign
  const [qtd, setQtd] = useState(volumes ?? 1)
  const [salvando, setSalvando] = useState(false)

  // Pedido anterior à migration de logística não tem porte calculado —
  // nesse caso o card não tem o que informar.
  if (!porte) return null

  async function alterarVolumes(delta: number) {
    const novo = Math.max(1, Math.min(99, qtd + delta))
    if (novo === qtd) return

    const anterior = qtd
    setQtd(novo)
    setSalvando(true)

    // Cast: `volumes` vem da migration de logística e ainda não está nos
    // types gerados (`pnpm types:generate` depois de aplicar as migrations).
    const { error } = await (supabase as any)
      .from('orders')
      .update({ volumes: novo })
      .eq('id', pedidoId)

    setSalvando(false)

    if (error) {
      setQtd(anterior) // rollback otimista, mesmo padrão das transições de status
      return
    }

    onVolumesAtualizados?.(novo)
  }

  const flags = [
    refrigerada ? { texto: 'Refrigerado', cor: colors.info ?? colors.warning } : null,
    fragil ? { texto: 'Frágil', cor: colors.warning } : null,
    altoValor ? { texto: 'Alto valor', cor: colors.danger } : null,
  ].filter(Boolean) as Array<{ texto: string; cor: string }>

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 14,
        gap: 12,
      }}
    >
      {/* Porte */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>
            Carga {ROTULO_PORTE[porte] ?? porte}
            {pesoG ? ` · ${(pesoG / 1000).toFixed(1)} kg` : ''}
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginTop: 2 }}>
            {DICA_PORTE[porte] ?? ''}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.ink,
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: '800' }}>{porte}</Text>
        </View>
      </View>

      {flags.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {flags.map((f) => (
            <View
              key={f.texto}
              style={{
                borderWidth: 1,
                borderColor: f.cor,
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: f.cor, fontSize: 11, fontWeight: '700' }}>{f.texto}</Text>
            </View>
          ))}
        </View>
      )}

      {altoValor && (
        <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size }}>
          Entrega deste pedido exige código de confirmação — foto não basta.
        </Text>
      )}

      {/* Volumes */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingTop: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14 }}>
            Volumes separados
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, marginTop: 2 }}>
            Quantas embalagens o entregador vai receber
          </Text>
        </View>

        {editavel ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BotaoQtd rotulo="−" onPress={() => alterarVolumes(-1)} desabilitado={qtd <= 1 || salvando} />
            <View style={{ minWidth: 28, alignItems: 'center' }}>
              {salvando ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 17 }}>{qtd}</Text>
              )}
            </View>
            <BotaoQtd rotulo="+" onPress={() => alterarVolumes(1)} desabilitado={qtd >= 99 || salvando} />
          </View>
        ) : (
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 17 }}>{qtd}</Text>
        )}
      </View>
    </View>
  )
}

function BotaoQtd({
  rotulo,
  onPress,
  desabilitado,
}: {
  rotulo: string
  onPress: () => void
  desabilitado?: boolean
}) {
  const { colors } = partnerDesign
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desabilitado}
      activeOpacity={0.7}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: desabilitado ? 0.4 : 1,
      }}
    >
      <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>{rotulo}</Text>
    </TouchableOpacity>
  )
}
