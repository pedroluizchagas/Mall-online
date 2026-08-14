import { useRef } from 'react'
import { Animated, Text, TouchableOpacity } from 'react-native'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useEstaSeguindo, useSeguidas, type AlvoSeguir } from '@/store/useSeguidas'

/**
 * Botão Seguir / Seguindo.
 *
 * Único lugar que escreve em `useSeguidas` a partir da UI — Explorar, o rail
 * da tela Seguindo e a lista de lojas usam este mesmo componente para o
 * estado nunca divergir entre telas.
 *
 * Duas peles porque ele vive em dois fundos opostos: `reel` sobre vídeo
 * (contorno accent, vira vidro fosco quando seguindo) e `claro` sobre
 * `surface` (accent preenchido, vira contorno discreto quando seguindo).
 */

const { colors, radius } = consumerDesign

export type BotaoSeguirVariante = 'reel' | 'claro'
export type BotaoSeguirTamanho = 'sm' | 'md'

interface Props {
  loja: AlvoSeguir
  variante?: BotaoSeguirVariante
  tamanho?: BotaoSeguirTamanho
}

const TAMANHO: Record<
  BotaoSeguirTamanho,
  { altura: number; padX: number; fonte: number; icone: number }
> = {
  sm: { altura: 30, padX: 12, fonte: 11.5, icone: 12 },
  md: { altura: 36, padX: 16, fonte: 13, icone: 14 },
}

export function BotaoSeguir({ loja, variante = 'claro', tamanho = 'sm' }: Props) {
  const seguindo = useEstaSeguindo(loja.slug)
  const alternar = useSeguidas((s) => s.alternar)
  const escala = useRef(new Animated.Value(1)).current
  const t = TAMANHO[tamanho]

  const noReel = variante === 'reel'
  const fundo = seguindo
    ? noReel
      ? 'rgba(255,255,255,0.16)'
      : colors.surface
    : noReel
      ? 'transparent'
      : colors.accent
  const borda = seguindo
    ? noReel
      ? 'rgba(255,255,255,0.35)'
      : colors.line
    : colors.accent
  const corTexto = seguindo
    ? noReel
      ? colors.white
      : colors.inkMuted
    : noReel
      ? colors.accent
      : colors.ink

  function aoTocar() {
    // Pulso curto: some a "confirmação" do toque sem atrapalhar a leitura.
    Animated.sequence([
      Animated.spring(escala, {
        toValue: 0.9,
        damping: 9,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.spring(escala, {
        toValue: 1,
        damping: 11,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start()
    alternar(loja)
  }

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <TouchableOpacity
        onPress={aoTocar}
        activeOpacity={consumerDesign.opacity.pressedSoft}
        accessibilityRole="button"
        accessibilityLabel={
          seguindo ? `Deixar de seguir ${loja.nome}` : `Seguir ${loja.nome}`
        }
        style={{
          height: t.altura,
          paddingHorizontal: t.padX,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: borda,
          backgroundColor: fundo,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {seguindo && (
          <ConsumerIcon
            name="check"
            size={t.icone}
            color={corTexto}
            strokeWidth={2.4}
          />
        )}
        <Text
          style={{
            color: corTexto,
            fontSize: t.fonte,
            fontWeight: '800',
            letterSpacing: 0.3,
          }}
        >
          {seguindo ? 'Seguindo' : 'Seguir'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )
}
