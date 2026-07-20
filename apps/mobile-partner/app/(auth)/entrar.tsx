import { Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Image } from 'react-native'
import { partnerDesign } from '@/lib/partner-design'

// STUB — Stage 2 implementa o login real (signInWithPassword espelhando o
// courier) + link "cadastre sua loja" para o onboarding web.

export default function TelaEntrar() {
  const { colors, radius, typography } = partnerDesign

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <StatusBar style="light" />
      <Image
        source={require('../../assets/logo-mark.png')}
        style={{ width: 72, height: 72, marginBottom: 24 }}
        resizeMode="contain"
      />
      <Text
        style={{
          color: colors.white,
          fontSize: typography.h1.size,
          fontWeight: typography.h1.weight,
          letterSpacing: typography.h1.tracking,
          marginBottom: 8,
        }}
      >
        Mallevo Parceiro
      </Text>
      <Text
        style={{
          color: colors.inkSoft,
          fontSize: typography.body.size,
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        Sua loja no bolso: pedidos, catálogo e conteúdo.
      </Text>
      <View
        style={{
          backgroundColor: colors.surfaceDarkSoft,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: colors.accent, fontSize: typography.bodySm.size, fontWeight: '700' }}>
          Login do lojista — Stage 2
        </Text>
      </View>
    </View>
  )
}
