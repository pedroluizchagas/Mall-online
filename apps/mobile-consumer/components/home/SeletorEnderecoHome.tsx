import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import type { Endereco } from '@mallevo/types'
import { Botao } from '@/components/ui/Botao'
import { FolhaModal } from '@/components/ui/FolhaModal'
import { FormularioEndereco } from '@/components/FormularioEndereco'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { useAuthStore } from '@/store/useAuthStore'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import {
  adicionarEndereco,
  definirPadrao,
  enderecoPadrao,
  enderecosAtuais,
  iconePorTipo,
  mesmoEndereco,
} from '@/lib/enderecos'

const { colors, radius } = consumerDesign

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
      titulo={adicionando ? 'Novo endereço' : 'Entregar em'}
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
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  borderRadius: radius.md,
                  borderWidth: ativo ? 1.5 : 1,
                  borderColor: ativo ? colors.accent : colors.line,
                  backgroundColor: ativo
                    ? softColor(colors.accent)
                    : colors.surface,
                  opacity:
                    ocupado && trocando !== i
                      ? consumerDesign.opacity.disabled
                      : 1,
                }}
              >
                <ConsumerIcon
                  name={iconePorTipo(end.tipo)}
                  size={18}
                  color={ativo ? colors.accent : colors.inkMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
                    numberOfLines={1}
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
                {ativo && (
                  <ConsumerIcon
                    name="check"
                    size={18}
                    color={colors.accent}
                    strokeWidth={2.4}
                  />
                )}
              </TouchableOpacity>
            )
          })}

          <Botao
            label="Adicionar novo endereço"
            variante="secundario"
            tamanho="md"
            iconeEsquerda="plus"
            onPress={() => setAdicionando(true)}
            desabilitado={ocupado}
          />
        </>
      )}
    </FolhaModal>
  )
}
