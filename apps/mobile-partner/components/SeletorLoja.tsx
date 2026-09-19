import { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { PartnerIcon } from '@/components/PartnerIcon'
import { TijoloLoja } from '@/components/TijoloLoja'
import { FolhaModal } from '@/components/ui/FolhaModal'
import { CartaoFolha } from '@/components/ui/SecaoFolha'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Seletor de loja ativa para tenant multi-loja
 * (docs/partner-app/04-stage-2-auth-gate.md). A troca persiste em
 * AsyncStorage via setLojaAtiva; todas as listas/uploads usam lojaAtivaId.
 *
 * Duas peles: `escuro` (pílula de vidro na marquise — tijolo + nome +
 * chevron) e clara (pílula `surface` nos módulos). A lista sobe numa
 * `FolhaModal` sobre canvas, com a loja atual marcada por fio accent.
 */
export function SeletorLoja({ escuro = false }: { escuro?: boolean }) {
  const { lojas, lojaAtivaId, setLojaAtiva } = useAuthStore()
  const [aberto, setAberto] = useState(false)
  const { colors, radius, shadow } = partnerDesign

  const lojaAtiva = lojas.find((l) => l.id === lojaAtivaId) ?? lojas[0]
  if (!lojaAtiva) return null

  const multiLoja = lojas.length > 1
  const corTexto = escuro ? colors.white : colors.ink
  const corChevron = escuro ? colors.marqueeInkSoft : colors.inkSoft

  return (
    <>
      <TouchableOpacity
        onPress={() => multiLoja && setAberto(true)}
        activeOpacity={multiLoja ? partnerDesign.opacity.pressedSoft : 1}
        accessibilityRole={multiLoja ? 'button' : 'text'}
        accessibilityLabel={
          multiLoja ? `Loja ativa: ${lojaAtiva.nome}. Trocar loja` : `Loja: ${lojaAtiva.nome}`
        }
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: escuro ? colors.marqueeGlass : colors.surface,
            borderWidth: escuro ? 1 : 0,
            borderColor: colors.marqueeLine,
            borderRadius: radius.pill,
            paddingVertical: 6,
            paddingLeft: 6,
            paddingRight: multiLoja ? 12 : 14,
            gap: 8,
            maxWidth: '100%',
          },
          escuro ? null : shadow.soft,
        ]}
      >
        <TijoloLoja nome={lojaAtiva.nome} logoUrl={lojaAtiva.logo_url} tamanho={28} raio={14} />
        <Text
          numberOfLines={1}
          style={{ color: corTexto, fontSize: 13.5, fontWeight: '700', flexShrink: 1 }}
        >
          {lojaAtiva.nome}
        </Text>
        {multiLoja && (
          <PartnerIcon name="chevron-down" size={13} color={corChevron} strokeWidth={2.2} />
        )}
      </TouchableOpacity>

      <FolhaModal
        visivel={aberto}
        sobrelinha="Publicando e gerenciando como"
        titulo="Suas lojas"
        fundo="canvas"
        onFechar={() => setAberto(false)}
      >
        <CartaoFolha padding={0}>
          {lojas.map((item, i) => {
            const ativa = item.id === lojaAtivaId
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setLojaAtiva(item.id)
                  setAberto(false)
                }}
                activeOpacity={partnerDesign.opacity.pressedSoft}
                accessibilityRole="button"
                accessibilityState={{ selected: ativa }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                }}
              >
                <TijoloLoja nome={item.nome} logoUrl={item.logo_url} tamanho={40} />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: colors.ink,
                    fontSize: 15,
                    fontWeight: ativa ? '800' : '600',
                  }}
                >
                  {item.nome}
                </Text>
                {ativa ? (
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PartnerIcon name="check" size={13} color={colors.accent} strokeWidth={2.6} />
                  </View>
                ) : (
                  <PartnerIcon name="chevron-right" size={16} color={colors.inkSoft} />
                )}
              </TouchableOpacity>
            )
          })}
        </CartaoFolha>
      </FolhaModal>
    </>
  )
}
