import { useState, ReactNode } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

/**
 * Campo de texto padrão do mobile-consumer.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §2
 */

const { colors, radius } = consumerDesign

export type InputTipo = 'texto' | 'email' | 'senha' | 'numero' | 'telefone'

interface InputProps {
  valor: string
  aoMudar: (texto: string) => void
  rotulo?: string
  placeholder?: string
  erro?: string
  tipo?: InputTipo
  desabilitado?: boolean
  multilinha?: boolean
  iconeEsquerda?: ConsumerIconName
  acessorioDireita?: ReactNode
  /**
   * true = input desenhado sobre fundo escuro (telas auth). Além das cores
   * do campo, troca o teclado do iOS para dark e acende caret/seleção no
   * accent — o teclado também faz parte da superfície.
   */
  fundoEscuro?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoFocus?: boolean
  maxLength?: number
}

export function Input({
  valor,
  aoMudar,
  rotulo,
  placeholder,
  erro,
  tipo = 'texto',
  desabilitado = false,
  multilinha = false,
  iconeEsquerda,
  acessorioDireita,
  fundoEscuro = false,
  autoCapitalize = 'sentences',
  autoFocus = false,
  maxLength,
}: InputProps) {
  const [focado, setFocado] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  const corBorda = erro
    ? colors.danger
    : focado
    ? colors.accent
    : fundoEscuro
    ? colors.lineDark
    : colors.line

  const corFundo = fundoEscuro
    ? colors.surfaceDarkSoft
    : desabilitado
    ? colors.canvasAlt
    : colors.surface

  const corTexto = fundoEscuro ? colors.white : colors.ink

  return (
    <View>
      {rotulo && (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: fundoEscuro ? colors.inkSoft : colors.inkMuted,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {rotulo}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multilinha ? 'flex-start' : 'center',
          gap: 10,
          minHeight: multilinha ? 96 : 54,
          borderRadius: radius.md,
          paddingHorizontal: 18,
          paddingVertical: multilinha ? 14 : 0,
          backgroundColor: corFundo,
          borderWidth: 1.5,
          borderColor: corBorda,
          opacity: desabilitado ? 0.7 : 1,
        }}
      >
        {iconeEsquerda && (
          <ConsumerIcon
            name={iconeEsquerda}
            size={18}
            color={focado ? colors.accent : colors.inkSoft}
          />
        )}

        <TextInput
          value={valor}
          onChangeText={aoMudar}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSoft}
          editable={!desabilitado}
          secureTextEntry={tipo === 'senha' && !senhaVisivel}
          keyboardType={
            tipo === 'email'
              ? 'email-address'
              : tipo === 'numero'
              ? 'numeric'
              : tipo === 'telefone'
              ? 'phone-pad'
              : 'default'
          }
          autoCapitalize={tipo === 'email' || tipo === 'senha' ? 'none' : autoCapitalize}
          autoCorrect={tipo !== 'email' && tipo !== 'senha'}
          autoFocus={autoFocus}
          multiline={multilinha}
          textAlignVertical={multilinha ? 'top' : 'center'}
          maxLength={maxLength}
          keyboardAppearance={fundoEscuro ? 'dark' : 'light'}
          // Caret lima só no escuro: sobre superfície clara o accent é claro
          // demais para um traço de 2px — o caret padrão (escuro) fica.
          selectionColor={fundoEscuro ? colors.accent : undefined}
          cursorColor={fundoEscuro ? colors.accent : undefined}
          style={{
            flex: 1,
            fontSize: 16,
            color: corTexto,
            paddingVertical: 0,
          }}
        />

        {tipo === 'senha' && (
          <TouchableOpacity onPress={() => setSenhaVisivel((v) => !v)} activeOpacity={0.7}>
            <ConsumerIcon
              name={senhaVisivel ? 'eye-off' : 'eye'}
              size={20}
              color={colors.inkSoft}
            />
          </TouchableOpacity>
        )}

        {acessorioDireita}
      </View>

      {erro && (
        <Text style={{ fontSize: 13, color: colors.danger, marginTop: 6 }}>{erro}</Text>
      )}
    </View>
  )
}
