import { Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { PartnerIcon } from '@/components/PartnerIcon'
import { Botao } from '@/components/ui/Botao'
import { Chip as ChipUI } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Primitivos das telas de gestão (módulos atrás do Menu, base clara).
 *
 * Fachada de compatibilidade: a API antiga (CabecalhoTela, Cartao, Legenda,
 * CampoTexto, BotaoPrimario, Chip) continua, mas por baixo tudo é feito
 * dos primitivos de `components/ui/` — assim os ~20 módulos de gestão
 * herdam o system design (cartão sem borda com elevação por luminosidade,
 * Input da casa, Botao pílula, Chip ink/accent) sem reescrita.
 */

const { colors, radius, spacing, typography, shadow } = partnerDesign

export function CabecalhoTela({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/menu'))}
        activeOpacity={partnerDesign.opacity.pressedSoft}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
          },
          shadow.soft,
        ]}
      >
        <PartnerIcon name="back" size={18} color={colors.ink} strokeWidth={2.1} />
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          color: colors.ink,
          fontSize: typography.h2.size,
          fontWeight: typography.h2.weight,
          letterSpacing: typography.h2.tracking,
        }}
        numberOfLines={1}
      >
        {titulo}
      </Text>
      {children}
    </View>
  )
}

/** Cartão claro — `surface` SEM borda, `radius.md`, `shadow.soft`. */
export function Cartao({ children, semPadding }: { children: React.ReactNode; semPadding?: boolean }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: semPadding ? 0 : spacing.lg,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        },
        shadow.soft,
      ]}
    >
      {children}
    </View>
  )
}

/** Sobrelinha de seção em micro caps `inkSoft` (a mesma do SecaoFolha). */
export function Legenda({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.inkSoft,
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 1.2,
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
      <Input
        rotulo={rotulo}
        valor={valor}
        aoMudar={aoMudar}
        placeholder={placeholder}
        multilinha={multiline}
        tipo={teclado && teclado !== 'default' ? 'numero' : 'texto'}
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
    <View style={{ marginBottom: spacing.sm }}>
      <Botao
        label={rotulo}
        onPress={onPress}
        variante={destrutivo ? 'danger' : 'primario'}
        tamanho="md"
        carregando={carregando}
        desabilitado={desabilitado}
      />
    </View>
  )
}

/** Chip com as margens que as fileiras `flexWrap` dos módulos esperam. */
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
    <View style={{ marginRight: 8, marginBottom: 8 }}>
      <ChipUI rotulo={rotulo} ativo={ativo} aoTocar={onPress} tamanho="sm" />
    </View>
  )
}
