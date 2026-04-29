import { useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useEntregaStore } from '@/store/useEntregaStore'
import { useLocalizacaoStore } from '@/store/useLocalizacaoStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'

export default function TelaPerfil() {
  const { courier, user, setCourier, limpar: limparAuth } = useAuthStore()
  const { setAtiva } = useEntregaStore()
  const { limpar: limparLoc } = useLocalizacaoStore()
  const [abrindoStripe, setAbrindoStripe] = useState(false)
  const [atualizandoFoto, setAtualizandoFoto] = useState(false)
  const [avatarErro, setAvatarErro] = useState(false)
  const { colors, radius } = courierDesign

  async function handleAtualizarFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para alterar a foto.')
      return
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (resultado.canceled || !resultado.assets[0]) return

    setAtualizandoFoto(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !courier?.id) return

      const uri = resultado.assets[0].uri
      const caminho = `${session.user.id}/perfil.jpg`

      const formData = new FormData()
      formData.append('file', { uri, name: 'perfil.jpg', type: 'image/jpeg' } as any)

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/courier-docs/${caminho}`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      )

      if (!res.ok) throw new Error('Upload falhou')

      const { data } = supabase.storage.from('courier-docs').getPublicUrl(caminho)
      const novaUrl = `${data.publicUrl}?t=${Date.now()}`

      await supabase.from('couriers').update({ foto_url: novaUrl }).eq('id', courier.id)

      setCourier({ ...courier, foto_url: novaUrl })
      setAvatarErro(false)
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a foto. Tente novamente.')
    } finally {
      setAtualizandoFoto(false)
    }
  }

  async function handleAbrirStripe() {
    if (!courier?.stripe_account_id) return
    setAbrindoStripe(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAbrindoStripe(false); return }

    const resposta = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/courier-stripe-info`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )
    const dados = await resposta.json()
    setAbrindoStripe(false)

    if (dados.link_express) Linking.openURL(dados.link_express)
  }

  async function handleSair() {
    Alert.alert('Sair da conta', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          if (courier?.id) {
            await supabase.from('couriers').update({ online: false }).eq('id', courier.id)
          }
          await supabase.auth.signOut()
          limparAuth()
          setAtiva(null)
          limparLoc()
          router.replace('/(auth)/entrar')
        },
      },
    ])
  }

  const inicial = courier?.nome?.charAt(0).toUpperCase() ?? '?'
  const stripeOk = courier?.stripe_onboarding_ok ?? false

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabeçalho */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: '800',
          color: colors.ink,
          letterSpacing: -0.5,
        }}>
          Perfil
        </Text>
      </View>

      {/* Card do entregador */}
      <View style={{
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 12,
      }}>
        {/* Avatar */}
        <TouchableOpacity onPress={handleAtualizarFoto} activeOpacity={0.8} disabled={atualizandoFoto}>
          <View style={{ width: 56, height: 56 }}>
            {courier?.foto_url && !avatarErro ? (
              <Image
                source={{ uri: courier.foto_url }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                onError={() => setAvatarErro(true)}
              />
            ) : (
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>
                  {inicial}
                </Text>
              </View>
            )}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: colors.ink,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {atualizandoFoto
                ? <ActivityIndicator size="small" color={colors.accent} style={{ transform: [{ scale: 0.6 }] }} />
                : <CourierIcon name="camera" size={11} color={colors.accent} strokeWidth={2} />
              }
            </View>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.ink,
            marginBottom: 2,
          }}>
            {courier?.nome ?? 'Entregador'}
          </Text>
          <Text style={{
            fontSize: 13,
            color: colors.inkSoft,
            marginBottom: 6,
          }}>
            {user?.email ?? ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: courier?.online ? colors.success : colors.line,
            }} />
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>
              {courier?.online ? 'Online' : 'Offline'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.line }}>·</Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>
              {courier?.tipo === 'proprio' ? 'Entregador próprio' : 'Autônomo'}
            </Text>
          </View>
        </View>
      </View>

      {/* Conta de recebimentos */}
      <View style={{
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 18,
        marginBottom: 12,
      }}>
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.inkSoft,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}>
          Recebimentos
        </Text>

        {/* Status */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}>
          <View style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            backgroundColor: stripeOk
              ? 'rgba(142,209,79,0.12)'
              : 'rgba(242,184,75,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CourierIcon
              name={stripeOk ? 'check' : 'wallet'}
              size={16}
              color={stripeOk ? colors.success : colors.warning}
              strokeWidth={stripeOk ? 2.4 : 1.8}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
              {stripeOk ? 'Conta verificada e ativa' : 'Configuração pendente'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 1 }}>
              {stripeOk
                ? 'Pagamentos serão transferidos automaticamente'
                : 'Configure para receber seus pagamentos'}
            </Text>
          </View>
        </View>

        {/* Botão de ação */}
        {stripeOk ? (
          <TouchableOpacity
            onPress={handleAbrirStripe}
            disabled={abrindoStripe}
            activeOpacity={0.75}
            style={{
              height: 44,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: abrindoStripe ? 0.6 : 1,
            }}
          >
            {abrindoStripe ? (
              <ActivityIndicator size="small" color={colors.inkMuted} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkMuted }}>
                Acessar painel Stripe
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/stripe-onboarding')}
            activeOpacity={0.85}
            style={{
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
              Configurar recebimentos
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Veículo */}
      {courier?.veiculo_tipo && (
        <View style={{
          marginHorizontal: 16,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 18,
          marginBottom: 12,
        }}>
          <Text style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.inkSoft,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Veículo
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 34,
              height: 34,
              borderRadius: radius.sm,
              backgroundColor: colors.canvasAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CourierIcon name="route" size={16} color={colors.inkMuted} strokeWidth={1.8} />
            </View>
            <Text style={{ fontSize: 14, color: colors.ink }}>
              {courier.veiculo_tipo.replace('_', ' ')}
              {courier.veiculo_placa ? `  ·  ${courier.veiculo_placa.toUpperCase()}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Opções */}
      <View style={{
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: 12,
        overflow: 'hidden',
      }}>
        {[
          { label: 'Termos de uso', icon: 'shield' as const },
          { label: 'Suporte',       icon: 'phone'  as const },
        ].map(({ label, icon }, i) => (
          <TouchableOpacity
            key={label}
            activeOpacity={0.7}
            onPress={() => {}}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: colors.line,
            }}
          >
            <View style={{
              width: 34,
              height: 34,
              borderRadius: radius.sm,
              backgroundColor: colors.canvasAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CourierIcon name={icon} size={16} color={colors.inkMuted} strokeWidth={1.8} />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.ink }}>
              {label}
            </Text>
            <CourierIcon name="back" size={16} color={colors.inkSoft} strokeWidth={2}
              // espelha o chevron → rotate via wrapper
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sair */}
      <TouchableOpacity
        onPress={handleSair}
        activeOpacity={0.75}
        style={{
          marginHorizontal: 16,
          height: 52,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: 'rgba(255,109,94,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <CourierIcon name="logout" size={16} color={colors.danger} strokeWidth={1.8} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>
          Sair da conta
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 12, color: colors.inkSoft, textAlign: 'center' }}>
        Versão 1.0.0
      </Text>
    </ScrollView>
  )
}
