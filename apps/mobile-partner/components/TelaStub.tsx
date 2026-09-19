import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { partnerDesign } from '@/lib/partner-design'

// Placeholder padrão do scaffold (Stage 1). Cada stage substitui os stubs
// das suas telas — ver docs/partner-app/00-INDEX.md (tabela de stages).

interface Props {
  titulo: string
  stage: string
  descricao?: string
}

export function TelaStub({ titulo, stage, descricao }: Props) {
  const { colors } = partnerDesign

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
      <StatusBar style="dark" />
      <EmptyState icone="box" titulo={titulo} descricao={descricao} />
      <View style={{ alignItems: 'center' }}>
        <Badge rotulo={`Em construção — ${stage}`} cor={colors.warning} tamanho="md" />
      </View>
    </View>
  )
}
