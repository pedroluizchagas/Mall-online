import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Primitivos das telas de gestão (base clara/canvas) — todos nos tokens.

const { colors, radius, spacing, typography } = partnerDesign

export function CabecalhoTela({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/menu'))}
        activeOpacity={0.7}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        }}
      >
        <PartnerIcon name="back" size={18} color={colors.ink} />
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          color: colors.ink,
          fontSize: typography.h2.size,
          fontWeight: typography.h2.weight,
          letterSpacing: typography.h2.tracking,
        }}
      >
        {titulo}
      </Text>
      {children}
    </View>
  )
}

export function Cartao({ children, semPadding }: { children: React.ReactNode; semPadding?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: semPadding ? 0 : spacing.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
}

export function Legenda({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.inkSoft,
        fontSize: typography.micro.size,
        fontWeight: typography.micro.weight,
        letterSpacing: typography.micro.tracking,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
      }}
    >
      {children}
    </Text>
  )
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  multiline,
  teclado,
}: {
  rotulo: string
  valor: string
  aoMudar: (t: string) => void
  placeholder?: string
  multiline?: boolean
  teclado?: 'default' | 'numeric' | 'decimal-pad'
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          color: colors.inkMuted,
          fontSize: typography.bodySm.size,
          fontWeight: '700',
          marginBottom: 6,
        }}
      >
        {rotulo}
      </Text>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        multiline={multiline}
        keyboardType={teclado ?? 'default'}
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.sm,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          height: multiline ? 88 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
          color: colors.ink,
          fontSize: typography.bodyLg.size,
        }}
      />
    </View>
  )
}

export function BotaoPrimario({
  rotulo,
  onPress,
  carregando,
  desabilitado,
  destrutivo,
}: {
  rotulo: string
  onPress: () => void
  carregando?: boolean
  desabilitado?: boolean
  destrutivo?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={carregando || desabilitado}
      activeOpacity={0.85}
      style={{
        height: 54,
        borderRadius: radius.pill,
        backgroundColor: destrutivo ? colors.surface : colors.accent,
        borderWidth: destrutivo ? 1.5 : 0,
        borderColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: desabilitado ? 0.5 : 1,
        marginBottom: spacing.sm,
      }}
    >
      {carregando ? (
        <ActivityIndicator color={destrutivo ? colors.danger : colors.ink} />
      ) : (
        <Text style={{ color: destrutivo ? colors.danger : colors.ink, fontWeight: '800', fontSize: 15 }}>
          {rotulo}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export function Chip({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string
  ativo: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: ativo ? colors.ink : colors.surface,
        borderRadius: radius.pill,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          color: ativo ? colors.accent : colors.inkMuted,
          fontSize: typography.bodySm.size,
          fontWeight: '700',
        }}
      >
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
