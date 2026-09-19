import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { abrirNoDashboard } from '@/lib/links'
import { GlowNeon } from '@/components/marquise/Marquise'
import { EmptyState } from '@/components/ui/EmptyState'
import { Botao } from '@/components/ui/Botao'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Telas de bloqueio do gate (docs/partner-app/04-stage-2-auth-gate.md):
 * sem tenant / assinatura cancelada / sem loja. Quem está barrado ainda
 * está "fora": fachada escura + EmptyState escuro. Fluxos de resolução são
 * SEMPRE web — o app só aponta para o Dashboard.
 */

interface Props {
  titulo: string
  descricao: string
  ctaLabel: string
  ctaCaminho: string
  mostrarSair?: boolean
}

export function TelaGate({ titulo, descricao, ctaLabel, ctaCaminho, mostrarSair = true }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: partnerDesign.colors.marquee,
        justifyContent: 'center',
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar style="light" />
      <GlowNeon />
      <EmptyState
        icone="store"
        titulo={titulo}
        descricao={descricao}
        variante="escuro"
        acao={{ label: ctaLabel, aoTocar: () => abrirNoDashboard(ctaCaminho), variante: 'primario' }}
      />
      {mostrarSair && (
        <View style={{ alignItems: 'center' }}>
          <Botao
            label="Sair da conta"
            variante="ghost"
            tamanho="md"
            largura="auto"
            iconeEsquerda="logout"
            onPress={() => void supabase.auth.signOut()}
          />
        </View>
      )}
    </View>
  )
}
