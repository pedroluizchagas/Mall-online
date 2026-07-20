import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, type Href } from 'expo-router'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Hub dos módulos de gestão (rotas stack). No Stage 6 vira a versão
// definitiva com badges (mensagens/avaliações não lidas) e estados.

type Icone = 'box' | 'chart' | 'wallet' | 'store' | 'star' | 'chat' | 'calendar' | 'bike' | 'gear' | 'user' | 'help'

interface Entrada {
  titulo: string
  icone: Icone
  href: Href
}

interface Secao {
  legenda: string
  entradas: Entrada[]
}

const SECOES: Secao[] = [
  {
    legenda: 'Catálogo',
    entradas: [
      { titulo: 'Produtos',      icone: 'box',      href: '/produtos' },
      { titulo: 'Categorias',    icone: 'box',      href: '/categorias' },
      { titulo: 'Estoque',       icone: 'box',      href: '/estoque' },
    ],
  },
  {
    legenda: 'Desempenho',
    entradas: [
      { titulo: 'Financeiro',    icone: 'wallet',   href: '/financeiro' },
      { titulo: 'Relatórios',    icone: 'chart',    href: '/relatorios' },
    ],
  },
  {
    legenda: 'Operação',
    entradas: [
      { titulo: 'Minha loja',    icone: 'store',    href: '/minha-loja' },
      { titulo: 'Avaliações',    icone: 'star',     href: '/avaliacoes' },
      { titulo: 'Mensagens',     icone: 'chat',     href: '/mensagens' },
      { titulo: 'Agenda',        icone: 'calendar', href: '/agenda' },
      { titulo: 'Entregadores',  icone: 'bike',     href: '/entregadores' },
    ],
  },
  {
    legenda: 'Conta',
    entradas: [
      { titulo: 'Configurações', icone: 'gear',     href: '/configuracoes' },
      { titulo: 'Minha conta',   icone: 'user',     href: '/minha-conta' },
      { titulo: 'Ajuda',         icone: 'help',     href: '/ajuda' },
    ],
  },
]

export default function TelaMenu() {
  const { colors, radius, spacing, typography } = partnerDesign

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 72,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.tabBarHeight + spacing.lg,
        }}
      >
        <Text
          style={{
            color: colors.ink,
            fontSize: typography.h1.size,
            fontWeight: typography.h1.weight,
            letterSpacing: typography.h1.tracking,
            marginBottom: spacing['2xl'],
          }}
        >
          Menu
        </Text>

        {SECOES.map((secao) => (
          <View key={secao.legenda} style={{ marginBottom: spacing['2xl'] }}>
            <Text
              style={{
                color: colors.inkSoft,
                fontSize: typography.micro.size,
                fontWeight: typography.micro.weight,
                letterSpacing: typography.micro.tracking,
                textTransform: 'uppercase',
                marginBottom: spacing.sm,
                marginLeft: spacing.xs,
              }}
            >
              {secao.legenda}
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                overflow: 'hidden',
              }}
            >
              {secao.entradas.map((entrada, i) => (
                <TouchableOpacity
                  key={entrada.titulo}
                  activeOpacity={0.7}
                  onPress={() => router.push(entrada.href)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <PartnerIcon name={entrada.icone} size={20} color={colors.inkMuted} />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: spacing.md,
                      color: colors.ink,
                      fontSize: typography.bodyLg.size,
                      fontWeight: typography.bodyLg.weight,
                    }}
                  >
                    {entrada.titulo}
                  </Text>
                  <View style={{ transform: [{ scaleX: -1 }] }}>
                    <PartnerIcon name="back" size={16} color={colors.inkSoft} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
