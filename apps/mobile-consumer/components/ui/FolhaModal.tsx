import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

interface Props {
  visivel: boolean
  titulo: string
  onFechar: () => void
  children: React.ReactNode
}

/**
 * Folha que sobe pela base — o chrome que o modal de endereços do checkout
 * já usava, extraído para servir também ao perfil.
 *
 * Véu tocável fecha; `maxHeight` de 85% garante que sempre sobre um pedaço
 * do fundo, para a folha ser lida como camada e não como tela nova.
 */
export function FolhaModal({ visivel, titulo, onFechar, children }: Props) {
  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent
      onRequestClose={onFechar}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(17, 18, 22, ${consumerDesign.opacity.overlay})`,
          }}
          activeOpacity={1}
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '85%',
            overflow: 'hidden',
          }}
        >
          <View
            style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.line,
              }}
            />
          </View>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
              {titulo}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
