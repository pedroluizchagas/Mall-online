import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useFontesMarquee } from '@/components/marquise/Marquise'
import { partnerDesign } from '@/lib/partner-design'

const { colors, radius } = partnerDesign

interface Props {
  visivel: boolean
  titulo: string
  /** Sobrelinha em micro caps acima do título ("Onde você está"). */
  sobrelinha?: string
  /** `surface` (formulários) ou `canvas` (listas de cartões claros). */
  fundo?: 'surface' | 'canvas'
  onFechar: () => void
  children: React.ReactNode
}

/**
 * Folha que sobe pela base — o chrome de folha modal do consumer, portado para
 * servir aos seletores (loja, entregador) e formulários curtos.
 *
 * Fala a voz da casa: alça, sobrelinha opcional em micro caps e título na
 * fonte-assinatura (`useFontesMarquee().letreiro`), sem fio abaixo do
 * cabeçalho — o sistema não usa risco. Véu tocável fecha; `maxHeight` de
 * 85% garante que sempre sobre um pedaço do fundo, para a folha ser lida
 * como camada e não como tela nova.
 */
export function FolhaModal({
  visivel,
  titulo,
  sobrelinha,
  fundo = 'surface',
  onFechar,
  children,
}: Props) {
  const fontes = useFontesMarquee()
  const corFundo = fundo === 'canvas' ? colors.canvas : colors.surface

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
            backgroundColor: `rgba(17, 18, 22, ${partnerDesign.opacity.overlay})`,
          }}
          activeOpacity={1}
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            backgroundColor: corFundo,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
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

          <View style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 }}>
            {sobrelinha ? (
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: colors.inkSoft,
                  marginBottom: 3,
                }}
              >
                {sobrelinha}
              </Text>
            ) : null}
            <Text
              style={[fontes.letreiro, { fontSize: 22, color: colors.ink, letterSpacing: -0.4 }]}
            >
              {titulo}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: 40, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
