import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { AppState, Platform } from 'react-native'
import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { supabase } from './supabase'

// Push do lojista — espelha apps/mobile-courier/lib/notificacoes.ts.
// O disparo server-side já existe: notify-order-update busca tokens por
// tenants.user_id (tipo 'novo_pedido' / 'entrega_confirmada'); este app só
// registra o token com app='partner' (CHECK estendido na migration
// partner_05). docs/partner-app/05-stage-3-pedidos.md

// Foreground: suprime o banner do push — o Realtime já toca o sino e
// atualiza a lista (evita som/alerta duplicado). Em background o SO exibe.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const emForeground = AppState.currentState === 'active'
    return {
      shouldShowAlert: !emForeground,
      shouldShowBanner: !emForeground,
      shouldShowList: true,
      shouldPlaySound: !emForeground,
      shouldSetBadge: true,
    }
  },
})

function suportaPushNoAmbienteAtual() {
  return Constants.appOwnership !== 'expo'
}

export async function registrarPushToken(userId: string): Promise<void> {
  if (!suportaPushNoAmbienteAtual()) {
    console.warn('Push remoto desabilitado no Expo Go. Use um development build para testar notificacoes.')
    return
  }

  if (!Device.isDevice) {
    console.warn('Push notifications requerem dispositivo físico.')
    return
  }

  try {
    const { status: existente } = await Notifications.getPermissionsAsync()
    let status = existente

    if (existente !== 'granted') {
      const { status: novo } = await Notifications.requestPermissionsAsync()
      status = novo
    }

    if (status !== 'granted') {
      console.warn('Permissao de notificacoes negada.')
      return
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pedidos', {
        name: 'Pedidos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D8FF3E',
      })
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })

    const registro = {
      token: tokenData.data,
      plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
      app: 'partner',
      ativo: true,
      user_id: userId,
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(registro, { onConflict: 'token' })

    if (error) {
      console.error('Erro ao salvar push token:', error.message)
    }
  } catch (error) {
    console.warn('Falha ao registrar push token:', error)
  }
}

export function useNotificacaoListener() {
  const notificacaoRespondida = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    if (!suportaPushNoAmbienteAtual()) {
      return
    }

    // Tap na notificação → deep link (tipos emitidos por notify-order-update)
    notificacaoRespondida.current =
      Notifications.addNotificationResponseReceivedListener((resposta) => {
        const data = resposta.notification.request.content.data as Record<string, string>

        switch (data?.tipo) {
          case 'novo_pedido':
          case 'entrega_confirmada':
            if (data.order_id) router.push(`/pedido/${data.order_id}`)
            else router.push('/(tabs)/pedidos')
            break
        }
      })

    return () => {
      notificacaoRespondida.current?.remove()
    }
  }, [])
}
