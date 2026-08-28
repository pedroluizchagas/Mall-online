import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import type { Endereco } from '@mallevo/types'
import { Card } from '@/components/ui/Card'
import { Botao } from '@/components/ui/Botao'
import { FolhaModal } from '@/components/ui/FolhaModal'
import { FormularioEndereco } from '@/components/FormularioEndereco'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import {
  adicionarEndereco,
  editarEndereco,
  removerEndereco,
  definirPadrao,
  iconePorTipo,
} from '@/lib/enderecos'

const { colors, radius } = consumerDesign

interface Props {
  enderecos: Endereco[]
}

/** `null` = folha fechada; `'novo'` = cadastro; número = índice em edição. */
type Edicao = null | 'novo' | number

/**
 * Endereços dentro do Perfil — antes só listava e removia, e o vazio mandava
 * o usuário "adicionar no próximo pedido", ou seja, cadastrar endereço era
 * exclusividade do checkout. Agora é CRUD completo com padrão e tipo.
 *
 * A escrita toda passa por lib/enderecos.ts, que também atualiza o store —
 * por isso este componente não recebe callback de atualização.
 */
export function GerenciarEnderecos({ enderecos }: Props) {
  const [edicao, setEdicao] = useState<Edicao>(null)
  const [salvando, setSalvando] = useState(false)
  /**
   * Índice em operação, ou `null`. Uma escrita trava a lista INTEIRA, não
   * só a linha tocada: a coluna é um JSONB único, então duas operações
   * concorrentes gravam a lista completa e a última desfaz a primeira.
   */
  const [ocupado, setOcupado] = useState<number | null>(null)
  const escrevendo = ocupado !== null

  async function handleSalvar(endereco: Endereco) {
    setSalvando(true)
    const ok =
      edicao === 'novo'
        ? (await adicionarEndereco(endereco)) !== null
        : await editarEndereco(edicao as number, endereco)
    setSalvando(false)

    if (!ok) {
      Alert.alert('Erro', 'Não foi possível salvar o endereço. Tente novamente.')
      return
    }
    setEdicao(null)
  }

  function handleRemover(indice: number) {
    const alvo = enderecos[indice]
    Alert.alert(
      'Remover endereço',
      `Remover "${alvo.apelido ?? alvo.rua}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setOcupado(indice)
            const ok = await removerEndereco(indice)
            setOcupado(null)
            if (!ok) {
              Alert.alert('Erro', 'Não foi possível remover. Tente novamente.')
            }
          },
        },
      ]
    )
  }

  async function handleDefinirPadrao(indice: number) {
    setOcupado(indice)
    const ok = await definirPadrao(indice)
    setOcupado(null)
    if (!ok) {
      Alert.alert('Erro', 'Não foi possível definir o padrão. Tente novamente.')
    }
  }

  const folha = (
    <FolhaModal
      visivel={edicao !== null}
      titulo={edicao === 'novo' ? 'Novo endereço' : 'Editar endereço'}
      onFechar={() => !salvando && setEdicao(null)}
    >
      {edicao !== null && (
        <FormularioEndereco
          // Remonta o formulário ao trocar de alvo: sem a key, editar um
          // endereço depois de outro reaproveitaria o estado do anterior.
          key={String(edicao)}
          inicial={typeof edicao === 'number' ? enderecos[edicao] : undefined}
          salvando={salvando}
          onSalvar={handleSalvar}
          onCancelar={() => setEdicao(null)}
        />
      )}
    </FolhaModal>
  )

  if (enderecos.length === 0) {
    return (
      <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 12 }}>
        <Card preenchimento="md" sombra="none">
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <ConsumerIcon name="pin" size={20} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
              Nenhum endereço salvo
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.inkMuted,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              Cadastre onde você quer receber seus pedidos.
            </Text>
          </View>
        </Card>

        <Botao
          label="Adicionar endereço"
          variante="secundario"
          tamanho="md"
          iconeEsquerda="plus"
          onPress={() => setEdicao('novo')}
        />

        {folha}
      </View>
    )
  }

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 8 }}>
      {enderecos.map((end, i) => {
        // Toda a lista trava durante qualquer escrita (ver `ocupado`); só a
        // linha em operação esmaece, para mostrar onde está acontecendo.
        const desabilitado = escrevendo
        const emOperacao = ocupado === i
        return (
          <Card key={i} preenchimento="md" sombra="none">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                opacity: emOperacao ? consumerDesign.opacity.disabled : 1,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConsumerIcon
                  name={iconePorTipo(end.tipo)}
                  size={16}
                  color={colors.accent}
                />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
                  >
                    {end.apelido ?? end.rua}
                  </Text>
                  {end.padrao && <SeloPadrao />}
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.inkMuted,
                    fontWeight: '500',
                  }}
                  numberOfLines={1}
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
                  numberOfLines={1}
                >
                  {end.bairro} — {end.cidade}
                </Text>
              </View>
            </View>

            {/* Ações */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              {!end.padrao && (
                <AcaoEndereco
                  icone="star"
                  rotulo="Padrão"
                  cor={colors.ink}
                  desabilitado={desabilitado}
                  aoTocar={() => handleDefinirPadrao(i)}
                />
              )}
              <AcaoEndereco
                icone="edit"
                rotulo="Editar"
                cor={colors.ink}
                desabilitado={desabilitado}
                aoTocar={() => setEdicao(i)}
              />
              <AcaoEndereco
                icone="trash"
                rotulo="Remover"
                cor={colors.danger}
                desabilitado={desabilitado}
                aoTocar={() => handleRemover(i)}
              />
            </View>
          </Card>
        )
      })}

      <Botao
        label="Adicionar endereço"
        variante="secundario"
        tamanho="md"
        iconeEsquerda="plus"
        onPress={() => setEdicao('novo')}
      />

      {folha}
    </View>
  )
}

/** Pílula "Padrão" ao lado do apelido. */
function SeloPadrao() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: softColor(colors.accent),
      }}
    >
      <ConsumerIcon name="star" size={10} color={colors.accent} strokeWidth={2.4} />
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
    </View>
  )
}

function AcaoEndereco({
  icone,
  rotulo,
  cor,
  desabilitado,
  aoTocar,
}: {
  icone: 'star' | 'edit' | 'trash'
  rotulo: string
  cor: string
  desabilitado: boolean
  aoTocar: () => void
}) {
  return (
    <TouchableOpacity
      onPress={aoTocar}
      disabled={desabilitado}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: softColor(cor),
      }}
    >
      <ConsumerIcon name={icone} size={13} color={cor} strokeWidth={2} />
      <Text
        style={{
          color: cor,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
        }}
      >
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
