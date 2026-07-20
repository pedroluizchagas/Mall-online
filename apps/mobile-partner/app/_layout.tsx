import '../global.css'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { useVideoPlayer, VideoView } from 'expo-video'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { supabase } from '@/lib/supabase'
import { useAuthStore, lerLojaAtivaPersistida } from '@/store/useAuthStore'
import { partnerDesign } from '@/lib/partner-design'

SplashScreen.preventAutoHideAsync()

// Splash mudo por padrão: tocar áudio a cada abertura do app é intrusivo.
const MUDO = true

export default function LayoutRaiz() {
  const { setUser, setTenant, setLojas, setLojaAtiva, setBillingStatus, setCarregando, limpar } =
    useAuthStore()
  const [splashVisivel, setSplashVisivel] = useState(true)

  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    // Via única de resolução de sessão (mesma decisão do courier): no
    // supabase-js v2, onAuthStateChange dispara INITIAL_SESSION com a sessão
    // atual logo na inscrição, cobrindo o boot. Não usar getSession() em
    // paralelo — duas vias liberariam `carregando` em momentos diferentes,
    // causando redirect transitório.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setUser(session?.user ?? null)
          if (session?.user) {
            await carregarTenant(session.user.id)
          } else {
            limpar()
          }
        } catch (error) {
          console.error('Falha ao atualizar autenticacao do lojista:', error)
          setTenant(null)
        } finally {
          setCarregando(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // docs/partner-app/04-stage-2-auth-gate.md — RLS (tenants_select_proprio /
  // stores_select_proprio) já restringe todos os selects ao próprio tenant.
  async function carregarTenant(userId: string) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, nome_responsavel, email, ativo, pagarme_onboarding_status')
      .eq('user_id', userId)
      .single()

    if (!tenant) {
      setTenant(null)
      setLojas([])
      setLojaAtiva(null)
      setBillingStatus(null)
      return
    }

    setTenant(tenant)

    const [{ data: lojas }, { data: assinatura }, persistida] = await Promise.all([
      supabase
        .from('stores')
        .select('id, nome, slug, logo_url')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('criado_em', { ascending: true }),
      supabase
        .from('tenant_subscriptions')
        .select('billing_status')
        .eq('tenant_id', tenant.id)
        .single(),
      lerLojaAtivaPersistida(),
    ])

    const listaLojas = lojas ?? []
    setLojas(listaLojas)
    setBillingStatus(assinatura?.billing_status ?? null)

    // Loja ativa: persistida (se ainda existir) senão a primeira.
    const aindaExiste = persistida && listaLojas.some((l) => l.id === persistida)
    setLojaAtiva(aindaExiste ? persistida : listaLojas[0]?.id ?? null)
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {splashVisivel && (
        <SplashAnimacao onConcluido={() => setSplashVisivel(false)} />
      )}
    </GestureHandlerRootView>
  )
}

function SplashAnimacao({ onConcluido }: { onConcluido: () => void }) {
  const { colors } = partnerDesign
  const opacidade = useSharedValue(1)
  const fechado = useRef(false)

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: opacidade.value,
  }))

  const player = useVideoPlayer(
    require('../assets/mallevo-copa.mp4'),
    (p) => {
      p.loop = false
      p.muted = MUDO
      p.play()
    },
  )

  useEffect(() => {
    function handleAnimacaoFim() {
      if (fechado.current) return
      fechado.current = true
      opacidade.value = withTiming(0, { duration: 480 })
      setTimeout(onConcluido, 480)
    }

    const sub = player.addListener('playToEnd', handleAnimacaoFim)
    // Salvaguarda: se o evento de fim não disparar, não travar o app no splash.
    const timeout = setTimeout(handleAnimacaoFim, 10000)
    return () => {
      sub.remove()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: colors.splash }, estiloAnimado]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
