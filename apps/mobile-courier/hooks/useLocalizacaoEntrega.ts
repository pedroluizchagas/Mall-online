import { useEffect, useRef, useCallback } from 'react'
import * as Location from 'expo-location'
import { Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { LOCATION_UPDATE_INTERVAL_MS } from '@mallora/lib'

interface Opcoes {
  courierId: string
  assignmentId: string
  ativo: boolean
  onLocalizacaoAtualizada?: (coords: { latitude: number; longitude: number }) => void
}

export function useLocalizacaoEntrega({
  courierId,
  assignmentId,
  ativo,
  onLocalizacaoAtualizada,
}: Opcoes) {
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const ultimaAtualizacao = useRef<number>(0)

  const pararRastreamento = useCallback(async () => {
    if (watchRef.current) {
      watchRef.current.remove()
      watchRef.current = null
    }

    // Limpar assignment_id na localização — consumers param de ver
    await supabase
      .from('courier_locations')
      .update({ assignment_id: null, atualizado_em: new Date().toISOString() })
      .eq('courier_id', courierId)
  }, [courierId])

  const iniciarRastreamento = useCallback(async () => {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync()

    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Localização necessária',
        'Ative a permissão de localização para transmitir sua posição ao consumidor.',
        [{ text: 'OK' }]
      )
      return
    }

    // Tentar permissão em segundo plano (não bloqueia se negada)
    await Location.requestBackgroundPermissionsAsync()

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL_MS,
        distanceInterval: 10,
      },
      async (localizacao) => {
        const agora = Date.now()

        // Throttle adicional — não enviar se última atualização foi há menos de 4s
        if (agora - ultimaAtualizacao.current < 4000) return
        ultimaAtualizacao.current = agora

        const coords = {
          latitude: localizacao.coords.latitude,
          longitude: localizacao.coords.longitude,
        }

        onLocalizacaoAtualizada?.(coords)

        const { error } = await supabase
          .from('courier_locations')
          .upsert(
            {
              courier_id: courierId,
              assignment_id: assignmentId,
              latitude: coords.latitude,
              longitude: coords.longitude,
              precisao_m: localizacao.coords.accuracy ?? null,
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: 'courier_id' }
          )

        if (error) {
          console.error('Erro ao transmitir localização:', error.message)
        }
      }
    )
  }, [courierId, assignmentId, onLocalizacaoAtualizada])

  useEffect(() => {
    if (ativo) {
      iniciarRastreamento()
    } else {
      pararRastreamento()
    }

    return () => {
      pararRastreamento()
    }
  }, [ativo])

  return { pararRastreamento }
}
