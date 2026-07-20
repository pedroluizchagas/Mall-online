import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { CabecalhoTela, Cartao, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { abrirNoDashboard } from '@/lib/links'
import { partnerDesign } from '@/lib/partner-design'

// Configurações — hub: o que é editável no app aponta para Minha loja;
// staff e tipo-de-loja são web-only por decisão (docs/partner-app/01 §3),
// com CTA "abrir no Dashboard". docs/partner-app/08 §6.

export default function TelaConfiguracoes() {
  const { colors, spacing, typography } = partnerDesign

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 64 }}>
        <CabecalhoTela titulo="Configurações" />

        <Legenda>No app</Legenda>
        <Cartao semPadding>
          <Item
            titulo="Dados da loja, horários e entrega"
            descricao="Nome, imagens, grade semanal, taxa e raio"
            icone="store"
            onPress={() => router.push('/minha-loja')}
          />
          <Item
            titulo="Métodos de pagamento"
            descricao="Pix e cartão online"
            icone="wallet"
            onPress={() => router.push('/minha-loja')}
            divisor
          />
          <Item
            titulo="Minha conta"
            descricao="Dados pessoais, senha e assinatura"
            icone="user"
            onPress={() => router.push('/minha-conta')}
            divisor
          />
        </Cartao>

        <Legenda>No Dashboard (web)</Legenda>
        <Cartao semPadding>
          <Item
            titulo="Recebimentos (Pagar.me)"
            descricao="Conta bancária, KYC e status"
            icone="wallet"
            externo
            onPress={() => abrirNoDashboard('/configuracoes?aba=recebimentos')}
          />
          <Item
            titulo="Equipe (staff)"
            descricao="Profissionais e permissões"
            icone="user"
            externo
            divisor
            onPress={() => abrirNoDashboard('/configuracoes/staff')}
          />
          <Item
            titulo="Tipo de loja (template)"
            descricao="Estrutura do catálogo por nicho"
            icone="gear"
            externo
            divisor
            onPress={() => abrirNoDashboard('/configuracoes/tipo-de-loja')}
          />
          <Item
            titulo="Aparência da vitrine"
            descricao="Tema, cores e fontes da loja pública"
            icone="store"
            externo
            divisor
            onPress={() => abrirNoDashboard('/minha-loja')}
          />
        </Cartao>

        <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size, textAlign: 'center', marginTop: spacing.sm }}>
          Fluxos sensíveis ou densos permanecem no Dashboard web.
        </Text>
      </ScrollView>
    </View>
  )
}

function Item({
  titulo,
  descricao,
  icone,
  onPress,
  divisor,
  externo,
}: {
  titulo: string
  descricao: string
  icone: 'store' | 'wallet' | 'user' | 'gear'
  onPress: () => void
  divisor?: boolean
  externo?: boolean
}) {
  const { colors, spacing, typography } = partnerDesign
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: spacing.lg,
        borderTopWidth: divisor ? 1 : 0,
        borderTopColor: colors.line,
        gap: spacing.md,
      }}
    >
      <PartnerIcon name={icone} size={20} color={colors.inkMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodyLg.size }}>
          {titulo}
        </Text>
        <Text style={{ color: colors.inkSoft, fontSize: typography.bodySm.size }}>{descricao}</Text>
      </View>
      {externo ? (
        <Text style={{ color: colors.inkSoft, fontSize: typography.micro.size, fontWeight: '700' }}>WEB</Text>
      ) : (
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <PartnerIcon name="back" size={16} color={colors.inkSoft} />
        </View>
      )}
    </TouchableOpacity>
  )
}
