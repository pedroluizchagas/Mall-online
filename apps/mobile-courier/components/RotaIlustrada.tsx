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
const DEST = { x: 76, y: 64 }
const MID = { x: 46, y: 86 }

const ROUTE = `M ${ORIGIN.x} ${ORIGIN.y}
               C 28 100, 38 94, ${MID.x} ${MID.y}
               C 56 80, 66 72, ${DEST.x} ${DEST.y}`

interface Props {
  width?: number | string
  height?: number | string
  mostrarRadar?: boolean
}

export function RotaIlustrada({ width = '100%', height = '100%', mostrarRadar = false }: Props) {
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

        <RadialGradient
          id="radarGlow"
          cx={DEST.x}
          cy={DEST.y}
          r="8"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={accent} stopOpacity="0.55" />
          <Stop offset="0.6" stopColor={accent} stopOpacity="0.18" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <G mask="url(#fade)">
        {/* Glow ambiente — sem retângulo escuro próprio, deixa o painel respirar */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#routeGlow)" />

        {/* Malha de ruas — grade ortogonal, como mapa de cidade real */}
        <G fill="none" strokeLinecap="square">
          {/* Avenidas horizontais (mais grossas) */}
          <Path d="M -6 14 L 110 14" stroke={STREET} strokeWidth={1.4} />
          <Path d="M -6 46 L 110 46" stroke={STREET} strokeWidth={1.4} />
          <Path d="M -6 84 L 110 84" stroke={STREET} strokeWidth={1.4} />
          <Path d="M -6 118 L 110 118" stroke={STREET} strokeWidth={1.4} />

          {/* Vias verticais principais */}
          <Path d="M 18 -6 L 18 136" stroke={STREET} strokeWidth={1.2} />
          <Path d="M 50 -6 L 50 136" stroke={STREET} strokeWidth={1.2} />
          <Path d="M 84 -6 L 84 136" stroke={STREET} strokeWidth={1.2} />

          {/* Ruas horizontais secundárias */}
          <Path d="M -6 28 L 110 28" stroke={STREET_SOFT} strokeWidth={0.8} />
          <Path d="M -6 60 L 110 60" stroke={STREET_SOFT} strokeWidth={0.8} />
          <Path d="M -6 72 L 110 72" stroke={STREET_SOFT} strokeWidth={0.8} />
          <Path d="M -6 100 L 110 100" stroke={STREET_SOFT} strokeWidth={0.8} />

          {/* Ruas verticais secundárias */}
          <Path d="M 32 -6 L 32 136" stroke={STREET_SOFT} strokeWidth={0.7} />
          <Path d="M 66 -6 L 66 136" stroke={STREET_SOFT} strokeWidth={0.7} />
          <Path d="M 96 -6 L 96 136" stroke={STREET_SOFT} strokeWidth={0.7} />

          {/* Diagonal — avenida principal cortando o bairro */}
          <Path d="M -6 4 L 70 136" stroke={STREET_THIN} strokeWidth={0.7} />

          {/* Detalhes finos — entradas de quadra */}
          <Path d="M 24 18 L 24 26" stroke={STREET_THIN} strokeWidth={0.5} />
          <Path d="M 58 50 L 58 58" stroke={STREET_THIN} strokeWidth={0.5} />
          <Path d="M 90 88 L 90 98" stroke={STREET_THIN} strokeWidth={0.5} />
          <Path d="M 38 104 L 38 116" stroke={STREET_THIN} strokeWidth={0.5} />
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

        {/* Nó de destino — radar (buscando) ou ponto simples */}
        {mostrarRadar ? (
          <G>
            {/* Halo externo */}
            <Circle
              cx={DEST.x}
              cy={DEST.y}
              r={18}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
            />
            {/* Halo intermediário */}
            <Circle
              cx={DEST.x}
              cy={DEST.y}
              r={11}
              fill="rgba(255,255,255,0.05)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.4}
            />
            {/* Glow do ponto */}
            <Circle cx={DEST.x} cy={DEST.y} r={9} fill="url(#radarGlow)" />
            {/* Ponto central */}
            <Circle cx={DEST.x} cy={DEST.y} r={3} fill={accent} />
          </G>
        ) : (
          <G>
            <Circle cx={DEST.x} cy={DEST.y} r={5} fill={accent} opacity={0.22} />
            <Circle cx={DEST.x} cy={DEST.y} r={2.6} fill={accent} />
          </G>
        )}
      </G>
    </Svg>
  )
}
