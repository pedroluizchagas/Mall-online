import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallora/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign, formatarMomentoCurto } from '@/lib/courier-design'

const LABELS_STATUS: Record<string, string> = {
  pendente:  'Pendente',
  aceita:    'Aceita',
  coletada:  'Coletada',
  entregue:  'Entregue',
  cancelada: 'Cancelada',
}

const CORES_STATUS: Record<string, string> = {
  entregue:  courierDesign.colors.success,
  cancelada: courierDesign.colors.danger,
  aceita:    courierDesign.colors.accent,
  coletada:  courierDesign.colors.warning,
  pendente:  courierDesign.colors.inkSoft,
}

interface Entrega {
  id: string
  store_nome: string
  valor_entrega: number
  status: string
  entregue_em: string | null
  criado_em: string
}

export function EntregaHistoricoCard({ entrega }: { entrega: Entrega }) {
  const { colors, radius } = courierDesign
  const cor = CORES_STATUS[entrega.status] ?? colors.inkSoft
  const data = entrega.entregue_em ?? entrega.criado_em

  return (
    <TouchableOpacity
      onPress={() => router.push(`/entrega/${entrega.id}`)}
      activeOpacity={0.75}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: colors.canvasAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CourierIcon name="package" size={17} color={colors.inkMuted} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
            {entrega.store_nome}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>
            {formatarMomentoCurto(data)}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
          {formatarReais(entrega.valor_entrega)}
        </Text>
        <View style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.pill,
          backgroundColor: `${cor}18`,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: cor }}>
            {LABELS_STATUS[entrega.status] ?? entrega.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
