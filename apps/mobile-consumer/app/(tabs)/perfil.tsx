import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { abrirLink, URL_TERMOS, URL_PRIVACIDADE } from '@/lib/links'
import { GlowNeon, useFontesMarquee } from '@/components/home/Marquise'
import { VidroFosco } from '@/components/home/VidroFosco'
import { Botao } from '@/components/ui/Botao'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useLuzDoDia } from '@/lib/luz-do-dia'
import { mascaraTelefone } from '@/lib/validacao'
import { usePreferencias } from '@/store/usePreferencias'

/**
 * Perfil — a mesma arquitetura do Início: MARQUISE escura com a identidade
 * e as coleções (lojas seguidas, favoritos, endereços — moedas de vidro
 * com número), FOLHA clara (vidro fosco + luz do dia) com conta, aparência
 * e ajuda em cartões sem borda sob letreiros.
 *
 * Spec: docs/system-design/consumer/07-telas.md §7
 */

const { colors, radius, spacing } = consumerDesign

type SecaoAtiva = null | 'enderecos' | 'editar'

export default function TelaPerfil() {
  const { consumer, user, limpar: limparAuth } = useAuthStore()
  const { limparCarrinho } = useCartStore()
  const { limpar: limparOrder } = useOrderStore()
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>(null)
  const luzDoDia = usePreferencias((s) => s.luzDoDia)
  const setLuzDoDia = usePreferencias((s) => s.setLuzDoDia)
  const luz = useLuzDoDia(luzDoDia)
  const insets = useSafeAreaInsets()
  const fontes = useFontesMarquee()

  // A marquise é escura: status bar clara só enquanto a aba está em foco.
  const [focado, setFocado] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocado(true)
      return () => setFocado(false)
    }, []),
  )
  const [atualizando, setAtualizando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const onRefresh = useCallback(async () => {
    setAtualizando(true)
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (u) await garantirConsumer(u)
    setAtualizando(false)
  }, [])

  /** Encerra a sessão e zera todo estado local. */
  async function encerrarSessao() {
    await supabase.auth.signOut()
    limparAuth()
    limparCarrinho()
    limparOrder()
    router.replace('/(auth)/entrar')
  }

  async function handleSair() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: encerrarSessao },
    ])
  }

  async function excluirConta() {
    setExcluindo(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Entre novamente.')

      const resposta = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const resultado = await resposta.json()

      if (!resposta.ok) {
        // Falha parcial: os dados já foram apagados e só o login sobrou.
        // Manter a pessoa logada numa conta esvaziada seria pior do que
        // deslogar — ela só veria "Conta excluída" no lugar do próprio nome.
        if (resultado.dados_removidos) {
          Alert.alert('Conta excluída parcialmente', resultado.error, [
            { text: 'Entendi', onPress: encerrarSessao },
          ])
          return
        }
        throw new Error(resultado.error ?? 'Erro no servidor.')
      }

      await encerrarSessao()
    } catch (e) {
      Alert.alert(
        'Não foi possível excluir',
        e instanceof Error ? e.message : 'Tente novamente mais tarde.'
      )
    } finally {
      setExcluindo(false)
    }
  }

  /**
   * Dupla confirmação: o primeiro diálogo explica o que se perde, o segundo
   * é a última chance. Um toque só não deveria apagar uma conta.
   */
  function handleExcluirConta() {
    if (excluindo) return

    Alert.alert(
      'Excluir minha conta',
      'Seus dados pessoais — nome, telefone, CPF, endereços e foto — serão apagados definitivamente e você perderá o acesso ao aplicativo.\n\nSeus pedidos anteriores são mantidos sem identificação, por exigência fiscal.\n\nEsta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Tem certeza?',
              'Esta é a última confirmação. Sua conta será excluída agora.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Excluir conta',
                  style: 'destructive',
                  onPress: excluirConta,
                },
              ]
            ),
        },
      ]
    )
  }

  const nomeExibido = consumer?.nome ?? 'Usuário'
  const qtdEnderecos = consumer?.enderecos?.length ?? 0
  const qtdSeguindo = useTotalSeguidas()
  const qtdFavoritos = useTotalFavoritos()
  const contato = consumer?.telefone
    ? mascaraTelefone(consumer.telefone)
    : (user?.email ?? '')

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {focado && <StatusBar style="light" animated />}

      {/* Céu atrás do overscroll superior (iOS rubber-band). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 420,
          backgroundColor: colors.marquee,
        }}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={colors.white}
          />
        }
      >
        {/* ── Marquise: identidade + coleções ── */}
        <View
          style={{
            backgroundColor: colors.marquee,
            paddingTop: insets.top + 16,
            // 24 extras ficam escondidos atrás da folha que sobe por cima.
            paddingBottom: 48,
            overflow: 'hidden',
          }}
        >
          <GlowNeon />

          <View style={{ paddingHorizontal: 24 }}>
            <Text style={estilos.microMudo}>Meu perfil</Text>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}
            >
              <AvatarPerfil tamanho={68} corAro={colors.marquee} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    fontes.statement,
                    { fontSize: 24, lineHeight: 28, color: colors.white, letterSpacing: -0.5 },
                  ]}
                  numberOfLines={2}
                >
                  {nomeExibido}
                </Text>
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: '500',
                    color: colors.marqueeInkSoft,
                    marginTop: 4,
                  }}
                  numberOfLines={1}
                >
                  {contato}
                </Text>
              </View>
            </View>
          </View>

          {/* Coleções: o que é seu no shopping — moedas de vidro. */}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: 16,
              paddingTop: 22,
            }}
          >
            <MoedaColecao
              icone="users"
              numero={qtdSeguindo}
              rotulo={qtdSeguindo === 1 ? 'Loja seguida' : 'Lojas seguidas'}
              aoTocar={() => router.push('/(tabs)/seguindo')}
            />
            <MoedaColecao
              icone="heart"
              numero={qtdFavoritos}
              rotulo={qtdFavoritos === 1 ? 'Favorito' : 'Favoritos'}
              aoTocar={() => router.push('/(tabs)/favoritos')}
            />
            <MoedaColecao
              icone="pin"
              numero={qtdEnderecos}
              rotulo={qtdEnderecos === 1 ? 'Endereço' : 'Endereços'}
              aoTocar={() => setSecaoAtiva((s) => (s === 'enderecos' ? null : 'enderecos'))}
              ativo={secaoAtiva === 'enderecos'}
            />
          </View>
        </View>

        {/* ── Folha: conta, aparência, ajuda ── */}
        <View
          style={{
            flex: 1,
            marginTop: -24,
            backgroundColor: colors.canvas,
            borderTopLeftRadius: radius.md,
            borderTopRightRadius: radius.md,
            paddingTop: 30,
            paddingBottom: spacing.tabBarHeight,
            overflow: 'hidden',
            gap: 28,
          }}
        >
          <VidroFosco luz={luz} />

          <SecaoFolha sobrelinha="Seus dados" titulo="Conta">
            <CartaoFolha padding={0}>
              <ItemPerfil
                icone="edit"
                rotulo="Editar perfil"
                expandido={secaoAtiva === 'editar'}
                aoTocar={() =>
                  setSecaoAtiva((s) => (s === 'editar' ? null : 'editar'))
                }
              />
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
                icone="orders"
                rotulo="Meus pedidos"
                aoTocar={() => router.push('/(tabs)/pedidos')}
                ultimo
              />
            </CartaoFolha>
            {/* Expansões abrem logo abaixo do cartão, no mesmo lugar —
                seja pelo item da lista ou pela moeda da marquise. */}
            {secaoAtiva === 'editar' && (
              <View style={{ marginTop: 12 }}>
                <EditarPerfil onFechar={() => setSecaoAtiva(null)} />
              </View>
            )}
            {secaoAtiva === 'enderecos' && (
              <View style={{ marginTop: 12 }}>
                <GerenciarEnderecos enderecos={consumer?.enderecos ?? []} />
              </View>
            )}
          </SecaoFolha>

          <SecaoFolha sobrelinha="Aparência" titulo="Início">
            <CartaoFolha padding={0}>
              <ItemInterruptor
                icone="clock"
                rotulo="Luz do dia"
                descricao="A folha do Início acompanha o sol de Divinópolis"
                valor={luzDoDia}
                aoMudar={setLuzDoDia}
              />
            </CartaoFolha>
          </SecaoFolha>

          <SecaoFolha sobrelinha="Sobre o app" titulo="Ajuda">
            <CartaoFolha padding={0}>
              <ItemPerfil
                icone="file"
                rotulo="Termos de uso"
                aoTocar={() => abrirLink(URL_TERMOS)}
              />
              <ItemPerfil
                icone="shield"
                rotulo="Política de privacidade"
                aoTocar={() => abrirLink(URL_PRIVACIDADE)}
                ultimo
              />
            </CartaoFolha>
          </SecaoFolha>

          {/* Sair */}
          <View style={{ paddingHorizontal: 24 }}>
            <Botao
              label="Sair da conta"
              variante="danger"
              tamanho="md"
              iconeEsquerda="logout"
              onPress={handleSair}
            />

            {/* Excluir conta — exigência de App Store e Play para app com
                cadastro. Fica separado e discreto: é destrutivo e definitivo. */}
            <TouchableOpacity
              onPress={handleExcluirConta}
              disabled={excluindo}
              activeOpacity={consumerDesign.opacity.pressedSoft}
              accessibilityRole="button"
              style={{ alignItems: 'center', paddingVertical: 10, marginTop: 16 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.inkMuted,
                  textDecorationLine: 'underline',
                }}
              >
                {excluindo ? 'Excluindo conta...' : 'Excluir minha conta'}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 11,
                color: colors.inkSoft,
                textAlign: 'center',
                marginTop: 12,
                letterSpacing: 0.3,
                fontWeight: '500',
              }}
            >
              Versão 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da marquise
// ─────────────────────────────────────────────────────────

/** Moeda de vidro com número grande — uma coleção do usuário no shopping. */
function MoedaColecao({
  icone,
  numero,
  rotulo,
  aoTocar,
  ativo = false,
}: {
  icone: ConsumerIconName
  numero: number
  rotulo: string
  aoTocar: () => void
  ativo?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel={`${numero} ${rotulo}`}
      accessibilityState={{ expanded: ativo }}
      style={{
        flex: 1,
        backgroundColor: ativo ? colors.marqueeGlassStrong : colors.marqueeGlass,
        borderWidth: 1,
        borderColor: ativo ? colors.accentRing : colors.marqueeLine,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: 12,
        gap: 8,
      }}
    >
      <ConsumerIcon name={icone} size={16} color={colors.accent} strokeWidth={2} />
      <View>
        <Text
          style={{ fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.5 }}
        >
          {numero}
        </Text>
        <Text
          style={{ fontSize: 11, fontWeight: '600', color: colors.marqueeInkSoft, marginTop: 1 }}
          numberOfLines={1}
        >
          {rotulo}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da folha
// ─────────────────────────────────────────────────────────

/** Linha de preferência com interruptor — mesma anatomia do ItemPerfil. */
function ItemInterruptor({
  icone,
  rotulo,
  descricao,
  valor,
  aoMudar,
}: {
  icone: ConsumerIconName
  rotulo: string
  descricao: string
  valor: boolean
  aoMudar: (v: boolean) => void
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: valor ? colors.accentSoft : colors.canvasAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name={icone} size={18} color={valor ? colors.accent : colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>
          {rotulo}
        </Text>
        <Text
          style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}
          numberOfLines={2}
        >
          {descricao}
        </Text>
      </View>
      <Switch
        value={valor}
        onValueChange={aoMudar}
        trackColor={{ false: colors.canvasAlt, true: colors.accent }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.canvasAlt}
        accessibilityLabel={rotulo}
      />
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

const estilos = {
  microMudo: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.marqueeInkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
}
