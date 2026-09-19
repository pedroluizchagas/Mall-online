import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'
import { consumerDesign } from '@/lib/consumer-design'
import type { LuzDoDia } from '@/lib/luz-do-dia'

const { colors } = consumerDesign

/**
 * Vidro fosco da folha — referência: o fundo difuso do iOS ("send with
 * effect"), que não é cinza chapado e sim um material nublado. Sobre o
 * canvas zinco, quatro nuvens em SVG (só tokens, nada de hex novo):
 *
 * 1. sombra da fachada dissolvendo do topo (`marquee` 7% → 0);
 * 2. nuvem fria à esquerda (`inkSoft`) e um fôlego azul embaixo (`info`) —
 *    as nuvens frias do vidro iOS;
 * 3. bloom leitoso à direita (`white` 55% → 0) — a mancha clara do fosco;
 * 4. o neon da marquise ATRAVESSANDO o vidro no canto (`marqueeGlow` 5%) —
 *    continuidade física com a fachada acima; o iOS não tem essa.
 *
 * E a LUZ DO DIA (`luz`, lib/luz-do-dia.ts), quando ativa: o salão recebe
 * a luz de fora. Duas camadas na cor da fase, por cima das nuvens:
 *
 * 5. o véu — tinta descendo do topo (≤ 14% × intensidade) e dissolvendo
 *    até o canvas limpo em ~60% do campo;
 * 6. o sol — bloom radial na borda superior que caminha de leste (esquerda,
 *    amanhecer) a oeste (direita, entardecer) e se apaga à noite.
 *
 * O canvas NUNCA muda: a luz é véu, e os alphas continuam baixos o bastante
 * para cards, fios e placas lerem exatamente como sempre. À noite a folha
 * segue clara — só mais fria e um degrau mais fumê, como um salão aceso por
 * dentro; dark de verdade seria outra tela.
 *
 * Alphas ≤ 7% (branco ≤ 55%; luz ≤ 14%): no squint é um fumê nublado,
 * nunca "sujo". O campo vive nos primeiros ~860px (onde o olho pousa);
 * abaixo, o canvas segue limpo — a dissolução é imperceptível nessas
 * opacidades.
 */
export function VidroFosco({ luz }: { luz: LuzDoDia | null }) {
  return (
    <Svg
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 860 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="sombraFachada" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.marquee} stopOpacity={0.07} />
          <Stop offset="0.28" stopColor={colors.marquee} stopOpacity={0.025} />
          <Stop offset="0.55" stopColor={colors.marquee} stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id="nuvemFria" cx="12%" cy="22%" r="58%">
          <Stop offset="0" stopColor={colors.inkSoft} stopOpacity={0.07} />
          <Stop offset="1" stopColor={colors.inkSoft} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="folegoAzul" cx="25%" cy="78%" r="50%">
          <Stop offset="0" stopColor={colors.info} stopOpacity={0.04} />
          <Stop offset="1" stopColor={colors.info} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="bloomLeitoso" cx="88%" cy="38%" r="60%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="neonAtravessa" cx="92%" cy="0%" r="42%">
          <Stop offset="0" stopColor={colors.marqueeGlow} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.marqueeGlow} stopOpacity={0} />
        </RadialGradient>
        {luz && (
          <>
            <LinearGradient id="veuDoDia" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={luz.cor} stopOpacity={0.14 * luz.intensidade} />
              <Stop offset="0.28" stopColor={luz.cor} stopOpacity={0.06 * luz.intensidade} />
              <Stop offset="0.62" stopColor={luz.cor} stopOpacity={0} />
            </LinearGradient>
            <RadialGradient
              id="solDoDia"
              cx={`${Math.round(luz.solX * 100)}%`}
              cy="4%"
              r="46%"
            >
              <Stop offset="0" stopColor={luz.cor} stopOpacity={0.18 * luz.solForca} />
              <Stop offset="0.5" stopColor={luz.cor} stopOpacity={0.06 * luz.solForca} />
              <Stop offset="1" stopColor={luz.cor} stopOpacity={0} />
            </RadialGradient>
          </>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill="url(#nuvemFria)" />
      <Rect width="100%" height="100%" fill="url(#folegoAzul)" />
      <Rect width="100%" height="100%" fill="url(#bloomLeitoso)" />
      <Rect width="100%" height="100%" fill="url(#neonAtravessa)" />
      {luz && (
        <>
          <Rect width="100%" height="100%" fill="url(#veuDoDia)" />
          <Rect width="100%" height="100%" fill="url(#solDoDia)" />
        </>
      )}
      <Rect width="100%" height="100%" fill="url(#sombraFachada)" />
    </Svg>
  )
}

