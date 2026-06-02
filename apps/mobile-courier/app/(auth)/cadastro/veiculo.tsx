import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native'
import { router } from 'expo-router'
import { useCadastroStore } from '@/store/useCadastroStore'
import { CourierIcon } from '@/components/CourierIcon'
import { courierDesign } from '@/lib/courier-design'
import { EtapaBar, ErroBanner, labelStyle } from './credenciais'

const TIPOS_VEICULO = [
  { id: 'moto', label: 'Moto' },
  { id: 'bicicleta', label: 'Bicicleta' },
  { id: 'carro', label: 'Carro' },
  { id: 'a_pe', label: 'A pé' },
]

export default function EtapaVeiculo() {
  const { dados, setDados } = useCadastroStore()
  const [tipo, setTipo] = useState(dados.veiculo_tipo ?? '')
  const [placa, setPlaca] = useState(dados.veiculo_placa ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [focadoPlaca, setFocadoPlaca] = useState(false)
  const { colors, radius } = courierDesign

  function handleAvancar() {
    if (!tipo) { setErro('Selecione o tipo de veículo.'); return }
    if (['moto', 'carro'].includes(tipo) && !placa.trim()) {
      setErro('Informe a placa do veículo.'); return
    }
    setDados({ veiculo_tipo: tipo, veiculo_placa: placa.trim() || undefined })
    router.push('/(auth)/cadastro/documentos')
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surfaceDark }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/entrar')} activeOpacity={0.7} style={{ marginBottom: 32 }}>
        <CourierIcon name="back" size={24} color={colors.white} />
      </TouchableOpacity>

      <EtapaBar atual={3} total={4} />

      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.4, marginBottom: 8 }}>
        Seu veículo
      </Text>
      <Text style={{ fontSize: 15, color: '#A4A7AD', lineHeight: 22, marginBottom: 32 }}>
        Informe como você fará as entregas.
      </Text>

      {erro && <ErroBanner mensagem={erro} />}

      <Text style={labelStyle}>Tipo de veículo</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
        {TIPOS_VEICULO.map((v) => {
          const selecionado = tipo === v.id
          return (
            <TouchableOpacity
              key={v.id}
              onPress={() => { setTipo(v.id); setErro(null) }}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 22,
                paddingVertical: 13,
                borderRadius: radius.md,
                borderWidth: 1.5,
                backgroundColor: selecionado ? colors.accentSoft : colors.surfaceDarkSoft,
                borderColor: selecionado ? colors.accent : colors.lineDark,
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: selecionado ? colors.accent : colors.inkSoft,
              }}>
                {v.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {['moto', 'carro'].includes(tipo) && (
        <>
          <Text style={labelStyle}>Placa</Text>
          <TextInput
            value={placa}
            onChangeText={(t) => { setPlaca(t); setErro(null) }}
            onFocus={() => setFocadoPlaca(true)}
            onBlur={() => setFocadoPlaca(false)}
            placeholder="ABC-1234"
            autoCapitalize="characters"
            placeholderTextColor={colors.inkSoft}
            style={{
              height: 54,
              borderRadius: radius.md,
              paddingHorizontal: 18,
              fontSize: 16,
              color: colors.white,
              backgroundColor: colors.surfaceDarkSoft,
              borderWidth: 1.5,
              borderColor: focadoPlaca ? colors.accent : colors.lineDark,
              marginBottom: 28,
            }}
          />
        </>
      )}

      <TouchableOpacity
        onPress={handleAvancar}
        activeOpacity={0.85}
        style={{
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 8,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Próximo</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
