import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import type { Endereco } from '@mallevo/types'
import { Botao } from '@/components/ui/Botao'
import { FolhaModal } from '@/components/ui/FolhaModal'
import { FormularioEndereco } from '@/components/FormularioEndereco'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { useAuthStore } from '@/store/useAuthStore'
import { adicionarEndereco, iconePorTipo, mesmoEndereco } from '@/lib/enderecos'

const { colors, radius, shadow } = consumerDesign

interface Props {
  enderecos: Endereco[]
  selecionado: Endereco | null
  onSelecionar: (endereco: Endereco) => void
}

/**
 * Escolha do endereço de entrega no checkout.
 *
 * O formulário embutido virou FormularioEndereco (compartilhado com o
 * perfil) e a escrita passou para lib/enderecos.ts — este arquivo cuida só
 * da seleção e de abrir a folha.
 */
export function SeletorEndereco({ enderecos, selecionado, onSelecionar }: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar(endereco: Endereco) {
    setSalvando(true)
    const ok = await adicionarEndereco(enderecos, endereco)
    setSalvando(false)

    if (!ok) {
      Alert.alert('Erro', 'Não foi possível salvar o endereço. Tente novamente.')
      return
    }

    // O endereço gravado é o último da lista já normalizada pelo store —
    // pegá-lo de lá garante que a seleção carrega as coordenadas obtidas na
    // geocodificação (das quais depende o aviso de distância no checkout).
    const lista = useAuthStore.getState().consumer?.enderecos ?? []
    const salvo = lista[lista.length - 1] ?? endereco

    onSelecionar(salvo)
    setAdicionando(false)
    setModalAberto(false)
  }

  function fecharModal() {
    if (salvando) return
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
            <ConsumerIcon
              name={iconePorTipo(selecionado.tipo)}
              size={18}
              color={colors.accent}
            />
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

      <FolhaModal
        visivel={modalAberto}
        titulo={adicionando ? 'Novo endereço' : 'Endereços salvos'}
        onFechar={fecharModal}
      >
        {adicionando ? (
          <FormularioEndereco
            salvando={salvando}
            onSalvar={handleSalvar}
            onCancelar={() => setAdicionando(false)}
          />
        ) : (
          <>
            {enderecos.map((end, i) => {
              const ativo = mesmoEndereco(selecionado, end)
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    onSelecionar(end)
                    setModalAberto(false)
                  }}
                  activeOpacity={consumerDesign.opacity.pressedSoft}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 16,
                    borderRadius: radius.md,
                    borderWidth: ativo ? 1.5 : 1,
                    borderColor: ativo ? colors.accent : colors.line,
                    backgroundColor: ativo
                      ? softColor(colors.accent)
                      : colors.surface,
                  }}
                >
                  <ConsumerIcon
                    name={iconePorTipo(end.tipo)}
                    size={18}
                    color={ativo ? colors.accent : colors.inkMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
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
                      {end.padrao && (
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: colors.accent,
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                          }}
                        >
                          Padrão
                        </Text>
                      )}
                    </View>
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
                  </View>
                </TouchableOpacity>
              )
            })}

            <Botao
              label="Adicionar novo endereço"
              variante="secundario"
              tamanho="md"
              iconeEsquerda="plus"
              onPress={() => setAdicionando(true)}
            />
          </>
        )}
      </FolhaModal>
    </View>
  )
}
