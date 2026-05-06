import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { supabase } from './supabase'

// Configurar comportamento quando notificação chega com app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

function suportaPushNoAmbienteAtual() {
  return Constants.appOwnership !== 'expo'
}

export async function registrarPushToken(
  userId: string | null,
  courierId: string | null,
  app: 'consumer' | 'courier'
): Promise<void> {
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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Padrao',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF82',
      })
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })

    const token = tokenData.data
    const plataforma = Platform.OS === 'ios' ? 'ios' : 'android'

    const registro = {
      token,
      plataforma,
      app,
      ativo: true,
      ...(userId ? { user_id: userId } : {}),
      ...(courierId ? { courier_id: courierId } : {}),
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

export async function desativarPushToken(token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .update({ ativo: false })
    .eq('token', token)
}

export function useNotificacaoListener() {
  const notificacaoRecebida = useRef<Notifications.Subscription | null>(null)
  const notificacaoRespondida = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    if (!suportaPushNoAmbienteAtual()) {
      return
    }

    notificacaoRecebida.current =
      Notifications.addNotificationReceivedListener((notificacao) => {
        console.log('Notificação recebida:', notificacao.request.content.data)
      })

    notificacaoRespondida.current =
      Notifications.addNotificationResponseReceivedListener((resposta) => {
        const data = resposta.notification.request.content.data as Record<string, string>

        switch (data?.tipo) {
          case 'nova_entrega':
            router.push('/(tabs)')
            break
          case 'repasse_processado':
            router.push('/(tabs)/ganhos')
            break
        }
      })

    return () => {
      notificacaoRecebida.current?.remove()
      notificacaoRespondida.current?.remove()
    }
  }, [])
}
