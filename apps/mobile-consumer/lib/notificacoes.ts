import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { supabase } from './supabase'

// Configurar comportamento quando notificação chega com app aberto
// SDK 53+: shouldShowBanner e shouldShowList substituem shouldShowAlert
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registrarPushToken(
  userId: string | null,
  courierId: string | null,
  app: 'consumer' | 'courier'
): Promise<void> {
  if (!Device.isDevice) {
    console.warn('Push notifications requerem dispositivo físico.')
    return
  }

  const { status: existente } = await Notifications.getPermissionsAsync()
  let status = existente

  if (existente !== 'granted') {
    const { status: novo } = await Notifications.requestPermissionsAsync()
    status = novo
  }

  if (status !== 'granted') {
    console.warn('Permissão de notificações negada.')
    return
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
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
    // Fallback: se a constraint ainda não existir no banco remoto,
    // tenta insert; se duplicado, faz update.
    if (error.code === '42P10') {
      const { data: existente } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('token', token)
        .maybeSingle()

      if (existente) {
        await supabase
          .from('push_tokens')
          .update({ ativo: true, atualizado_em: new Date().toISOString() })
          .eq('token', token)
      } else {
        await supabase.from('push_tokens').insert(registro)
      }
    } else {
      console.error('Erro ao salvar push token:', error.message)
    }
  }
}

export async function desativarPushToken(token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .update({ ativo: false })
    .eq('token', token)
}

export function useNotificacaoListener() {
  const notificacaoRecebida = useRef<{ remove: () => void } | null>(null)
  const notificacaoRespondida = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    notificacaoRecebida.current = Notifications.addNotificationReceivedListener(
      (notificacao) => {
        console.log('Notificação recebida:', notificacao.request.content.data)
      }
    ) as unknown as { remove: () => void }

    notificacaoRespondida.current =
      Notifications.addNotificationResponseReceivedListener((resposta) => {
        const data = resposta.notification.request.content.data as Record<
          string,
          string
        >

        if (data?.tipo === 'status_pedido' && data.order_id) {
          router.push(`/pedido/${data.order_id}`)
        }
      }) as unknown as { remove: () => void }

    return () => {
      notificacaoRecebida.current?.remove()
      notificacaoRespondida.current?.remove()
    }
  }, [])
}
