import { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { useAuthStore } from '@/store/useAuthStore'
import {
  atualizarCategoria,
  criarCategoria,
  excluirCategoria,
  listarCategorias,
  type Categoria,
} from '@/lib/catalogo'
import { BotaoPrimario, CabecalhoTela, CampoTexto, Cartao, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Categorias — CRUD + reordenar (setas ↑↓ trocam `ordem` com a vizinha).
// Globais (tenant_id null) aparecem read-only. Slug é imutável
// (migration_014) — o app nem exibe slug. docs/partner-app/06 §Categorias.

export default function TelaCategorias() {
  const { tenant } = useAuthStore()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState<Categoria | 'nova' | null>(null)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    if (!tenant) return
    setCarregando(true)
    setCategorias(await listarCategorias(tenant.id))
    setCarregando(false)
  }, [tenant?.id])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar])
  )

  const proprias = categorias.filter((c) => c.tenant_id === tenant?.id)
  const globais = categorias.filter((c) => c.tenant_id === null)

  async function mover(cat: Categoria, direcao: -1 | 1) {
    const idx = proprias.findIndex((c) => c.id === cat.id)
    const vizinha = proprias[idx + direcao]
    if (!vizinha) return

    // Troca as ordens (duas updates); recarrega ao fim
    const r1 = await atualizarCategoria(cat.id, { ordem: vizinha.ordem })
    const r2 = await atualizarCategoria(vizinha.id, { ordem: cat.ordem })
    if (r1.erro || r2.erro) Alert.alert('Não foi possível reordenar', r1.erro ?? r2.erro)
    void carregar()
  }

  function handleExcluir(cat: Categoria) {
    Alert.alert('Excluir categoria', `Produtos em "${cat.nome}" ficarão sem categoria.`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!tenant) return
          const r = await excluirCategoria(cat.id, tenant.id)
          if (r.erro) Alert.alert('Não foi possível excluir', r.erro)
          void carregar()
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: 120 }}
      >
        <CabecalhoTela titulo="Categorias">
          <TouchableOpacity
            onPress={() => setEditando('nova')}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.accent,
              borderRadius: radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 14,
              gap: 6,
            }}
          >
            <PartnerIcon name="plus" size={16} color={colors.ink} strokeWidth={2.4} />
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: typography.bodySm.size }}>
              Nova
            </Text>
          </TouchableOpacity>
        </CabecalhoTela>

        <Legenda>Suas categorias</Legenda>
        <Cartao semPadding>
          {proprias.length === 0 ? (
            <Text style={{ color: colors.inkSoft, padding: spacing.lg, fontSize: typography.body.size }}>
              Nenhuma categoria própria ainda.
            </Text>
          ) : (
            proprias.map((c, i) => (
              <View
                key={c.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: spacing.lg,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                  gap: spacing.sm,
                }}
              >
                <TouchableOpacity onPress={() => setEditando(c)} activeOpacity={0.7} style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: '700', fontSize: typography.bodyLg.size }}>
                    {c.icone ? `${c.icone} ` : ''}{c.nome}
                  </Text>
                </TouchableOpacity>
                <Seta direcao="cima" desabilitada={i === 0} onPress={() => void mover(c, -1)} />
                <Seta direcao="baixo" desabilitada={i === proprias.length - 1} onPress={() => void mover(c, 1)} />
                <TouchableOpacity onPress={() => handleExcluir(c)} activeOpacity={0.7} style={{ padding: 6 }}>
                  <Text style={{ color: colors.danger, fontSize: typography.bodySm.size, fontWeight: '700' }}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Cartao>

        {globais.length > 0 && (
          <>
            <Legenda>Categorias da plataforma (somente leitura)</Legenda>
            <Cartao semPadding>
              {globais.map((c, i) => (
                <View
                  key={c.id}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <Text style={{ color: colors.inkMuted, fontSize: typography.body.size }}>
                    {c.icone ? `${c.icone} ` : ''}{c.nome}
                  </Text>
                </View>
              ))}
            </Cartao>
          </>
        )}
      </ScrollView>

      <ModalCategoria
        alvo={editando}
        fechar={() => setEditando(null)}
        salvo={() => {
          setEditando(null)
          void carregar()
        }}
      />
    </View>
  )
}

function Seta({ direcao, desabilitada, onPress }: { direcao: 'cima' | 'baixo'; desabilitada: boolean; onPress: () => void }) {
  const { colors } = partnerDesign
  return (
    <TouchableOpacity onPress={onPress} disabled={desabilitada} activeOpacity={0.7} style={{ padding: 6, opacity: desabilitada ? 0.25 : 1 }}>
      <View style={{ transform: [{ rotate: direcao === 'cima' ? '90deg' : '-90deg' }] }}>
        <PartnerIcon name="back" size={16} color={colors.inkMuted} strokeWidth={2.2} />
      </View>
    </TouchableOpacity>
  )
}

function ModalCategoria({
  alvo,
  fechar,
  salvo,
}: {
  alvo: Categoria | 'nova' | null
  fechar: () => void
  salvo: () => void
}) {
  const { tenant } = useAuthStore()
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { colors, radius, spacing, typography, opacity } = partnerDesign

  const editandoExistente = alvo !== null && alvo !== 'nova'

  // Sincroniza campos ao abrir
  useEffect(() => {
    if (alvo === 'nova') {
      setNome('')
      setIcone('')
    } else if (alvo) {
      setNome(alvo.nome)
      setIcone(alvo.icone ?? '')
    }
  }, [alvo])

  async function handleSalvar() {
    if (!tenant || salvando) return
    if (nome.trim().length < 2) {
      Alert.alert('Nome obrigatório')
      return
    }
    setSalvando(true)
    const r = editandoExistente
      ? await atualizarCategoria((alvo as Categoria).id, { nome: nome.trim(), icone: icone.trim() || null })
      : await criarCategoria(tenant.id, { nome: nome.trim(), icone: icone.trim() || null })
    setSalvando(false)

    if (r.erro) {
      Alert.alert('Não foi possível salvar', r.erro)
      return
    }
    salvo()
  }

  return (
    <Modal visible={alvo !== null} transparent animationType="fade" onRequestClose={fechar}>
      <Pressable
        onPress={fechar}
        style={{ flex: 1, backgroundColor: `rgba(17, 18, 22, ${opacity.overlay})`, justifyContent: 'flex-end' }}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
            paddingBottom: spacing['4xl'],
          }}
        >
          <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '700', marginBottom: spacing.md }}>
            {editandoExistente ? 'Editar categoria' : 'Nova categoria'}
          </Text>
          <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} placeholder="Ex.: Bebidas" />
          <CampoTexto rotulo="Emoji/ícone (opcional)" valor={icone} aoMudar={setIcone} placeholder="🥤" />
          <BotaoPrimario rotulo="Salvar" onPress={() => void handleSalvar()} carregando={salvando} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}
