import { Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { partnerDesign } from '@/lib/partner-design'

// Placeholder padrão do scaffold (Stage 1). Cada stage substitui os stubs
// das suas telas — ver docs/partner-app/00-INDEX.md (tabela de stages).

interface Props {
  titulo: string
  stage: string
  descricao?: string
}

export function TelaStub({ titulo, stage, descricao }: Props) {
  const { colors, radius, typography } = partnerDesign

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <StatusBar style="dark" />
      <Text
        style={{
          color: colors.ink,
          fontSize: typography.h2.size,
          fontWeight: typography.h2.weight,
          letterSpacing: typography.h2.tracking,
          marginBottom: 8,
        }}
      >
        {titulo}
      </Text>
      {descricao ? (
        <Text
          style={{
            color: colors.inkMuted,
            fontSize: typography.body.size,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {descricao}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: colors.accentSoft,
          borderRadius: radius.pill,
          paddingVertical: 6,
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            color: colors.ink,
            fontSize: typography.micro.size,
            fontWeight: typography.micro.weight,
            letterSpacing: typography.micro.tracking,
            textTransform: 'uppercase',
          }}
        >
          Em construção — {stage}
        </Text>
      </View>
    </View>
  )
}
