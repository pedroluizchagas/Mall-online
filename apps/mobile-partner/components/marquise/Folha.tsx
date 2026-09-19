import type { ReactNode } from 'react'
import { View } from 'react-native'
import { VidroFosco } from '@/components/marquise/VidroFosco'
import { partnerDesign } from '@/lib/partner-design'
import { useLuzDoDia } from '@/lib/luz-do-dia'
import { usePreferencias } from '@/store/usePreferencias'

const { colors, radius, spacing } = partnerDesign

/**
 * A folha clara que sobe por cima da marquise: canvas zinco-fumê, raio
 * `md` no topo, `marginTop: -24` sobre a fachada, vidro fosco (nuvens SVG
 * + luz do dia, se a preferência estiver ligada) recortado no raio.
 *
 * Aqui mora o ACERVO — histórico, listas, formulários, ajustes — em
 * cartões `surface` sem borda sob letreiros (ui/SecaoFolha).
 */
export function Folha({
  children,
  paddingBottom = spacing.tabBarHeight,
  paddingTop = 30,
  gap = 28,
}: {
  children: ReactNode
  /** Reserva de rolagem no pé — tab bar (default) ou CTA fixo. */
  paddingBottom?: number
  paddingTop?: number
  gap?: number
}) {
  const luzAtiva = usePreferencias((s) => s.luzDoDia)
  const luz = useLuzDoDia(luzAtiva)

  return (
    <View
      style={{
        flex: 1,
        marginTop: -24,
        backgroundColor: colors.canvas,
        borderTopLeftRadius: radius.md,
        borderTopRightRadius: radius.md,
        paddingTop,
        paddingBottom,
        overflow: 'hidden',
        gap,
      }}
    >
      <VidroFosco luz={luz} />
      {children}
    </View>
  )
}
