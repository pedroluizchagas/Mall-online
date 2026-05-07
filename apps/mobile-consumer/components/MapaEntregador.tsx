import MapView, { Marker } from 'react-native-maps'
import { consumerDesign } from '@/lib/consumer-design'

const { colors } = consumerDesign

interface Props {
  localizacao: { latitude: number; longitude: number }
  enderecoEntrega?: { latitude?: number; longitude?: number } | null
}

export function MapaEntregador({ localizacao, enderecoEntrega }: Props) {
  return (
    <MapView
      style={{ height: 220 }}
      region={{
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
    >
      <Marker
        coordinate={localizacao}
        title="Entregador"
        pinColor={colors.accent}
      />
      {enderecoEntrega?.latitude && enderecoEntrega?.longitude && (
        <Marker
          coordinate={{
            latitude: enderecoEntrega.latitude,
            longitude: enderecoEntrega.longitude,
          }}
          title="Destino"
          pinColor={colors.ink}
        />
      )}
    </MapView>
  )
}
