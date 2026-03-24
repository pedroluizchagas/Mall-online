# 21 — Entregador — Localização em Tempo Real

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

Este arquivo detalha toda a arquitetura de rastreamento GPS do
entregador: como a posição é coletada, transmitida, armazenada e
consumida pelos outros atores (consumidor e lojista) em tempo real.

O rastreamento é ativado ao aceitar uma entrega e desativado ao
confirmar a entrega. A posição é transmitida a cada 5 segundos via
UPSERT no Supabase, que por sua vez propaga via Realtime para os
assinantes do canal.

-----

## ARQUITETURA DO RASTREAMENTO

```
App do entregador
  Expo Location (watchPositionAsync)
  → coords a cada 5s ou 10m de deslocamento
        ↓
  Supabase UPSERT
  courier_locations { courier_id, assignment_id, lat, lng }
        ↓
  Supabase Realtime (broadcast)
        ↓
        ├── App do consumidor
        │     subscribe no canal do courier_id do seu pedido ativo
        │     atualiza marker no mapa
        │
        └── Dashboard do lojista
              subscribe no canal do courier_id do pedido ativo
              atualiza mini-mapa
```

-----

## HOOK DE LOCALIZACAO

O rastreamento é encapsulado em um hook reutilizável que pode ser
usado em qualquer tela que precise transmitir a posição.

### hooks/useLocalizacaoEntrega.ts

```typescript
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
    // Solicitar permissão de localização
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
        distanceInterval: 10,         // mínimo 10m de deslocamento
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

        // Transmitir para Supabase
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
```

-----

## USO DO HOOK NA TELA DE ENTREGA ATIVA

O hook substitui a lógica manual de `watchPositionAsync` da tela
`ativa.tsx` do arquivo 20. A integração fica:

```typescript
// app/(tabs)/ativa.tsx — trecho relevante

import { useLocalizacaoEntrega } from '@/hooks/useLocalizacaoEntrega'

export default function TelaEntregaAtiva() {
  const { ativa } = useEntregaStore()
  const { courier } = useAuthStore()
  const [locAtual, setLocAtual] = useState<{ latitude: number; longitude: number } | null>(null)

  useLocalizacaoEntrega({
    courierId: courier?.id ?? '',
    assignmentId: ativa?.assignment_id ?? '',
    ativo: !!ativa && !!courier?.id,
    onLocalizacaoAtualizada: setLocAtual,
  })

  // resto do componente...
}
```

-----

## STORE DE LOCALIZACAO

### store/useLocalizacaoStore.ts

Estado local da localização atual do entregador, usado para
atualizar o mapa na tela de entrega ativa.

```typescript
import { create } from 'zustand'

interface Coordenadas {
  latitude: number
  longitude: number
  precisao_m?: number
  atualizado_em?: string
}

interface LocalizacaoState {
  coordenadas: Coordenadas | null
  transmitindo: boolean
  erro: string | null
  setCoordenadas: (coords: Coordenadas) => void
  setTransmitindo: (v: boolean) => void
  setErro: (erro: string | null) => void
  limpar: () => void
}

export const useLocalizacaoStore = create<LocalizacaoState>((set) => ({
  coordenadas: null,
  transmitindo: false,
  erro: null,
  setCoordenadas: (coordenadas) => set({ coordenadas }),
  setTransmitindo: (transmitindo) => set({ transmitindo }),
  setErro: (erro) => set({ erro }),
  limpar: () => set({ coordenadas: null, transmitindo: false, erro: null }),
}))
```

-----

## CONSUMO NO APP DO CONSUMIDOR

### hooks/useLocalizacaoCourier.ts (apps/mobile-consumer)

Hook que o app do consumidor usa para receber a posição do
entregador em tempo real. Retorna as coordenadas atualizadas via
Supabase Realtime.

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Coordenadas {
  latitude: number
  longitude: number
}

export function useLocalizacaoCourier(courierId: string | null | undefined) {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null)
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    if (!courierId) {
      setCoordenadas(null)
      return
    }

    // Buscar posição atual
    supabase
      .from('courier_locations')
      .select('latitude, longitude, assignment_id')
      .eq('courier_id', courierId)
      .single()
      .then(({ data }) => {
        // Só exibir se há entrega ativa (assignment_id preenchido)
        if (data?.assignment_id) {
          setCoordenadas({
            latitude: data.latitude,
            longitude: data.longitude,
          })
          setAtivo(true)
        }
      })

    // Assinar atualizações em tempo real
    const canal = supabase
      .channel(`consumer-loc-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          // Se assignment_id foi limpo, entrega concluída — parar de exibir
          if (!payload.new.assignment_id) {
            setCoordenadas(null)
            setAtivo(false)
            return
          }

          setCoordenadas({
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          })
          setAtivo(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [courierId])

  return { coordenadas, ativo }
}
```

### Uso na tela de acompanhamento do consumidor

```typescript
// app/pedido/[id].tsx — trecho relevante

import { useLocalizacaoCourier } from '@/hooks/useLocalizacaoCourier'

export default function TelaAcompanhamento() {
  const [pedido, setPedido] = useState<any>(null)

  const courierId = pedido?.delivery_assignments?.[0]?.courier_id
  const { coordenadas, ativo } = useLocalizacaoCourier(courierId)

  return (
    <View>
      {/* Mapa — exibido apenas quando entregador está em rota */}
      {ativo && coordenadas && (
        <MapView
          style={{ height: 220 }}
          region={{
            latitude: coordenadas.latitude,
            longitude: coordenadas.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
        >
          <Marker
            coordinate={coordenadas}
            title="Entregador"
            pinColor="#1A4D3A"
          />
          {pedido?.endereco_entrega?.latitude && (
            <Marker
              coordinate={{
                latitude: pedido.endereco_entrega.latitude,
                longitude: pedido.endereco_entrega.longitude,
              }}
              title="Seu endereço"
              pinColor="#F5A623"
            />
          )}
        </MapView>
      )}
    </View>
  )
}
```

-----

## CONSUMO NO DASHBOARD DO LOJISTA

### components/dashboard/mapa-entregador-mini.tsx

O mini-mapa do dashboard usa o mesmo padrão de Realtime, mas
é implementado como componente React (web) com link para Google Maps
em vez de mapa embutido (para evitar custo de API no MVP).

A versão completa está no arquivo 12. O hook equivalente para
o dashboard web:

```typescript
// hooks/useLocalizacaoCourierDashboard.ts (apps/web)

'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Coordenadas {
  latitude: number
  longitude: number
}

export function useLocalizacaoCourierDashboard(
  courierId: string | null | undefined
) {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!courierId) return

    // Buscar posição atual
    supabase
      .from('courier_locations')
      .select('latitude, longitude, assignment_id')
      .eq('courier_id', courierId)
      .single()
      .then(({ data }) => {
        if (data?.assignment_id) {
          setCoordenadas({ latitude: data.latitude, longitude: data.longitude })
        }
      })

    const canal = supabase
      .channel(`dashboard-loc-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          if (!payload.new.assignment_id) {
            setCoordenadas(null)
            return
          }
          setCoordenadas({
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [courierId])

  return { coordenadas }
}
```

-----

## MAPA COMPLETO NO APP DO CONSUMIDOR

Para o MVP, o mapa exibe apenas o marcador do entregador e o
marcador do destino. Em versões futuras pode incluir a rota
desenhada via Google Directions API.

### components/MapaEntregador.tsx (apps/mobile-consumer)

```typescript
import { View, Text, TouchableOpacity, Linking } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { useLocalizacaoCourier } from '@/hooks/useLocalizacaoCourier'

interface Props {
  courierId: string
  enderecoEntrega?: {
    latitude?: number
    longitude?: number
    rua?: string
    numero?: string
  }
  nomeEntregador?: string
}

export function MapaEntregador({ courierId, enderecoEntrega, nomeEntregador }: Props) {
  const { coordenadas, ativo } = useLocalizacaoCourier(courierId)

  if (!ativo || !coordenadas) {
    return (
      <View className="bg-gray-100 rounded-2xl h-44 items-center justify-center">
        <Text className="text-gray-400 text-sm">
          Aguardando localização do entregador...
        </Text>
      </View>
    )
  }

  const linkMaps =
    `https://maps.google.com/?q=${coordenadas.latitude},${coordenadas.longitude}`

  return (
    <View className="rounded-2xl overflow-hidden">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ height: 200 }}
        region={{
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        {/* Marcador do entregador */}
        <Marker
          coordinate={coordenadas}
          title={nomeEntregador ?? 'Entregador'}
        />

        {/* Marcador do destino */}
        {enderecoEntrega?.latitude && enderecoEntrega?.longitude && (
          <Marker
            coordinate={{
              latitude: enderecoEntrega.latitude,
              longitude: enderecoEntrega.longitude,
            }}
            title="Seu endereço"
            pinColor="#F5A623"
          />
        )}
      </MapView>

      {/* Overlay com indicador ao vivo + link */}
      <View className="absolute top-3 right-3 bg-[#1A4D3A]/90 px-3 py-1.5
        rounded-full flex-row items-center gap-1.5">
        <View className="w-2 h-2 rounded-full bg-[#4CAF82] animate-pulse" />
        <Text className="text-white text-xs font-semibold">Ao vivo</Text>
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL(linkMaps)}
        className="absolute bottom-3 right-3 bg-white px-3 py-1.5
          rounded-full shadow"
        activeOpacity={0.75}
      >
        <Text className="text-[#1A4D3A] text-xs font-semibold">
          Abrir no Maps
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

-----

## POLITICA RLS — COURIER_LOCATIONS

A política garante que o consumidor só enxerga a localização
enquanto há entrega ativa. Quando `assignment_id` é limpo ao
finalizar a entrega, a posição fica invisível para o consumidor.

```sql
-- Consumidor vê apenas localização com entrega ativa para ele
-- (já definido no arquivo 05, reproduzido aqui para clareza)

CREATE POLICY "locations_select_consumidor"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM delivery_assignments da
      JOIN orders o ON o.id = da.order_id
      WHERE da.courier_id = courier_locations.courier_id
        AND da.id = courier_locations.assignment_id
        AND da.status IN ('aceita', 'coletada')
        AND o.consumer_id = my_consumer_id()
    )
  );
```

-----

## HABILITAR REALTIME NA TABELA

O Supabase não habilita Realtime em todas as tabelas por padrão.
É necessário habilitar explicitamente:

```sql
-- Habilitar Realtime para courier_locations
ALTER PUBLICATION supabase_realtime ADD TABLE courier_locations;
```

Ou via Dashboard:

```
Supabase Dashboard
  → Database
  → Replication
  → Tables
  → Habilitar courier_locations
```

-----

## TRATAMENTO DE ERROS E CASOS ESPECIAIS

### GPS indisponível

```typescript
// Dentro do watchPositionAsync callback
async (localizacao) => {
  // coords.accuracy acima de 100m indica GPS ruim
  if (localizacao.coords.accuracy && localizacao.coords.accuracy > 100) {
    console.warn('Precisão de GPS baixa:', localizacao.coords.accuracy)
    // Transmitir mesmo assim — melhor posição imprecisa que nenhuma
  }
  // ... resto do código
}
```

### Reconexão após perda de rede

O Supabase Realtime se reconecta automaticamente após queda de
conexão. O entregador pode precisar de lógica de retry no
upload da localização:

```typescript
async function transmitirComRetry(
  courierId: string,
  assignmentId: string,
  coords: { latitude: number; longitude: number },
  tentativas = 3
): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    const { error } = await supabase
      .from('courier_locations')
      .upsert(
        {
          courier_id: courierId,
          assignment_id: assignmentId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'courier_id' }
      )

    if (!error) return

    // Aguardar antes de tentar novamente (backoff exponencial)
    if (i < tentativas - 1) {
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }

  console.error('Falha ao transmitir localização após', tentativas, 'tentativas')
}
```

### App em segundo plano (iOS)

No iOS, a localização em segundo plano requer configuração adicional.
O modo `UIBackgroundModes: ['location']` no `app.json` permite que
o app continue rastreando quando minimizado.

Para Android, o `isAndroidForegroundServiceEnabled: true` mantém
um serviço em primeiro plano visível na barra de notificações.

### Bateria e performance

```typescript
// Configuração balanceada para economizar bateria sem perder precisão
const OPCOES_LOCATION: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,  // Não usar High em produção
  timeInterval: LOCATION_UPDATE_INTERVAL_MS,  // 5000ms
  distanceInterval: 10,                   // Mínimo 10m de deslocamento
}

// Usar Balanced ao invés de High reduz consumo de bateria em ~40%
// sem impacto perceptível na experiência do consumidor
```

-----

## LIMPEZA DA LOCALIZACAO

Cenários que devem limpar o `assignment_id` de `courier_locations`:

|Evento                        |Ação                                         |
|------------------------------|---------------------------------------------|
|Entrega confirmada            |`assignment_id = null` via app do entregador |
|Entrega cancelada pelo lojista|`assignment_id = null` via webhook ou trigger|
|Entregador fica offline       |`assignment_id = null` via toggle            |
|App fechado abruptamente      |`assignment_id = null` via cron de limpeza   |

### Cron de limpeza (segurança)

Para cobrir o caso de app fechado abruptamente, um cron simples
pode limpar locations desatualizadas:

```sql
-- Limpar courier_locations sem atualização há mais de 10 minutos
-- Adicionar como Scheduled Edge Function ou pg_cron

UPDATE courier_locations
SET assignment_id = null
WHERE assignment_id IS NOT NULL
  AND atualizado_em < NOW() - INTERVAL '10 minutes';
```

Configurar como Scheduled Edge Function no Supabase a cada 5 minutos:

```typescript
// supabase/functions/cleanup-locations/index.ts
import { getSupabaseAdmin } from '../helpers/auth.ts'

Deno.serve(async () => {
  const supabase = getSupabaseAdmin()

  const dez_minutos_atras = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('courier_locations')
    .update({ assignment_id: null })
    .not('assignment_id', 'is', null)
    .lt('atualizado_em', dez_minutos_atras)

  return new Response(
    JSON.stringify({ sucesso: !error, erro: error?.message }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

-----

## CHECKLIST DO MODULO

- [ ] `courier_locations` com Realtime habilitado no Supabase Dashboard
- [ ] `ALTER PUBLICATION supabase_realtime ADD TABLE courier_locations` executado
- [ ] Permissão de localização foreground solicitada antes de `watchPositionAsync`
- [ ] `UIBackgroundModes: ['location']` no `app.json` para iOS
- [ ] `isAndroidForegroundServiceEnabled: true` no plugin expo-location para Android
- [ ] UPSERT usa `onConflict: 'courier_id'` — a tabela tem constraint UNIQUE em `courier_id`
- [ ] `assignment_id` preenchido ao iniciar entrega e limpo ao finalizar
- [ ] Hook `useLocalizacaoCourier` verifica `assignment_id IS NOT NULL` antes de exibir mapa
- [ ] Cron de limpeza configurado para cobrir fechamento abrupto do app
- [ ] RLS de `courier_locations` garante isolamento correto (arquivo 05)
- [ ] `accuracy: Location.Accuracy.Balanced` para economia de bateria
- [ ] `watchRef.current?.remove()` no cleanup de todos os `useEffect`
- [ ] Canal Realtime com nome único por `courierId` para evitar conflitos

-----

*Arquivo 21 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 22 — Entregador — Financeiro e Ganhos*
