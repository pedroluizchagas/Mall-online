import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import {
  CabecalhoLoja,
  DescricaoPost,
  PilulaProduto,
  SOMBRA_TEXTO,
} from '@/components/explorar/InfoPost'
import { comentariosDoPost, type Comentario } from '@/lib/comentarios'
import { consumerDesign } from '@/lib/consumer-design'
import type { Post } from '@/lib/posts'
import { useAuthStore } from '@/store/useAuthStore'
import { useComentarios, useComentariosDoPost } from '@/store/useComentarios'

/**
 * Modo comentários do Explorar — o "ao vivo" sobre o vídeo.
 *
 * Regras que definem o modo:
 * - a barra de navegação some (a tela avisa por `useImersao`) e a rolagem
 *   do feed trava: enquanto se lê comentário, deslizar não pode trocar de
 *   reel;
 * - a coluna de informação REORDENA — descrição, produto e, por último,
 *   colada na caixa de escrever, a loja (ver `InfoPost.tsx`);
 * - os comentários entram UM POR VEZ por baixo e empurram os anteriores
 *   para cima, que vão perdendo opacidade até sair. Sem balão, sem fundo:
 *   só texto com sombra, para nunca sumir num quadro claro do vídeo.
 *
 * A caixa NÃO abre com o teclado: o que se quer ao tocar em comentários é
 * primeiro LER o que está rolando. Escrever é o toque seguinte.
 *
 * Spec: docs/system-design/consumer/07-telas.md §Explorar — modo comentários
 */

const { colors, radius } = consumerDesign

/** Intervalo entre um comentário e o próximo aparecer. */
const RITMO_MS = 2000
/** Linhas simultâneas no stream — acima disso a mais antiga sai. */
const MAX_VISIVEIS = 5
/** Da mais nova (0) para a mais velha — é o esmaecer do "ao vivo". */
const OPACIDADE_POR_IDADE = [1, 1, 0.78, 0.55, 0.32]

const ALTURA_CAIXA = 48
/** Faixa reservada à coluna de ações do reel, à direita. */
const FOLGA_ACOES = 64

interface Props {
  post: Post
  visivel: boolean
  onFechar: () => void
}

export function ComentariosLive({ post, visivel, onFechar }: Props) {
  const insets = useSafeAreaInsets()
  const consumer = useAuthStore((s) => s.consumer)
  const comentar = useComentarios((s) => s.comentar)
  const escritos = useComentariosDoPost(post.id)

  const [montado, setMontado] = useState(visivel)
  const [texto, setTexto] = useState('')
  const [revelados, setRevelados] = useState(0)
  const abertura = useRef(new Animated.Value(0)).current

  const teclado = useAlturaTeclado()
  // No Android o modo `resize` (padrão do Expo) já encolhe a janela e sobe
  // o que está ancorado no rodapé; deslocar de novo empurraria duas vezes.
  const deslocamento = Platform.OS === 'ios' ? teclado : 0
  const subida = useRef(new Animated.Value(0)).current

  const semeados = useMemo(() => comentariosDoPost(post.id), [post.id])

  const autor = consumer?.nome?.split(' ')[0] ?? 'Você'

  // ── Entrada e saída da camada ──
  useEffect(() => {
    if (visivel) {
      setMontado(true)
      Animated.timing(abertura, {
        toValue: 1,
        duration: consumerDesign.motion.base,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    } else {
      Keyboard.dismiss()
      setTexto('')
      Animated.timing(abertura, {
        toValue: 0,
        duration: consumerDesign.motion.fast,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMontado(false))
    }
  }, [visivel])

  useEffect(() => {
    Animated.timing(subida, {
      toValue: -deslocamento,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [deslocamento])

  // Voltar do Android fecha o modo antes de sair da aba.
  useEffect(() => {
    if (!visivel) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onFechar()
      return true
    })
    return () => sub.remove()
  }, [visivel, onFechar])

  // ── Ritmo do stream ──
  // Reinicia a cada abertura: o "ao vivo" começa do zero toda vez.
  useEffect(() => {
    setRevelados(visivel ? 1 : 0)
  }, [visivel, post.id])

  // Corrente auto-agendada: cada revelação marca a próxima e para sozinha
  // quando acaba o conjunto — nada de interval rodando à toa.
  useEffect(() => {
    if (!visivel || revelados >= semeados.length) return
    const t = setTimeout(() => setRevelados((n) => n + 1), RITMO_MS)
    return () => clearTimeout(t)
  }, [visivel, revelados, semeados.length])

  const stream = useMemo(
    () => [...semeados.slice(0, revelados), ...(escritos ?? [])],
    [semeados, revelados, escritos],
  )

  function enviar() {
    const limpo = texto.trim()
    if (!limpo) return
    comentar({ post, autor, texto: limpo })
    setTexto('')
  }

  if (!montado) return null

  const podeEnviar = texto.trim().length > 0
  const baseRodape = Math.max(insets.bottom, 10) + 10

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents={visivel ? 'box-none' : 'none'}
    >
      {/* Véu extra: o stream ocupa metade da tela e precisa de mais
          contraste do que o gradiente padrão do reel dá.
          rgba literal — overlay sobre vídeo, 01-tokens.md §11. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '78%',
          opacity: abertura,
        }}
        pointerEvents="none"
      >
        {[0, 0.06, 0.14, 0.26, 0.4, 0.55, 0.68].map((o, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${o})` }} />
        ))}
      </Animated.View>

      {/*
        Toque fora fecha o modo (e o teclado junto). A faixa da direita fica
        de fora: é onde mora a coluna de ações do reel, que continua viva no
        modo comentários — um backdrop de tela inteira engoliria o toque no
        coração e no compartilhar.
      */}
      <TouchableWithoutFeedback onPress={onFechar} accessible={false}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: FOLGA_ACOES,
          }}
        />
      </TouchableWithoutFeedback>

      {/* Coluna: stream em cima, informação reordenada embaixo */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: baseRodape + ALTURA_CAIXA + 14,
          paddingRight: FOLGA_ACOES,
          gap: 12,
          opacity: abertura,
          transform: [{ translateY: subida }],
        }}
        pointerEvents="box-none"
      >
        <Stream comentarios={stream} />
        <DescricaoPost post={post} linhas={2} />
        <PilulaProduto post={post} />
        <CabecalhoLoja post={post} compacto />
      </Animated.View>

      {/* Caixa de escrever */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: baseRodape,
          opacity: abertura,
          transform: [{ translateY: subida }],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: ALTURA_CAIXA,
            paddingLeft: 16,
            paddingRight: 6,
            borderRadius: radius.pill,
            backgroundColor: 'rgba(255,255,255,0.13)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.24)',
          }}
        >
          <TextInput
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={enviar}
            placeholder={`Comentar como ${autor}`}
            placeholderTextColor="rgba(255,255,255,0.5)"
            returnKeyType="send"
            style={{
              flex: 1,
              color: colors.white,
              fontSize: 14,
              fontWeight: '500',
              padding: 0,
            }}
            maxLength={280}
          />

          <TouchableOpacity
            onPress={enviar}
            disabled={!podeEnviar}
            activeOpacity={consumerDesign.opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="Enviar comentário"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: podeEnviar
                ? colors.accent
                : 'rgba(255,255,255,0.16)',
            }}
          >
            <ConsumerIcon
              name="send"
              size={16}
              color={podeEnviar ? colors.ink : 'rgba(255,255,255,0.6)'}
              strokeWidth={2.1}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────
// Stream
// ─────────────────────────────────────────────────────────

function Stream({ comentarios }: { comentarios: Comentario[] }) {
  const visiveis = comentarios.slice(-MAX_VISIVEIS)

  return (
    <View style={{ justifyContent: 'flex-end', gap: 10 }}>
      {visiveis.map((comentario, i) => (
        <Linha
          key={comentario.id}
          comentario={comentario}
          // Idade = distância até a linha mais nova (0 = recém-chegada).
          opacidadeAlvo={
            OPACIDADE_POR_IDADE[visiveis.length - 1 - i] ??
            OPACIDADE_POR_IDADE[OPACIDADE_POR_IDADE.length - 1]
          }
        />
      ))}
    </View>
  )
}

function Linha({
  comentario,
  opacidadeAlvo,
}: {
  comentario: Comentario
  opacidadeAlvo: number
}) {
  const entrada = useRef(new Animated.Value(0)).current
  const atenuacao = useRef(new Animated.Value(opacidadeAlvo)).current
  const ehLoja = comentario.autor_tipo === 'loja'

  useEffect(() => {
    Animated.spring(entrada, {
      toValue: 1,
      damping: 16,
      stiffness: 150,
      useNativeDriver: true,
    }).start()
  }, [])

  // Envelhecer é gradual: a linha desbota conforme sobe, não em degraus.
  useEffect(() => {
    Animated.timing(atenuacao, {
      toValue: opacidadeAlvo,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [opacidadeAlvo])

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        opacity: Animated.multiply(entrada, atenuacao),
        transform: [
          {
            translateY: entrada.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      }}
    >
      {ehLoja && (
        <View style={{ paddingTop: 3 }}>
          <ConsumerIcon name="store" size={12} color={colors.accent} strokeWidth={2.1} />
        </View>
      )}

      <Text
        style={{
          flex: 1,
          fontSize: 13.5,
          lineHeight: 19,
          fontWeight: '500',
          color: colors.white,
          ...SOMBRA_TEXTO,
        }}
        // Trava a altura do stream: cinco comentários longos empilhados
        // subiriam por cima do vídeo inteiro.
        numberOfLines={3}
      >
        <Text
          style={{ fontWeight: '800', color: ehLoja ? colors.accent : colors.white }}
        >
          {comentario.autor}
        </Text>
        {comentario.resposta_a ? (
          <Text style={{ fontWeight: '600', color: colors.accent }}>
            {' '}
            respondeu você
          </Text>
        ) : null}
        {'  '}
        {comentario.texto}
      </Text>
    </Animated.View>
  )
}

/**
 * Altura do teclado. Um listener por camada (a camada é única na tela) —
 * pôr isso no item do reel criaria um listener por card montado.
 */
function useAlturaTeclado() {
  const [altura, setAltura] = useState(0)

  useEffect(() => {
    const aoAbrir = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setAltura(e.endCoordinates.height),
    )
    const aoFechar = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setAltura(0),
    )
    return () => {
      aoAbrir.remove()
      aoFechar.remove()
    }
  }, [])

  return altura
}
