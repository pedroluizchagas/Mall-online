import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { usePreferencias } from '@/store/usePreferencias'
import { PartnerIcon, type PartnerIconName } from '@/components/PartnerIcon'
import { SeletorLoja } from '@/components/SeletorLoja'
import { TijoloLoja } from '@/components/TijoloLoja'
import { TelaMarquise } from '@/components/marquise/TelaMarquise'
import { Portaria, estiloMicroMudo, useFontesMarquee } from '@/components/marquise/Marquise'
import { SecaoFolha, CartaoFolha } from '@/components/ui/SecaoFolha'
import { Botao } from '@/components/ui/Botao'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Menu — o "perfil" do lojista, na arquitetura do Perfil do consumer:
 * MARQUISE com a identidade (tijolo da loja, nome, responsável) e o
 * seletor de loja; FOLHA com os módulos de gestão em cartões sem borda
 * sob letreiros, a aparência e a saída.
 *
 * Moedas dos itens são monocromáticas (`canvasAlt` + ícone `ink`) — o
 * módulo fala pelo nome, não por uma cor.
 */

interface Entrada {
  titulo: string
  descricao: string
  icone: PartnerIconName
  href: Href
}

interface Secao {
  sobrelinha: string
  titulo: string
  entradas: Entrada[]
}

const SECOES: Secao[] = [
  {
    sobrelinha: 'O que você vende',
    titulo: 'Catálogo',
    entradas: [
      { titulo: 'Produtos', descricao: 'Cadastro, preços e disponibilidade', icone: 'box', href: '/produtos' },
      { titulo: 'Categorias', descricao: 'Organização do cardápio', icone: 'tag', href: '/categorias' },
      { titulo: 'Estoque', descricao: 'Quantidades e alertas', icone: 'package', href: '/estoque' },
    ],
  },
  {
    sobrelinha: 'Como a loja vai',
    titulo: 'Desempenho',
    entradas: [
      { titulo: 'Financeiro', descricao: 'Saldo, repasses e antecipação', icone: 'wallet', href: '/financeiro' },
      { titulo: 'Relatórios', descricao: 'Vendas, itens e pagamentos', icone: 'chart', href: '/relatorios' },
    ],
  },
  {
    sobrelinha: 'O dia a dia',
    titulo: 'Operação',
    entradas: [
      { titulo: 'Minha loja', descricao: 'Dados, horários, entrega e pagamento', icone: 'store', href: '/minha-loja' },
      { titulo: 'Avaliações', descricao: 'O que os clientes disseram', icone: 'star', href: '/avaliacoes' },
      { titulo: 'Mensagens', descricao: 'Conversas com clientes', icone: 'chat', href: '/mensagens' },
      { titulo: 'Agenda', descricao: 'Atendimentos agendados', icone: 'calendar', href: '/agenda' },
      { titulo: 'Entregadores', descricao: 'Sua equipe de entrega', icone: 'bike', href: '/entregadores' },
    ],
  },
  {
    sobrelinha: 'Você e a Mallevo',
    titulo: 'Conta',
    entradas: [
      { titulo: 'Configurações', descricao: 'No app e no Dashboard', icone: 'gear', href: '/configuracoes' },
      { titulo: 'Minha conta', descricao: 'Dados, senha e assinatura', icone: 'user', href: '/minha-conta' },
      { titulo: 'Ajuda', descricao: 'Dúvidas e suporte', icone: 'help', href: '/ajuda' },
    ],
  },
]

const { colors, radius } = partnerDesign

export default function TelaMenu() {
  const { tenant, lojas, lojaAtivaId, user } = useAuthStore()
  const luzDoDia = usePreferencias((s) => s.luzDoDia)
  const setLuzDoDia = usePreferencias((s) => s.setLuzDoDia)
  const fontes = useFontesMarquee()

  const loja = lojas.find((l) => l.id === lojaAtivaId) ?? lojas[0]

  function handleSair() {
    Alert.alert('Sair da conta', 'Você precisará entrar de novo para usar o app.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void supabase.auth.signOut() },
    ])
  }

  return (
    <TelaMarquise
      marquise={
        <>
          <Portaria
            esquerda={<Text style={estiloMicroMudo}>Menu</Text>}
            direita={lojas.length > 1 ? <SeletorLoja escuro /> : undefined}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingHorizontal: 24,
              paddingTop: 18,
            }}
          >
            <TijoloLoja nome={loja?.nome ?? 'Loja'} logoUrl={loja?.logo_url} tamanho={68} raio={radius.md} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  fontes.statement,
                  { fontSize: 24, lineHeight: 28, color: colors.white, letterSpacing: -0.5 },
                ]}
                numberOfLines={2}
              >
                {loja?.nome ?? 'Sua loja'}
              </Text>
              <Text
                style={{ fontSize: 13.5, fontWeight: '500', color: colors.marqueeInkSoft, marginTop: 4 }}
                numberOfLines={1}
              >
                {tenant?.nome_responsavel ?? user?.email ?? ''}
              </Text>
            </View>
          </View>
        </>
      }
    >
      {SECOES.map((secao) => (
        <SecaoFolha key={secao.titulo} sobrelinha={secao.sobrelinha} titulo={secao.titulo}>
          <CartaoFolha padding={0}>
            {secao.entradas.map((entrada, i) => (
              <ItemMenu
                key={entrada.titulo}
                {...entrada}
                ultimo={i === secao.entradas.length - 1}
                aoTocar={() => router.push(entrada.href)}
              />
            ))}
          </CartaoFolha>
        </SecaoFolha>
      ))}

      <SecaoFolha sobrelinha="Aparência" titulo="Salão">
        <CartaoFolha padding={0}>
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
                backgroundColor: luzDoDia ? colors.accentSoft : colors.canvasAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PartnerIcon name="clock" size={18} color={luzDoDia ? colors.accent : colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>Luz do dia</Text>
              <Text
                style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}
                numberOfLines={2}
              >
                A folha clara acompanha o sol de Divinópolis
              </Text>
            </View>
            <Switch
              value={luzDoDia}
              onValueChange={setLuzDoDia}
              trackColor={{ false: colors.canvasAlt, true: colors.accent }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.canvasAlt}
              accessibilityLabel="Luz do dia"
            />
          </View>
        </CartaoFolha>
      </SecaoFolha>

      <View style={{ paddingHorizontal: 24 }}>
        <Botao
          label="Sair da conta"
          variante="danger"
          tamanho="md"
          iconeEsquerda="logout"
          onPress={handleSair}
        />
        <Text
          style={{
            fontSize: 11,
            color: colors.inkSoft,
            textAlign: 'center',
            marginTop: 14,
            letterSpacing: 0.3,
            fontWeight: '500',
          }}
        >
          Mallevo Parceiro · versão 1.0.0
        </Text>
      </View>
    </TelaMarquise>
  )
}

function ItemMenu({
  titulo,
  descricao,
  icone,
  aoTocar,
  ultimo,
}: Entrada & { aoTocar: () => void; ultimo: boolean }) {
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
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{titulo}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 1 }}>
          {descricao}
        </Text>
      </View>
      <PartnerIcon name="chevron-right" size={16} color={colors.inkSoft} />
    </TouchableOpacity>
  )
}
