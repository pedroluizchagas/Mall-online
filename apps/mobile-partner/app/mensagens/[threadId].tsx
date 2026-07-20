import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import {
  enviarMensagem,
  listarMensagens,
  marcarThreadLida,
  type Mensagem,
} from '@/lib/operacao'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Chat de uma conversa — Realtime em `messages` (tabela já está na
// publication supabase_realtime). Enviar grava autor_tipo='lojista'.
// docs/partner-app/08 §3.

export default function TelaConversa() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const listaRef = useRef<FlatList<Mensagem>>(null)
  const { colors, radius, spacing, typography } = partnerDesign

  const carregar = useCallback(async () => {
    const msgs = await listarMensagens(String(threadId))
    setMensagens(msgs)
    void marcarThreadLida(String(threadId))
  }, [threadId])

  useEffect(() => {
    void carregar()

    const canal = supabase
      .channel(`thread-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const nova = payload.new as Mensagem
          setMensagens((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]))
          void marcarThreadLida(String(threadId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [threadId])

  async function handleEnviar() {
    const corpo = texto.trim()
    if (!corpo || enviando) return
    setTexto('')
    setEnviando(true)

    // Otimista: aparece na hora; o Realtime confirma (dedupe por id)
    const otimista: Mensagem = {
      id: `local-${Date.now()}`,
      thread_id: String(threadId),
      autor_tipo: 'lojista',
      corpo,
      criada_em: new Date().toISOString(),
    }
    setMensagens((prev) => [...prev, otimista])

    const r = await enviarMensagem(String(threadId), corpo)
    setEnviando(false)
    if (r.erro) {
      setMensagens((prev) => prev.filter((m) => m.id !== otimista.id))
      setTexto(corpo)
    } else {
      void carregar()
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 56,
            paddingBottom: spacing.md,
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.canvas,
            gap: spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/mensagens'))}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PartnerIcon name="back" size={18} color={colors.ink} />
          </TouchableOpacity>
          <Text style={{ color: colors.ink, fontSize: typography.h3.size, fontWeight: '700' }}>
            Conversa
          </Text>
        </View>

        <FlatList
          ref={listaRef}
          data={mensagens}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
          renderItem={({ item }) => {
            const minha = item.autor_tipo === 'lojista'
            return (
              <View
                style={{
                  alignSelf: minha ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: minha ? colors.ink : colors.surface,
                  borderRadius: radius.md,
                  borderBottomRightRadius: minha ? 4 : radius.md,
                  borderBottomLeftRadius: minha ? radius.md : 4,
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: minha ? colors.white : colors.ink, fontSize: typography.body.size }}>
                  {item.corpo}
                </Text>
                <Text
                  style={{
                    color: minha ? '#8B8E94' : colors.inkSoft,
                    fontSize: typography.micro.size,
                    marginTop: 3,
                    textAlign: 'right',
                  }}
                >
                  {new Date(item.criada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )
          }}
        />

        {/* Composer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            padding: spacing.md,
            paddingBottom: spacing['2xl'],
            gap: spacing.sm,
            backgroundColor: colors.canvas,
          }}
        >
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva uma mensagem…"
            placeholderTextColor={colors.inkSoft}
            multiline
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              paddingHorizontal: 16,
              paddingVertical: 10,
              maxHeight: 110,
              color: colors.ink,
              fontSize: typography.bodyLg.size,
            }}
          />
          <TouchableOpacity
            onPress={() => void handleEnviar()}
            disabled={enviando || !texto.trim()}
            activeOpacity={0.85}
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.pill,
              backgroundColor: texto.trim() ? colors.accent : colors.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <PartnerIcon name="back" size={18} color={texto.trim() ? colors.ink : colors.inkSoft} strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
