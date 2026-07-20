import { Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { abrirNoDashboard } from '@/lib/links'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Telas de bloqueio do gate (docs/partner-app/04-stage-2-auth-gate.md):
// sem tenant / assinatura cancelada / sem loja. Fluxos de resolução são
// SEMPRE web — o app só aponta para o Dashboard.

interface Props {
  titulo: string
  descricao: string
  ctaLabel: string
  ctaCaminho: string
  mostrarSair?: boolean
}

export function TelaGate({ titulo, descricao, ctaLabel, ctaCaminho, mostrarSair = true }: Props) {
  const { colors, radius, typography, spacing } = partnerDesign

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
      }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.md,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <PartnerIcon name="store" size={30} color={colors.ink} strokeWidth={1.7} />
      </View>

      <Text
        style={{
          color: colors.ink,
          fontSize: typography.h2.size,
          fontWeight: typography.h2.weight,
          letterSpacing: typography.h2.tracking,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        {titulo}
      </Text>
      <Text
        style={{
          color: colors.inkMuted,
          fontSize: typography.body.size,
          lineHeight: 21,
          textAlign: 'center',
          marginBottom: spacing['3xl'],
          maxWidth: 300,
        }}
      >
        {descricao}
      </Text>

      <TouchableOpacity
        onPress={() => abrirNoDashboard(ctaCaminho)}
        activeOpacity={0.85}
        style={{
          height: 54,
          minWidth: 240,
          paddingHorizontal: spacing['2xl'],
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>
          {ctaLabel}
        </Text>
      </TouchableOpacity>

      {mostrarSair && (
        <TouchableOpacity
          onPress={() => supabase.auth.signOut()}
          activeOpacity={0.7}
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <PartnerIcon name="logout" size={16} color={colors.inkMuted} />
          <Text style={{ color: colors.inkMuted, fontSize: typography.body.size, fontWeight: '600' }}>
            Sair da conta
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
