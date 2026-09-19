import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import type { Endereco } from '@mallevo/types'
import { FolhaModal } from '@/components/ui/FolhaModal'
import { FormularioEndereco } from '@/components/FormularioEndereco'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useAuthStore } from '@/store/useAuthStore'
import { consumerDesign } from '@/lib/consumer-design'
import {
  adicionarEndereco,
  definirPadrao,
  enderecoPadrao,
  enderecosAtuais,
  iconePorTipo,
  mesmoEndereco,
  rotuloPorTipo,
} from '@/lib/enderecos'

const { colors, radius, shadow } = consumerDesign

interface Props {
  visivel: boolean
  onFechar: () => void
}

/**
 * Troca de endereço a partir da marquise do Início.
 *
 * Diferente do SeletorEndereco do checkout (que só mexe num useState da
 * tela), escolher aqui é DEFINIR O PADRÃO: a marquise, o checkout e o
 * perfil leem o mesmo `consumer.enderecos` do store, então uma escrita só
 * sincroniza tudo. Endereço novo cadastrado por aqui também vira o padrão —
 * quem abre "Entregar em" e preenche um formulário quer receber ali.
 *
 * Visual: folha sobre `canvas` com o letreiro da casa; cada endereço é um
 * cartão claro sem borda (a mesma linguagem da folha da home), com a moeda
 * `ink` + ícone do tipo em accent; o atual leva o fio `accentRing` e o
 * selo "ATUAL"; o último item é a linha tracejada de "novo endereço".
 */
export function SeletorEnderecoHome({ visivel, onFechar }: Props) {
  const enderecos = useAuthStore((s) => s.consumer?.enderecos ?? [])
  const padrao = enderecoPadrao(enderecos)

  const [adicionando, setAdicionando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  // Índice em gravação — trava a lista inteira (uma escrita por vez, mesma
  // regra do GerenciarEnderecos) e apaga levemente as linhas.
  const [trocando, setTrocando] = useState<number | null>(null)

  // Sem endereço salvo não há o que listar: a folha abre direto no
  // formulário. Reavaliado a cada abertura, nunca no meio de uma sessão.
  useEffect(() => {
    if (visivel) setAdicionando(enderecosAtuais().length === 0)
  }, [visivel])

  const ocupado = salvando || trocando !== null

  async function selecionar(indice: number) {
    if (ocupado) return
    if (mesmoEndereco(enderecos[indice], padrao)) {
      onFechar()
      return
    }

    setTrocando(indice)
    const ok = await definirPadrao(indice)
    setTrocando(null)

    if (!ok) {
      Alert.alert('Erro', 'Não foi possível trocar o endereço. Tente novamente.')
      return
    }
    onFechar()
  }

  async function handleSalvar(endereco: Endereco) {
    setSalvando(true)
    const salvo = await adicionarEndereco(endereco)
    // Cadastrou para entregar aqui: o recém-adicionado (último da lista)
    // assume o padrão. Se esta segunda escrita falhar, o endereço já existe
    // — o usuário ainda pode selecioná-lo na lista.
    if (salvo) await definirPadrao(enderecosAtuais().length - 1)
    setSalvando(false)

    if (!salvo) {
      Alert.alert('Erro', 'Não foi possível salvar o endereço. Tente novamente.')
      return
    }
    setAdicionando(false)
    onFechar()
  }

  function fechar() {
    if (ocupado) return
    setAdicionando(false)
    onFechar()
  }

  return (
    <FolhaModal
      visivel={visivel}
      sobrelinha={adicionando ? 'Cadastrar' : 'Onde você está'}
      titulo={adicionando ? 'Novo endereço' : 'Entregar em'}
      fundo={adicionando ? 'surface' : 'canvas'}
      onFechar={fechar}
    >
      {adicionando ? (
        <FormularioEndereco
          salvando={salvando}
          onSalvar={handleSalvar}
          onCancelar={() => {
            // Sem nenhum endereço, "cancelar" não tem lista para voltar.
            if (enderecos.length === 0) fechar()
            else setAdicionando(false)
          }}
        />
      ) : (
        <>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '500',
              color: colors.inkMuted,
              paddingHorizontal: 8,
              marginTop: -4,
              marginBottom: 2,
            }}
          >
            O endereço escolhido vira o padrão do Início e do checkout.
          </Text>

          {enderecos.map((end, i) => {
            const ativo = mesmoEndereco(end, padrao)
            return (
              <TouchableOpacity
                key={i}
                onPress={() => selecionar(i)}
                disabled={ocupado}
                activeOpacity={consumerDesign.opacity.pressedSoft}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                accessibilityLabel={`${end.apelido ?? end.rua}, ${end.rua}, ${end.numero}${ativo ? '. Endereço atual' : ''}`}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: ativo ? colors.accentRing : 'transparent',
                    opacity:
                      ocupado && trocando !== i
                        ? consumerDesign.opacity.disabled
                        : 1,
                  },
                  shadow.soft,
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.sm,
                    backgroundColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ConsumerIcon
                    name={iconePorTipo(end.tipo)}
                    size={18}
                    color={colors.accent}
                    strokeWidth={2}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: '700',
                        color: colors.ink,
                        letterSpacing: -0.2,
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {end.apelido ?? rotuloPorTipo(end.tipo)}
                    </Text>
                    {ativo && (
                      <Text
                        style={{
                          fontSize: 9.5,
                          fontWeight: '800',
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          color: colors.ink,
                          backgroundColor: colors.accent,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: radius.pill,
                          overflow: 'hidden',
                        }}
                      >
                        Atual
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
                    numberOfLines={1}
                  >
                    {end.rua}, {end.numero}
                    {end.complemento ? ` — ${end.complemento}` : ''}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: colors.inkSoft, fontWeight: '500' }}
                    numberOfLines={1}
                  >
                    {end.bairro} — {end.cidade}
                  </Text>
                </View>
                {ativo ? (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ConsumerIcon name="check" size={13} color={colors.accent} strokeWidth={2.6} />
                  </View>
                ) : (
                  <ConsumerIcon name="chevron-right" size={16} color={colors.inkSoft} />
                )}
              </TouchableOpacity>
            )
          })}

          {/* Novo endereço: a linha tracejada, como o slot "Descobrir". */}
          <TouchableOpacity
            onPress={() => setAdicionando(true)}
            disabled={ocupado}
            activeOpacity={consumerDesign.opacity.pressedSoft}
            accessibilityRole="button"
            accessibilityLabel="Adicionar novo endereço"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.inkSoft,
              opacity: ocupado ? consumerDesign.opacity.disabled : 1,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.sm,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConsumerIcon name="plus" size={18} color={colors.ink} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 }}>
                Novo endereço
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}>
                Casa, trabalho ou onde você estiver
              </Text>
            </View>
          </TouchableOpacity>
        </>
      )}
    </FolhaModal>
  )
}
