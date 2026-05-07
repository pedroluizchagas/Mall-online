import { View, Text } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { Botao, BotaoVariante } from './Botao'

/**
 * Estado vazio (lista sem itens, busca sem resultado, etc.).
 * Sempre tem ícone + título + descrição. CTA opcional.
 *
 * Spec: docs/system-design/consumer/03-componentes-base.md §7
 */

const { colors, radius } = consumerDesign

interface EmptyStateAcao {
  label: string
  aoTocar: () => void
  variante?: BotaoVariante
}

interface EmptyStateProps {
  icone: ConsumerIconName
  titulo: string
  descricao?: string
  acao?: EmptyStateAcao
  variante?: 'claro' | 'escuro'
}

export function EmptyState({
  icone,
  titulo,
  descricao,
  acao,
  variante = 'claro',
}: EmptyStateProps) {
  const corTitulo = variante === 'claro' ? colors.ink : colors.white
  const corDescricao = variante === 'claro' ? colors.inkMuted : colors.inkSoft

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 48,
        gap: 16,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: radius.pill,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name={icone} size={36} color={colors.accent} strokeWidth={1.6} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: corTitulo,
            letterSpacing: -0.3,
            textAlign: 'center',
          }}
        >
          {titulo}
        </Text>
        {descricao && (
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: corDescricao,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {descricao}
          </Text>
        )}
      </View>

      {acao && (
        <View style={{ marginTop: 8, alignSelf: 'stretch', maxWidth: 280 }}>
          <Botao
            label={acao.label}
            onPress={acao.aoTocar}
            variante={acao.variante ?? 'primario'}
            tamanho="md"
          />
        </View>
      )}
    </View>
  )
}
