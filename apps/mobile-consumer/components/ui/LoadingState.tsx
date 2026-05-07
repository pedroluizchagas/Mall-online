import { View, Text, ActivityIndicator } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

/**
 * Spinner com 2 modos: 'tela' (full screen) ou 'bloco' (altura definida).
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §8
 */

const { colors } = consumerDesign

interface LoadingStateProps {
  modo?: 'tela' | 'bloco'
  mensagem?: string
  variante?: 'claro' | 'escuro'
  /** Só usado em modo 'bloco'. Default 200. */
  altura?: number
}

export function LoadingState({
  modo = 'bloco',
  mensagem,
  variante = 'claro',
  altura = 200,
}: LoadingStateProps) {
  const corFundo = variante === 'claro' ? colors.canvas : colors.surfaceDark
  const corSpinner = variante === 'claro' ? colors.ink : colors.accent
  const corMensagem = variante === 'claro' ? colors.inkMuted : colors.inkSoft

  return (
    <View
      style={{
        flex: modo === 'tela' ? 1 : undefined,
        height: modo === 'tela' ? undefined : altura,
        backgroundColor: corFundo,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <ActivityIndicator size="large" color={corSpinner} />
      {mensagem && (
        <Text style={{ fontSize: 14, fontWeight: '500', color: corMensagem }}>
          {mensagem}
        </Text>
      )}
    </View>
  )
}
