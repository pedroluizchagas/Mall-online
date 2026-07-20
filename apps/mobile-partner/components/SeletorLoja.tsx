import { useState } from 'react'
import { FlatList, Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Seletor de loja ativa para tenant multi-loja
// (docs/partner-app/04-stage-2-auth-gate.md). A troca persiste em
// AsyncStorage via setLojaAtiva; todas as listas/uploads usam lojaAtivaId.

export function SeletorLoja() {
  const { lojas, lojaAtivaId, setLojaAtiva } = useAuthStore()
  const [aberto, setAberto] = useState(false)
  const { colors, radius, spacing, typography, opacity } = partnerDesign

  const lojaAtiva = lojas.find((l) => l.id === lojaAtivaId) ?? lojas[0]
  if (!lojaAtiva) return null

  const multiLoja = lojas.length > 1

  return (
    <>
      <TouchableOpacity
        onPress={() => multiLoja && setAberto(true)}
        activeOpacity={multiLoja ? 0.7 : 1}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          paddingVertical: 8,
          paddingLeft: 10,
          paddingRight: multiLoja ? 14 : 16,
          gap: 8,
        }}
      >
        <AvatarLoja nome={lojaAtiva.nome} logoUrl={lojaAtiva.logo_url} />
        <Text
          numberOfLines={1}
          style={{
            color: colors.ink,
            fontSize: typography.bodySm.size,
            fontWeight: '700',
            maxWidth: 160,
          }}
        >
          {lojaAtiva.nome}
        </Text>
        {multiLoja && (
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <PartnerIcon name="back" size={13} color={colors.inkSoft} strokeWidth={2.2} />
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable
          onPress={() => setAberto(false)}
          style={{
            flex: 1,
            backgroundColor: `rgba(17, 18, 22, ${opacity.overlay})`,
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing['4xl'],
              paddingHorizontal: spacing.lg,
              maxHeight: '60%',
            }}
          >
            <Text
              style={{
                color: colors.inkSoft,
                fontSize: typography.micro.size,
                fontWeight: typography.micro.weight,
                letterSpacing: typography.micro.tracking,
                textTransform: 'uppercase',
                marginBottom: spacing.md,
                marginLeft: spacing.xs,
              }}
            >
              Publicando e gerenciando como
            </Text>
            <FlatList
              data={lojas}
              keyExtractor={(l) => l.id}
              renderItem={({ item }) => {
                const ativa = item.id === lojaAtivaId
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setLojaAtiva(item.id)
                      setAberto(false)
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.sm,
                      backgroundColor: ativa ? colors.accentSoft : 'transparent',
                      gap: 10,
                    }}
                  >
                    <AvatarLoja nome={item.nome} logoUrl={item.logo_url} tamanho={36} />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: colors.ink,
                        fontSize: typography.bodyLg.size,
                        fontWeight: ativa ? '800' : '500',
                      }}
                    >
                      {item.nome}
                    </Text>
                    {ativa && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: radius.pill,
                          backgroundColor: colors.accentStrong,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function AvatarLoja({ nome, logoUrl, tamanho = 28 }: { nome: string; logoUrl: string | null; tamanho?: number }) {
  const { colors, radius, typography } = partnerDesign

  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: tamanho, height: tamanho, borderRadius: radius.pill }}
      />
    )
  }

  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: radius.pill,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.accent,
          fontSize: tamanho * 0.42,
          fontWeight: typography.label.weight,
        }}
      >
        {nome.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}
