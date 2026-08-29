/**
 * Diretório do shopping — a placa de wayfinding da entrada.
 *
 * Referência: o painel de diretório na porta de um shopping (a placa
 * iluminada que lista os pisos). Aqui ele vira uma régua de placas brancas
 * sobre o canvas fumê — elevação por luminosidade, como manda o sistema —
 * rotulada com o filete de sinalização (`DIRETÓRIO ——— N PISOS`).
 *
 * Tocar numa placa NÃO navega: desce a própria home até o corredor do piso
 * (scroll ancorado — o "elevador" do prédio). Por isso o componente só
 * conhece slugs e o callback; quem mede e rola é a TelaHome.
 *
 * Monocromático de propósito: nada de 9 matizes tipo app de delivery.
 * A identidade de cada piso vem do ícone de linha (ConsumerIcon) — o emoji
 * declarado em PISOS (@mallevo/lib) é fallback de web/admin, nunca aparece
 * aqui.
 */
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ConsumerIcon, type ConsumerIconName } from '@/components/ConsumerIcon'
import { Skeleton } from '@/components/ui/Skeleton'
import { Vidro } from '@/components/ui/Vidro'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius } = consumerDesign

/** Piso curatorial → ícone de linha da sinalização. */
export const ICONE_POR_PISO: Record<string, ConsumerIconName> = {
  'praca-alimentacao': 'utensils',
  'moda-estilo': 'hanger',
  saude: 'pulse',
  beleza: 'scissors',
  pet: 'paw',
  'casa-vida': 'armchair',
  mercado: 'basket',
  servicos: 'wrench',
  'presentes-diversao': 'gift',
}

/**
 * Nome curto para a placa do diretório — placa de sinalização abrevia
 * ("Alimentação", não "Praça de Alimentação"). O letreiro do corredor,
 * lá embaixo, mantém o nome completo do piso.
 */
const NOME_CURTO: Record<string, string> = {
  'praca-alimentacao': 'Alimentação',
  'moda-estilo': 'Moda',
  saude: 'Saúde',
  beleza: 'Beleza',
  pet: 'Pet',
  'casa-vida': 'Casa & Vida',
  mercado: 'Mercado',
  servicos: 'Serviços',
  'presentes-diversao': 'Presentes',
}

export interface PisoDiretorio {
  slug: string
  nome: string
}

const rotuloMicro = {
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.2,
  color: colors.inkSoft,
}

export function Diretorio({
  pisos,
  carregando,
  aoTocarPiso,
}: {
  pisos: PisoDiretorio[]
  carregando?: boolean
  aoTocarPiso: (slug: string) => void
}) {
  if (!carregando && pisos.length === 0) return null

  return (
    <View style={{ marginTop: 26 }}>
      {/* Filete de sinalização: rótulo — linha — contagem de pisos. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 24,
          marginBottom: 12,
        }}
      >
        <Text style={rotuloMicro}>DIRETÓRIO</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        {!carregando && (
          <Text style={rotuloMicro}>
            {pisos.length} {pisos.length === 1 ? 'PISO' : 'PISOS'}
          </Text>
        )}
      </View>

      {carregando ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} largura={104} altura={40} raio={radius.pill} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {pisos.map((piso) => (
            <TouchableOpacity
              key={piso.slug}
              onPress={() => aoTocarPiso(piso.slug)}
              activeOpacity={consumerDesign.opacity.pressed}
            >
              <Vidro raio={radius.pill}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    height: 40,
                    paddingHorizontal: 15,
                  }}
                >
                  <ConsumerIcon
                    name={ICONE_POR_PISO[piso.slug] ?? 'store'}
                    size={15.5}
                    color={colors.ink}
                    strokeWidth={1.8}
                  />
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}
                  >
                    {NOME_CURTO[piso.slug] ?? piso.nome}
                  </Text>
                </View>
              </Vidro>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
