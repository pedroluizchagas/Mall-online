import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import type { Endereco } from '@mallevo/types'
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
  rotuloPorTipo,
} from '@/lib/enderecos'

const { colors, radius, shadow } = consumerDesign

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
 *
 * Visual (2026-09-12): vive dentro de um `SecaoFolha` do Perfil, então
 * fala a língua da folha — cartões `surface` sem borda, moeda `ink` com o
 * ícone do tipo em accent, selo "PADRÃO", ações em pílulas discretas e a
 * linha tracejada de "novo endereço" (a mesma do "Entregar em" do Início).
 * A edição abre no `FolhaModal` com o `FormularioEndereco`.
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
      sobrelinha={edicao === 'novo' ? 'Cadastrar' : 'Editar'}
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

  const linhaNovo = (
    <TouchableOpacity
      onPress={() => setEdicao('novo')}
      disabled={escrevendo}
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
        opacity: escrevendo ? consumerDesign.opacity.disabled : 1,
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
          {enderecos.length === 0 ? 'Cadastrar meu primeiro endereço' : 'Novo endereço'}
        </Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkMuted, marginTop: 2 }}>
          {enderecos.length === 0
            ? 'Onde você quer receber seus pedidos'
            : 'Casa, trabalho ou onde você estiver'}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ gap: 12 }}>
      {enderecos.map((end, i) => {
        // Toda a lista trava durante qualquer escrita (ver `ocupado`); só a
        // linha em operação esmaece, para mostrar onde está acontecendo.
        const desabilitado = escrevendo
        const emOperacao = ocupado === i
        return (
          <View
            key={i}
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: 14,
                opacity: emOperacao ? consumerDesign.opacity.disabled : 1,
              },
              shadow.soft,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                  {end.padrao && <SeloPadrao />}
                </View>
                <Text
                  style={{ fontSize: 13, color: colors.inkMuted, marginTop: 2, fontWeight: '500' }}
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
                  rotulo="Tornar padrão"
                  desabilitado={desabilitado}
                  aoTocar={() => handleDefinirPadrao(i)}
                />
              )}
              <AcaoEndereco
                icone="edit"
                rotulo="Editar"
                desabilitado={desabilitado}
                aoTocar={() => setEdicao(i)}
              />
              <View style={{ flex: 1 }} />
              <AcaoEndereco
                icone="trash"
                rotulo="Remover"
                perigo
                desabilitado={desabilitado}
                aoTocar={() => handleRemover(i)}
              />
            </View>
          </View>
        )
      })}

      {linhaNovo}

      {folha}
    </View>
  )
}

/** Selo "PADRÃO" ao lado do apelido — tinta escura sobre accent. */
function SeloPadrao() {
  return (
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
      Padrão
    </Text>
  )
}

/** Ação discreta em pílula: fumê com tinta `ink`; `perigo` = danger suave. */
function AcaoEndereco({
  icone,
  rotulo,
  perigo = false,
  desabilitado,
  aoTocar,
}: {
  icone: 'star' | 'edit' | 'trash'
  rotulo: string
  perigo?: boolean
  desabilitado: boolean
  aoTocar: () => void
}) {
  const cor = perigo ? colors.danger : colors.ink
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
        height: 30,
        paddingHorizontal: 11,
        borderRadius: radius.pill,
        backgroundColor: perigo ? softColor(colors.danger) : colors.surfaceMuted,
      }}
    >
      <ConsumerIcon name={icone} size={13} color={cor} strokeWidth={2.1} />
      <Text style={{ color: cor, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 }}>
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
