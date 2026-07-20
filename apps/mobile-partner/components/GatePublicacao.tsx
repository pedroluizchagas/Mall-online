import { Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { abrirNoDashboard } from '@/lib/links'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Gate de publicação (docs/partner-app/04-stage-2-auth-gate.md): quando
// tenantPodePublicar reprova, as abas Publicar/Conteúdo mostram este
// bloqueio — a gestão do app continua liberada.

export function GatePublicacao() {
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
        <PartnerIcon name="camera" size={30} color={colors.ink} strokeWidth={1.7} />
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
        Ative sua loja para publicar
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
        Finalize a configuração de recebimentos no Dashboard para publicar
        fotos e vídeos no Explorar.
      </Text>
      <TouchableOpacity
        onPress={() => abrirNoDashboard('/minha-conta')}
        activeOpacity={0.85}
        style={{
          height: 54,
          minWidth: 240,
          paddingHorizontal: spacing['2xl'],
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>
          Configurar recebimentos
        </Text>
      </TouchableOpacity>
    </View>
  )
}
