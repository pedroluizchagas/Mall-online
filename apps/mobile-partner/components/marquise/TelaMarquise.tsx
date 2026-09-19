import { ReactNode, useCallback, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Marquise } from '@/components/marquise/Marquise'
import { Folha } from '@/components/marquise/Folha'
import { partnerDesign } from '@/lib/partner-design'

const { colors, spacing } = partnerDesign

/**
 * Esqueleto de tela do lojista — a arquitetura marquise + folha do
 * consumer, pronta para compor:
 *
 * - `marquise`: o que está AO VIVO (statement, placas de vidro, cartões);
 * - `children`: o acervo, na folha clara (SecaoFolha + CartaoFolha).
 *
 * Cuida do que toda tela repetia: status bar clara (só em foco, porque as
 * outras abas são claras — ou fixa em stack screens), céu `marquee` atrás
 * do overscroll do iOS, RefreshControl branco e a reserva de rolagem.
 */
export function TelaMarquise({
  marquise,
  children,
  refreshing = false,
  onRefresh,
  paddingBottomFolha = spacing.tabBarHeight,
  gapFolha = 28,
  stack = false,
}: {
  marquise: ReactNode
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
  paddingBottomFolha?: number
  gapFolha?: number
  /**
   * Stack screen (fora das tabs): a status bar fica clara enquanto a tela
   * está montada — o expo-status-bar restaura ao desmontar.
   */
  stack?: boolean
}) {
  // Nas tabs a marquise é escura mas as vizinhas podem não ser: status bar
  // clara só enquanto a aba está em foco.
  const [focado, setFocado] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocado(true)
      return () => setFocado(false)
    }, []),
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {(stack || focado) && <StatusBar style="light" animated />}

      {/* Céu atrás do overscroll superior (iOS rubber-band). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 420,
          backgroundColor: colors.marquee,
        }}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.white}
            />
          ) : undefined
        }
      >
        <Marquise>{marquise}</Marquise>
        <Folha paddingBottom={paddingBottomFolha} gap={gapFolha}>
          {children}
        </Folha>
      </ScrollView>
    </View>
  )
}
