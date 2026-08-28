import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useCartStore } from '@/store/useCartStore'
import { useOrderStore } from '@/store/useOrderStore'
import { useTotalSeguidas } from '@/store/useSeguidas'
import { useTotalFavoritos } from '@/store/useFavoritos'
import { GerenciarEnderecos } from '@/components/GerenciarEnderecos'
import { EditarPerfil } from '@/components/EditarPerfil'
import { AvatarPerfil } from '@/components/AvatarPerfil'
import { garantirConsumer } from '@/lib/perfil'
import { HeaderTela } from '@/components/HeaderTela'
import { Card } from '@/components/ui/Card'
import { Botao } from '@/components/ui/Botao'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, spacing } = consumerDesign

type SecaoAtiva = null | 'enderecos' | 'editar'

export default function TelaPerfil() {
  const { consumer, user, limpar: limparAuth } = useAuthStore()
  const { limparCarrinho } = useCartStore()
  const { limpar: limparOrder } = useOrderStore()
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>(null)
  const [atualizando, setAtualizando] = useState(false)

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (u) await garantirConsumer(u)
    setAtualizando(false)
  }, [])

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          limparAuth()
          limparCarrinho()
          limparOrder()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const nomeExibido = consumer?.nome ?? 'Usuário'
  const qtdEnderecos = consumer?.enderecos?.length ?? 0
  const qtdSeguindo = useTotalSeguidas()
  const qtdFavoritos = useTotalFavoritos()

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HeaderTela variante="simples" titulo="Perfil" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.tabBarHeight }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        }
      >
        {/* Card de identidade */}
        <View style={{ paddingHorizontal: 16 }}>
          <Card variante="escuro" raio="lg" preenchimento="lg">
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
            >
              <AvatarPerfil tamanho={56} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: colors.white,
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={1}
                >
                  {nomeExibido}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.inkSoft,
                    marginTop: 2,
                    fontWeight: '500',
                  }}
                  numberOfLines={1}
                >
                  {user?.email ?? ''}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Conta */}
        <Secao titulo="CONTA">
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.line,
              overflow: 'hidden',
            }}
          >
            <ItemPerfil
              icone="pin"
              rotulo="Endereços"
              badge={String(qtdEnderecos)}
              expandido={secaoAtiva === 'enderecos'}
              aoTocar={() =>
                setSecaoAtiva((s) => (s === 'enderecos' ? null : 'enderecos'))
              }
            />
            <ItemPerfil
              icone="edit"
              rotulo="Editar perfil"
              expandido={secaoAtiva === 'editar'}
              aoTocar={() =>
                setSecaoAtiva((s) => (s === 'editar' ? null : 'editar'))
              }
            />
            <ItemPerfil
              icone="users"
              rotulo="Lojas que sigo"
              badge={String(qtdSeguindo)}
              aoTocar={() => router.push('/(tabs)/seguindo')}
            />
            <ItemPerfil
              icone="heart"
              rotulo="Favoritos"
              badge={String(qtdFavoritos)}
              aoTocar={() => router.push('/(tabs)/favoritos')}
            />
            <ItemPerfil
              icone="orders"
              rotulo="Meus pedidos"
              aoTocar={() => router.push('/(tabs)/pedidos')}
              ultimo
            />
          </View>
        </Secao>

        {/* Editor expandido */}
        {secaoAtiva === 'editar' && (
          <EditarPerfil onFechar={() => setSecaoAtiva(null)} />
        )}

        {/* Endereços expandido */}
        {secaoAtiva === 'enderecos' && (
          <GerenciarEnderecos
            enderecos={consumer?.enderecos ?? []}
            onAtualizar={(novos) => {
              const c = useAuthStore.getState().consumer
              if (c)
                useAuthStore.getState().setConsumer({ ...c, enderecos: novos })
            }}
          />
        )}

        {/* Ajuda */}
        <Secao titulo="AJUDA">
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.line,
              overflow: 'hidden',
            }}
          >
            <ItemPerfil
              icone="file"
              rotulo="Termos de uso"
              aoTocar={() => {
                /* TODO */
              }}
            />
            <ItemPerfil
              icone="shield"
              rotulo="Política de privacidade"
              aoTocar={() => {
                /* TODO */
              }}
              ultimo
            />
          </View>
        </Secao>

        {/* Sair */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Botao
            label="Sair da conta"
            variante="danger"
            tamanho="md"
            iconeEsquerda="logout"
            onPress={handleSair}
          />
        </View>

        <Text
          style={{
            fontSize: 11,
            color: colors.inkSoft,
            textAlign: 'center',
            marginTop: 20,
            letterSpacing: 0.3,
            fontWeight: '500',
          }}
        >
          Versão 1.0.0
        </Text>
      </ScrollView>
    </View>
  )
}

function Secao({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <View style={{ marginTop: 28 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.inkMuted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          paddingHorizontal: 24,
          marginBottom: 10,
        }}
      >
        {titulo}
      </Text>
      <View style={{ paddingHorizontal: 16 }}>{children}</View>
    </View>
  )
}

function ItemPerfil({
  icone,
  rotulo,
  badge,
  expandido,
  aoTocar,
  ultimo,
}: {
  icone: ConsumerIconName
  rotulo: string
  badge?: string
  expandido?: boolean
  aoTocar: () => void
  ultimo?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: expandido ? colors.accentSoft : colors.canvasAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon
          name={icone}
          size={18}
          color={expandido ? colors.accent : colors.ink}
        />
      </View>

      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '600',
          color: colors.ink,
        }}
      >
        {rotulo}
      </Text>

      {badge !== undefined && (
        <Text
          style={{
            fontSize: 13,
            color: colors.inkMuted,
            fontWeight: '500',
            marginRight: 4,
          }}
        >
          {badge}
        </Text>
      )}

      <ConsumerIcon
        name={expandido ? 'chevron-down' : 'chevron-right'}
        size={16}
        color={colors.inkSoft}
      />
    </TouchableOpacity>
  )
}
