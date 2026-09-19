import { useCallback, useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { abrirNoDashboard } from '@/lib/links'
import { PartnerIcon, type PartnerIconName } from '@/components/PartnerIcon'
import { SeletorLoja } from '@/components/SeletorLoja'
import { TelaMarquise } from '@/components/marquise/TelaMarquise'
import {
  CartaoVidro,
  PontoAoVivo,
  Portaria,
  Statement,
  estiloMicroMudo,
} from '@/components/marquise/Marquise'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { Botao } from '@/components/ui/Botao'
import { partnerDesign, softColor } from '@/lib/partner-design'

/**
 * Gate de publicação (docs/partner-app/04-stage-2-auth-gate.md): quando
 * `tenantPodePublicar` reprova (`pagarme_onboarding_status !== 'active'`),
 * as abas Publicar e Meu conteúdo mostram esta tela — a gestão continua
 * liberada.
 *
 * O lojista está DENTRO do app, então a tela fala a arquitetura da casa:
 * MARQUISE com o statement e o status real da conta de recebimentos (o
 * mesmo vocabulário da aba Recebimentos do Dashboard), FOLHA com o
 * caminho em três passos, o CTA para o Dashboard e o que continua
 * liberado enquanto isso. Puxar para atualizar reconsulta o tenant: quem
 * termina a verificação no web destrava sem reabrir o app.
 */

type Momento = 'cadastro' | 'analise' | 'problema' | 'inativo'

interface EstadoOnboarding {
  momento: Momento
  rotulo: string
  descricao: string
}

/** Espelho de apps/web/components/dashboard/configuracoes/aba-recebimentos.tsx. */
const ESTADO_POR_STATUS: Record<string, EstadoOnboarding> = {
  registration: {
    momento: 'cadastro',
    rotulo: 'Cadastro em andamento',
    descricao: 'Conclua os dados de recebimento para liberar as publicações.',
  },
  affiliation: {
    momento: 'analise',
    rotulo: 'Afiliação em andamento',
    descricao: 'Aguardando a aprovação final da Pagar.me.',
  },
  pending: {
    momento: 'analise',
    rotulo: 'Em verificação',
    descricao: 'Estamos analisando seus dados — acompanhe pelo link de verificação no Dashboard.',
  },
  refused: {
    momento: 'problema',
    rotulo: 'Cadastro recusado',
    descricao: 'O cadastro foi recusado pela Pagar.me. Fale com o suporte para revisar.',
  },
  suspended: {
    momento: 'problema',
    rotulo: 'Conta suspensa',
    descricao: 'Sua conta de recebimentos está suspensa. Fale com o suporte.',
  },
  blocked: {
    momento: 'problema',
    rotulo: 'Conta bloqueada',
    descricao: 'Sua conta de recebimentos está bloqueada. Fale com o suporte.',
  },
  inactive: {
    momento: 'inativo',
    rotulo: 'Conta inativa',
    descricao: 'Reative a conta de recebimentos pelo Dashboard.',
  },
}

const ESTADO_PADRAO: EstadoOnboarding = {
  momento: 'cadastro',
  rotulo: 'Não iniciado',
  descricao: 'Configure seus recebimentos no Dashboard para começar.',
}

const { colors, radius } = partnerDesign

const COR_MOMENTO: Record<Momento, string> = {
  cadastro: colors.warning,
  analise: colors.info,
  problema: colors.danger,
  inativo: colors.marqueeInkSoft,
}

export function GatePublicacao({ contexto = 'publicar' }: { contexto?: 'publicar' | 'conteudo' }) {
  const { tenant, setTenant } = useAuthStore()
  const [atualizando, setAtualizando] = useState(false)

  const status = tenant?.pagarme_onboarding_status ?? ''
  const estado = ESTADO_POR_STATUS[status] ?? ESTADO_PADRAO
  const cor = COR_MOMENTO[estado.momento]

  // Reconsulta o tenant (mesmo select do _layout) — a aprovação acontece
  // no web/Pagar.me, e o app só vê quando pergunta de novo.
  const onRefresh = useCallback(async () => {
    if (!tenant) return
    setAtualizando(true)
    const { data } = await supabase
      .from('tenants')
      .select('id, nome_responsavel, email, ativo, pagarme_onboarding_status')
      .eq('id', tenant.id)
      .single()
    if (data) setTenant(data)
    setAtualizando(false)
  }, [tenant?.id])

  // Passo atual do caminho, pelo momento da conta.
  const passoAtual = estado.momento === 'cadastro' ? 0 : 1
  const passos: { titulo: string; descricao: string; icone: PartnerIconName }[] = [
    {
      titulo: 'Dados de recebimento',
      descricao: 'Conta bancária e documentos, no Dashboard',
      icone: 'wallet',
    },
    {
      titulo: 'Verificação Pagar.me',
      descricao:
        estado.momento === 'problema'
          ? 'Precisa de revisão — fale com o suporte'
          : 'Análise dos dados, geralmente em até 2 dias úteis',
      icone: 'shield',
    },
    {
      titulo: 'Loja no ar para publicar',
      descricao: 'Fotos e vídeos no Explorar e na entrada do shopping',
      icone: 'camera',
    },
  ]

  return (
    <TelaMarquise
      refreshing={atualizando}
      onRefresh={() => void onRefresh()}
      marquise={
        <>
          <Portaria
            esquerda={
              <Text style={estiloMicroMudo}>
                {contexto === 'conteudo' ? 'Meu conteúdo' : 'Publicar'}
              </Text>
            }
            direita={<SeletorLoja escuro />}
          />

          <Statement
            sobrelinha="Recebimentos"
            linha="Ative sua loja"
            acento="para publicar."
            sublinha="Publicar no Explorar depende da conta de recebimentos ativa — é por ela que o que você vende vira venda."
          />

          {/* O status real da conta, no mesmo vocabulário do Dashboard */}
          <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
            <CartaoVidro padding={16}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.marqueeGlassStrong,
                    borderWidth: 1,
                    borderColor: colors.marqueeLine,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PartnerIcon name="wallet" size={18} color={colors.white} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <PontoAoVivo cor={cor} />
                    <Text style={[estiloMicroMudo, { color: cor }]} numberOfLines={1}>
                      {estado.rotulo}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: colors.white,
                      lineHeight: 19,
                      marginTop: 4,
                    }}
                  >
                    {estado.descricao}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '500',
                  color: colors.marqueeInkMuted,
                  marginTop: 12,
                }}
              >
                Puxe para baixo para conferir de novo depois de concluir no Dashboard.
              </Text>
            </CartaoVidro>
          </View>
        </>
      }
    >
      <SecaoFolha sobrelinha="O caminho" titulo="Três passos">
        <CartaoFolha padding={0}>
          {passos.map((passo, i) => (
            <Passo
              key={passo.titulo}
              numero={i + 1}
              {...passo}
              estado={i < passoAtual ? 'feito' : i === passoAtual ? 'atual' : 'pendente'}
              corAtual={cor}
              ultimo={i === passos.length - 1}
            />
          ))}
        </CartaoFolha>
        <View style={{ marginTop: 14, gap: 10 }}>
          <Botao
            label={
              estado.momento === 'problema' ? 'Ver recebimentos no Dashboard' : 'Configurar recebimentos'
            }
            iconeDireita="external"
            onPress={() => abrirNoDashboard('/configuracoes?aba=recebimentos')}
          />
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '500',
              color: colors.inkMuted,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            A verificação é feita no Dashboard (web) — o app só acompanha.
          </Text>
        </View>
      </SecaoFolha>

      <SecaoFolha sobrelinha="Enquanto isso" titulo="Segue liberado">
        <CartaoFolha padding={0}>
          <Atalho
            icone="orders"
            rotulo="Pedidos"
            descricao="Receber, confirmar e acompanhar"
            aoTocar={() => router.navigate('/(tabs)/pedidos')}
          />
          <Atalho
            icone="box"
            rotulo="Catálogo"
            descricao="Produtos, categorias e estoque"
            aoTocar={() => router.push('/produtos')}
          />
          <Atalho
            icone="store"
            rotulo="Minha loja"
            descricao="Dados, horários, entrega e pagamento"
            aoTocar={() => router.push('/minha-loja')}
            ultimo
          />
        </CartaoFolha>
      </SecaoFolha>
    </TelaMarquise>
  )
}

// ─────────────────────────────────────────────────────────
// Peças da folha
// ─────────────────────────────────────────────────────────

/** Um passo do caminho: moeda numerada (feito = ink+check accent; atual = cor do momento suave; pendente = canvasAlt). */
function Passo({
  numero,
  titulo,
  descricao,
  icone,
  estado,
  corAtual,
  ultimo,
}: {
  numero: number
  titulo: string
  descricao: string
  icone: PartnerIconName
  estado: 'feito' | 'atual' | 'pendente'
  corAtual: string
  ultimo: boolean
}) {
  const feito = estado === 'feito'
  const atual = estado === 'atual'
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: colors.line,
        opacity: estado === 'pendente' ? 0.72 : 1,
      }}
      accessibilityLabel={`Passo ${numero}, ${titulo}, ${feito ? 'concluído' : atual ? 'atual' : 'pendente'}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: feito ? colors.ink : atual ? softColor(corAtual) : colors.canvasAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {feito ? (
          <PartnerIcon name="check" size={16} color={colors.accent} strokeWidth={2.6} />
        ) : (
          <PartnerIcon name={icone} size={18} color={colors.ink} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{titulo}</Text>
          {atual && (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: colors.inkMuted,
              }}
            >
              Agora
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 1 }}>
          {descricao}
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.inkSoft }}>{numero}/3</Text>
    </View>
  )
}

function Atalho({
  icone,
  rotulo,
  descricao,
  aoTocar,
  ultimo,
}: {
  icone: PartnerIconName
  rotulo: string
  descricao: string
  aoTocar: () => void
  ultimo?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={partnerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
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
          backgroundColor: colors.canvasAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PartnerIcon name={icone} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{rotulo}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 1 }}>
          {descricao}
        </Text>
      </View>
      <PartnerIcon name="chevron-right" size={16} color={colors.inkSoft} />
    </TouchableOpacity>
  )
}
