import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Mask,
} from 'react-native-svg'
import { courierDesign } from '@/lib/courier-design'

const W = 100
const H = 130

const ORIGIN = { x: 20, y: 110 }
const DEST = { x: 86, y: 22 }
const MID = { x: 56, y: 64 }

const ROUTE = `M ${ORIGIN.x} ${ORIGIN.y}
               C ${ORIGIN.x + 14} ${ORIGIN.y - 22},
                 40 90,
                 ${MID.x} ${MID.y}
               C 64 46, 76 30, ${DEST.x} ${DEST.y}`

interface Props {
  width?: number | string
  height?: number | string
}

export function RotaIlustrada({ width = '100%', height = '100%' }: Props) {
  const { accent, accentStrong } = courierDesign.colors

  const STREET = 'rgba(255,255,255,0.07)'
  const STREET_SOFT = 'rgba(255,255,255,0.045)'
  const STREET_THIN = 'rgba(255,255,255,0.035)'

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id="alphaGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.22" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.65" />
          <Stop offset="0.85" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
        </LinearGradient>
        <Mask id="fade" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <Rect x={0} y={0} width={W} height={H} fill="url(#alphaGrad)" />
        </Mask>

        <RadialGradient
          id="routeGlow"
          cx={MID.x}
          cy={MID.y}
          r="58"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={accent} stopOpacity="0.18" />
          <Stop offset="0.7" stopColor={accent} stopOpacity="0.04" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>

        <LinearGradient
          id="routeGrad"
          x1={`${ORIGIN.x}`}
          y1={`${ORIGIN.y}`}
          x2={`${DEST.x}`}
          y2={`${DEST.y}`}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={accentStrong} stopOpacity="0.9" />
          <Stop offset="1" stopColor={accent} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <G mask="url(#fade)">
        {/* Glow ambiente — sem retângulo escuro próprio, deixa o painel respirar */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#routeGlow)" />

        {/* Malha de ruas — translúcidas para deitar sobre qualquer surface escura */}
        <G fill="none" strokeLinecap="round">
          <Path d="M 24 24 Q 50 22, 78 30 T 110 28" stroke={STREET} strokeWidth={1.4} />
          <Path d="M 24 58 Q 46 56, 70 62 T 110 60" stroke={STREET} strokeWidth={1.4} />
          <Path d="M 24 96 Q 50 92, 78 100 T 110 98" stroke={STREET} strokeWidth={1.4} />
          <Path d="M 38 -6 Q 40 30, 46 60 T 52 130" stroke={STREET} strokeWidth={1.2} />
          <Path d="M 72 -6 Q 70 30, 76 64 T 82 130" stroke={STREET} strokeWidth={1.2} />

          <Path d="M 24 12 Q 50 10, 78 16 T 110 14" stroke={STREET_SOFT} strokeWidth={0.9} />
          <Path d="M 24 40 Q 48 38, 72 44 T 110 42" stroke={STREET_SOFT} strokeWidth={0.9} />
          <Path d="M 24 74 Q 50 70, 78 78 T 110 76" stroke={STREET_SOFT} strokeWidth={0.9} />
          <Path d="M 24 112 Q 48 108, 76 116 T 110 114" stroke={STREET_SOFT} strokeWidth={0.9} />
          <Path d="M 56 -6 Q 58 32, 62 70 T 68 130" stroke={STREET_SOFT} strokeWidth={0.8} />
          <Path d="M 92 -6 Q 94 30, 98 66 T 102 130" stroke={STREET_SOFT} strokeWidth={0.8} />

          <Path d="M 40 18 L 60 18" stroke={STREET_THIN} strokeWidth={0.6} />
          <Path d="M 70 50 L 84 50" stroke={STREET_THIN} strokeWidth={0.6} />
          <Path d="M 44 86 L 64 86" stroke={STREET_THIN} strokeWidth={0.6} />
          <Path d="M 76 86 L 96 86" stroke={STREET_THIN} strokeWidth={0.6} />
          <Path d="M 50 122 L 70 120" stroke={STREET_THIN} strokeWidth={0.6} />
          <Path d="M 76 6 Q 84 18, 94 14" stroke={STREET_THIN} strokeWidth={0.6} />
          <Path d="M 76 110 Q 86 116, 96 110" stroke={STREET_THIN} strokeWidth={0.6} />
        </G>

        {/* Halo do traçado */}
        <Path
          d={ROUTE}
          stroke={accent}
          strokeWidth={12}
          opacity={0.07}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={ROUTE}
          stroke={accent}
          strokeWidth={7}
          opacity={0.16}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Traçado principal */}
        <Path
          d={ROUTE}
          stroke="url(#routeGrad)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Nó de origem */}
        <Circle cx={ORIGIN.x} cy={ORIGIN.y} r={5} fill={accent} opacity={0.22} />
        <Circle cx={ORIGIN.x} cy={ORIGIN.y} r={2.6} fill={accent} />

        {/* Nó de destino */}
        <Circle cx={DEST.x} cy={DEST.y} r={5} fill={accent} opacity={0.22} />
        <Circle cx={DEST.x} cy={DEST.y} r={2.6} fill={accent} />
      </G>
    </Svg>
  )
}
