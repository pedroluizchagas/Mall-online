import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { Endereco } from '@mallora/types'

interface Props {
  enderecos: Endereco[]
  selecionado: Endereco | null
  onSelecionar: (endereco: Endereco) => void
}

export function SeletorEndereco({ enderecos, selecionado, onSelecionar }: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [novoEndereco, setNovoEndereco] = useState<Partial<Endereco>>({
    cidade: 'Divinópolis',
    estado: 'MG',
  })
  const [salvando, setSalvando] = useState(false)
  const { consumer, setConsumer } = useAuthStore()

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados = await res.json()
      if (!dados.erro) {
        setNovoEndereco((prev) => ({
          ...prev,
          rua: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf,
          cep: cepLimpo,
        }))
      }
    } catch {
      // Ignorar erro de CEP
    }
  }

  async function salvarEndereco() {
    if (!novoEndereco.rua || !novoEndereco.numero || !novoEndereco.bairro) {
      return
    }

    setSalvando(true)

    const enderecoCompleto: Endereco = {
      apelido: novoEndereco.apelido || `Endereço ${(enderecos.length ?? 0) + 1}`,
      rua: novoEndereco.rua!,
      numero: novoEndereco.numero!,
      complemento: novoEndereco.complemento,
      bairro: novoEndereco.bairro!,
      cidade: novoEndereco.cidade ?? 'Divinópolis',
      estado: novoEndereco.estado ?? 'MG',
      cep: novoEndereco.cep ?? '',
    }

    const novosEnderecos = [...(enderecos ?? []), enderecoCompleto]

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('consumers')
      .update({ enderecos: novosEnderecos })
      .eq('user_id', user.id)

    if (consumer) {
      setConsumer({ ...consumer, enderecos: novosEnderecos })
    }

    onSelecionar(enderecoCompleto)
    setAdicionando(false)
    setModalAberto(false)
    setSalvando(false)
  }

  return (
    <View className="bg-white border-t border-b border-gray-100 px-5 py-4 mt-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Endereço de entrega
      </Text>

      {selecionado ? (
        <TouchableOpacity
          onPress={() => setModalAberto(true)}
          className="flex-row items-center justify-between"
          activeOpacity={0.75}
        >
          <View className="flex-1 mr-3">
            <Text className="text-sm font-medium text-gray-800">
              {selecionado.apelido ?? selecionado.rua}
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">
              {selecionado.rua}, {selecionado.numero}
              {selecionado.complemento ? ` — ${selecionado.complemento}` : ''}
            </Text>
            <Text className="text-xs text-gray-400">
              {selecionado.bairro} — {selecionado.cidade}
            </Text>
          </View>
          <Text className="text-verde-medio text-sm">Alterar</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => setModalAberto(true)}
          className="border-2 border-dashed border-gray-200 rounded-xl py-4 items-center"
          activeOpacity={0.75}
        >
          <Text className="text-verde-medio text-sm font-medium">
            Selecionar endereço de entrega
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal de endereços */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalAberto(false)
          setAdicionando(false)
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => {
            setModalAberto(false)
            setAdicionando(false)
          }}
        />

        <View className="bg-white rounded-t-3xl max-h-3/4">
          <View className="px-5 pt-5 pb-3 border-b border-gray-100">
            <Text className="text-base font-bold text-verde-profundo">
              {adicionando ? 'Novo endereço' : 'Endereços salvos'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {!adicionando ? (
              <>
                {enderecos.map((end, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      onSelecionar(end)
                      setModalAberto(false)
                    }}
                    className={`p-4 rounded-2xl border mb-3 ${
                      selecionado === end
                        ? 'border-verde-medio bg-green-50'
                        : 'border-gray-100 bg-white'
                    }`}
                    activeOpacity={0.75}
                  >
                    <Text className="text-sm font-semibold text-gray-800">
                      {end.apelido ?? end.rua}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {end.rua}, {end.numero}
                      {end.complemento ? ` — ${end.complemento}` : ''}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {end.bairro} — {end.cidade}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => setAdicionando(true)}
                  className="border-2 border-dashed border-gray-200 rounded-2xl py-4 items-center mt-2"
                  activeOpacity={0.75}
                >
                  <Text className="text-verde-medio text-sm font-medium">
                    Adicionar novo endereço
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="gap-4">
                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    Apelido (opcional)
                  </Text>
                  <TextInput
                    value={novoEndereco.apelido ?? ''}
                    onChangeText={(t) =>
                      setNovoEndereco((p) => ({ ...p, apelido: t }))
                    }
                    placeholder="Ex: Casa, Trabalho"
                    placeholderTextColor="#9CA3AF"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    CEP
                  </Text>
                  <TextInput
                    value={novoEndereco.cep ?? ''}
                    onChangeText={(t) => {
                      setNovoEndereco((p) => ({ ...p, cep: t }))
                      buscarCep(t)
                    }}
                    placeholder="00000-000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={9}
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-gray-600 mb-1">
                      Rua
                    </Text>
                    <TextInput
                      value={novoEndereco.rua ?? ''}
                      onChangeText={(t) =>
                        setNovoEndereco((p) => ({ ...p, rua: t }))
                      }
                      placeholder="Nome da rua"
                      placeholderTextColor="#9CA3AF"
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </View>
                  <View className="w-24">
                    <Text className="text-xs font-medium text-gray-600 mb-1">
                      Número
                    </Text>
                    <TextInput
                      value={novoEndereco.numero ?? ''}
                      onChangeText={(t) =>
                        setNovoEndereco((p) => ({ ...p, numero: t }))
                      }
                      placeholder="123"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    Complemento (opcional)
                  </Text>
                  <TextInput
                    value={novoEndereco.complemento ?? ''}
                    onChangeText={(t) =>
                      setNovoEndereco((p) => ({ ...p, complemento: t }))
                    }
                    placeholder="Apto, bloco, referência..."
                    placeholderTextColor="#9CA3AF"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View>
                  <Text className="text-xs font-medium text-gray-600 mb-1">
                    Bairro
                  </Text>
                  <TextInput
                    value={novoEndereco.bairro ?? ''}
                    onChangeText={(t) =>
                      setNovoEndereco((p) => ({ ...p, bairro: t }))
                    }
                    placeholder="Nome do bairro"
                    placeholderTextColor="#9CA3AF"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  />
                </View>

                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => setAdicionando(false)}
                    className="flex-1 border border-gray-200 py-3.5 rounded-2xl items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-gray-500 text-sm font-medium">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={salvarEndereco}
                    disabled={salvando}
                    className="flex-1 bg-verde-profundo py-3.5 rounded-2xl items-center disabled:opacity-50"
                    activeOpacity={0.85}
                  >
                    <Text className="text-white text-sm font-semibold">
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}
