import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import { criarProduto } from '@/lib/catalogo'
import { FormProduto, paraCampos, valoresIniciais, type ValoresForm } from '@/components/FormProduto'
import { BotaoPrimario, CabecalhoTela } from '@/components/Basicos'
import { partnerDesign } from '@/lib/partner-design'

// Criar produto com foto em um minuto — docs/partner-app/06 §Produtos.

export default function TelaNovoProduto() {
  const { tenant, lojaAtivaId } = useAuthStore()
  const [valores, setValores] = useState<ValoresForm>(valoresIniciais())
  const [salvando, setSalvando] = useState(false)
  const { colors, spacing } = partnerDesign

  async function handleSalvar() {
    if (!tenant || !lojaAtivaId || salvando) return
    if (valores.nome.trim().length < 2) {
      Alert.alert('Nome obrigatório')
      return
    }
    const { campos, erro } = paraCampos(valores)
    if (erro || !campos) {
      Alert.alert(erro ?? 'Dados inválidos')
      return
    }

    setSalvando(true)
    const r = await criarProduto(lojaAtivaId, tenant.id, campos, valores.fotoUri)
    setSalvando(false)

    if (r.erro) {
      Alert.alert('Não foi possível criar', r.erro)
      return
    }
    router.back()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 48 }}>
          <CabecalhoTela titulo="Novo produto" />
          <FormProduto valores={valores} aoMudar={setValores} />
          <BotaoPrimario rotulo="Criar produto" onPress={() => void handleSalvar()} carregando={salvando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
