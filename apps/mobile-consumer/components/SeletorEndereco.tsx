import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import type { Endereco } from '@mallora/types'
import { Botao } from '@/components/ui/Botao'
import { Input } from '@/components/ui/Input'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'

const { colors, radius, shadow } = consumerDesign

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
      apelido:
        novoEndereco.apelido || `Endereço ${(enderecos.length ?? 0) + 1}`,
      rua: novoEndereco.rua!,
      numero: novoEndereco.numero!,
      complemento: novoEndereco.complemento,
      bairro: novoEndereco.bairro!,
      cidade: novoEndereco.cidade ?? 'Divinópolis',
      estado: novoEndereco.estado ?? 'MG',
      cep: novoEndereco.cep ?? '',
    }

    const novosEnderecos = [...(enderecos ?? []), enderecoCompleto]

    const {
      data: { user },
    } = await supabase.auth.getUser()
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

  function fecharModal() {
    setModalAberto(false)
    setAdicionando(false)
  }

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.inkMuted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Endereço de entrega
      </Text>

      {selecionado ? (
        <TouchableOpacity
          onPress={() => setModalAberto(true)}
          activeOpacity={consumerDesign.opacity.pressedSoft}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.line,
            },
            shadow.soft,
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ConsumerIcon name="pin" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
              numberOfLines={1}
            >
              {selecionado.apelido ?? selecionado.rua}
            </Text>
            <Text
              style={{ fontSize: 13, color: colors.inkMuted, fontWeight: '500' }}
              numberOfLines={1}
            >
              {selecionado.rua}, {selecionado.numero}
              {selecionado.complemento ? ` — ${selecionado.complemento}` : ''}
            </Text>
            <Text
              style={{ fontSize: 12, color: colors.inkSoft, fontWeight: '500' }}
              numberOfLines={1}
            >
              {selecionado.bairro} — {selecionado.cidade}
            </Text>
          </View>
          <ConsumerIcon name="chevron-right" size={16} color={colors.inkSoft} />
        </TouchableOpacity>
      ) : (
        <Botao
          label="Selecionar endereço"
          variante="secundario"
          tamanho="md"
          iconeEsquerda="pin"
          onPress={() => setModalAberto(true)}
        />
      )}

      <ModalEnderecos
        visivel={modalAberto}
        adicionando={adicionando}
        enderecos={enderecos}
        selecionado={selecionado}
        novoEndereco={novoEndereco}
        salvando={salvando}
        onFechar={fecharModal}
        onSelecionar={(end) => {
          onSelecionar(end)
          setModalAberto(false)
        }}
        onAdicionar={() => setAdicionando(true)}
        onCancelarAdicao={() => setAdicionando(false)}
        onCampoMudou={(campo, valor) => {
          setNovoEndereco((p) => ({ ...p, [campo]: valor }))
        }}
        onCepMudou={(cep) => {
          setNovoEndereco((p) => ({ ...p, cep }))
          buscarCep(cep)
        }}
        onSalvar={salvarEndereco}
      />
    </View>
  )
}

interface ModalEnderecosProps {
  visivel: boolean
  adicionando: boolean
  enderecos: Endereco[]
  selecionado: Endereco | null
  novoEndereco: Partial<Endereco>
  salvando: boolean
  onFechar: () => void
  onSelecionar: (endereco: Endereco) => void
  onAdicionar: () => void
  onCancelarAdicao: () => void
  onCampoMudou: (campo: keyof Endereco, valor: string) => void
  onCepMudou: (cep: string) => void
  onSalvar: () => void
}

function ModalEnderecos({
  visivel,
  adicionando,
  enderecos,
  selecionado,
  novoEndereco,
  salvando,
  onFechar,
  onSelecionar,
  onAdicionar,
  onCancelarAdicao,
  onCampoMudou,
  onCepMudou,
  onSalvar,
}: ModalEnderecosProps) {
  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent
      onRequestClose={onFechar}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(17, 18, 22, ${consumerDesign.opacity.overlay})`,
          }}
          activeOpacity={1}
          onPress={onFechar}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '85%',
            overflow: 'hidden',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.line,
              }}
            />
          </View>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}
            >
              {adicionando ? 'Novo endereço' : 'Endereços salvos'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {!adicionando ? (
              <>
                {enderecos.map((end, i) => {
                  const ativo = selecionado === end
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => onSelecionar(end)}
                      activeOpacity={consumerDesign.opacity.pressedSoft}
                      style={{
                        padding: 16,
                        borderRadius: radius.md,
                        borderWidth: ativo ? 1.5 : 1,
                        borderColor: ativo ? colors.accent : colors.line,
                        backgroundColor: ativo
                          ? softColor(colors.accent)
                          : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: colors.ink,
                        }}
                      >
                        {end.apelido ?? end.rua}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.inkMuted,
                          marginTop: 2,
                          fontWeight: '500',
                        }}
                      >
                        {end.rua}, {end.numero}
                        {end.complemento ? ` — ${end.complemento}` : ''}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.inkSoft,
                          fontWeight: '500',
                        }}
                      >
                        {end.bairro} — {end.cidade}
                      </Text>
                    </TouchableOpacity>
                  )
                })}

                <Botao
                  label="Adicionar novo endereço"
                  variante="secundario"
                  tamanho="md"
                  iconeEsquerda="plus"
                  onPress={onAdicionar}
                />
              </>
            ) : (
              <>
                <Input
                  rotulo="Apelido (opcional)"
                  valor={novoEndereco.apelido ?? ''}
                  aoMudar={(t) => onCampoMudou('apelido', t)}
                  placeholder="Ex.: Casa, Trabalho"
                />
                <Input
                  rotulo="CEP"
                  valor={novoEndereco.cep ?? ''}
                  aoMudar={onCepMudou}
                  placeholder="00000-000"
                  tipo="numero"
                  maxLength={9}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      rotulo="Rua"
                      valor={novoEndereco.rua ?? ''}
                      aoMudar={(t) => onCampoMudou('rua', t)}
                      placeholder="Nome da rua"
                    />
                  </View>
                  <View style={{ width: 100 }}>
                    <Input
                      rotulo="Número"
                      valor={novoEndereco.numero ?? ''}
                      aoMudar={(t) => onCampoMudou('numero', t)}
                      placeholder="123"
                      tipo="numero"
                    />
                  </View>
                </View>
                <Input
                  rotulo="Complemento (opcional)"
                  valor={novoEndereco.complemento ?? ''}
                  aoMudar={(t) => onCampoMudou('complemento', t)}
                  placeholder="Apto, bloco, referência..."
                />
                <Input
                  rotulo="Bairro"
                  valor={novoEndereco.bairro ?? ''}
                  aoMudar={(t) => onCampoMudou('bairro', t)}
                  placeholder="Nome do bairro"
                />

                <View
                  style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}
                >
                  <View style={{ flex: 1 }}>
                    <Botao
                      label="Cancelar"
                      variante="ghost"
                      tamanho="md"
                      onPress={onCancelarAdicao}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Botao
                      label="Salvar"
                      variante="primario"
                      tamanho="md"
                      carregando={salvando}
                      onPress={onSalvar}
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
