import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'
import { formatarDistancia, formatarDuracao } from '@/lib/rota'
import type { OfertaRota } from '@/store/useRotaStore'

interface Props {
  oferta: OfertaRota
  onAceitar: () => void
  onRecusar: () => void
  processando?: boolean
}

/**
 * Oferta de rota do despacho automático (docs/31 §3).
 *
 * Mostra o ganho TOTAL e o número de paradas antes do aceite — é a
 * contrapartida de rota agrupada prometida em docs/31 §10 (risco
 * "entregadores rejeitarem rotas agrupadas"): o entregador precisa ver
 * que ganha mais, não apenas que anda mais.
 */
export function OfertaRotaCard({ oferta, onAceitar, onRecusar, processando }: Props) {
  const { colors, radius } = courierDesign
  const [segundos, setSegundos] = useState(() => restantes(oferta.expira_em))

  useEffect(() => {
    const t = setInterval(() => setSegundos(restantes(oferta.expira_em)), 1000)
    return () => clearInterval(t)
  }, [oferta.expira_em])

  const agrupada = oferta.drops > 1
  const expirando = segundos <= 10

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: agrupada ? colors.accent : colors.line,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Ganho + contagem regressiva */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>
            {formatarReais(oferta.ganho_total)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>
            {agrupada ? `${oferta.drops} entregas na mesma rota` : 'Entrega única'}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: expirando ? colors.danger : colors.accentSoft,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.pill,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: expirando ? colors.white : colors.ink,
            }}
          >
            {segundos > 0 ? `${segundos}s` : 'expirando'}
          </Text>
        </View>
      </View>

      {/* Métricas da rota */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
        <Metrica icone="route" valor={formatarDistancia(oferta.distancia_total_m)} rotulo="distância" />
        <Metrica icone="clock" valor={formatarDuracao(oferta.duracao_estimada_s)} rotulo="estimado" />
        <Metrica icone="package" valor={`${oferta.drops}`} rotulo={oferta.drops > 1 ? 'paradas' : 'parada'} />
      </View>

      {/* Flags de carga que mudam o manuseio */}
      {(oferta.carga_refrigerada || oferta.carga_fragil || oferta.carga_porte === 'G' || oferta.carga_porte === 'XG') && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {oferta.carga_refrigerada && <Tag texto="Refrigerado" cor={colors.warning} />}
          {oferta.carga_fragil && <Tag texto="Frágil" cor={colors.warning} />}
          {(oferta.carga_porte === 'G' || oferta.carga_porte === 'XG') && (
            <Tag texto={`Carga ${oferta.carga_porte}`} cor={colors.inkMuted} />
          )}
        </View>
      )}

      {/* Coleta → drops */}
      <View style={{ marginTop: 14, gap: 8 }}>
        <Ponto cor={colors.ink} rotulo="Coletar em" titulo={oferta.store_nome} sub={oferta.store_endereco} />
        {oferta.enderecos_entrega.map((end, i) => (
          <Ponto
            key={`${end}-${i}`}
            cor={colors.accentStrong}
            rotulo={agrupada ? `Entrega ${i + 1}` : 'Entregar em'}
            titulo={end}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity
          onPress={onRecusar}
          disabled={processando}
          activeOpacity={0.7}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: colors.line,
            paddingVertical: 13,
            borderRadius: radius.sm,
            alignItems: 'center',
            opacity: processando ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.inkMuted, fontWeight: '600' }}>Recusar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAceitar}
          disabled={processando}
          activeOpacity={0.85}
          style={{
            flex: 2,
            backgroundColor: colors.ink,
            paddingVertical: 13,
            borderRadius: radius.sm,
            alignItems: 'center',
            opacity: processando ? 0.6 : 1,
          }}
        >
          {processando ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={{ color: colors.white, fontWeight: '800' }}>
              {agrupada ? 'Aceitar rota' : 'Aceitar entrega'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function Metrica({ icone, valor, rotulo }: { icone: any; valor: string; rotulo: string }) {
  const { colors } = courierDesign
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <CourierIcon name={icone} size={15} color={colors.inkSoft} />
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{valor}</Text>
        <Text style={{ fontSize: 10, color: colors.inkSoft }}>{rotulo}</Text>
      </View>
    </View>
  )
}

function Tag({ texto, cor }: { texto: string; cor: string }) {
  const { radius } = courierDesign
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: cor,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radius.pill,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: cor }}>{texto}</Text>
    </View>
  )
}

function Ponto({
  cor,
  rotulo,
  titulo,
  sub,
}: {
  cor: string
  rotulo: string
  titulo: string
  sub?: string | null
}) {
  const { colors } = courierDesign
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: cor, marginTop: 5 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase' }}>
          {rotulo}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
          {titulo}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 11, color: colors.inkSoft }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function restantes(expiraEm: string): number {
  return Math.max(0, Math.round((new Date(expiraEm).getTime() - Date.now()) / 1000))
}
