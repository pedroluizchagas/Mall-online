import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { LoadingState } from '@/components/ui/LoadingState'
import { partnerDesign } from '@/lib/partner-design'

// Garante que `entrar` (login) seja sempre a rota base deste grupo — mesma
// decisão do courier para evitar "GO_BACK was not handled" com pilha vazia.
export const unstable_settings = { initialRouteName: 'entrar' }

export default function LayoutAuth() {
  const { user, carregando } = useAuthStore()
  const { colors } = partnerDesign

  if (carregando) {
    return <LoadingState modo="tela" variante="escuro" />
  }

  if (user) {
    // Lojista logado — os gates (tenant/assinatura/loja) vivem no layout
    // das tabs, que decide entre TelaGate e o app liberado.
    return <Redirect href="/(tabs)" />
  }

  // Quem não entrou vive na fachada escura; ao entrar, tudo vira canvas.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.marquee },
      }}
    />
  )
}
