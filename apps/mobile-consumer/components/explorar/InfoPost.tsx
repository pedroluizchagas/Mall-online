import { Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { formatarReais } from '@mallevo/lib'
import { BotaoSeguir } from '@/components/BotaoSeguir'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import type { Post } from '@/lib/posts'

/**
 * As três peças de informação do reel — cabeçalho da loja, descrição e
 * pílula do produto — isoladas porque o Explorar as monta em DUAS ordens:
 *
 * | modo         | ordem (de cima para baixo)              |
 * |--------------|-----------------------------------------|
 * | normal       | loja · descrição · produto              |
 * | comentários  | descrição · produto · loja              |
 *
 * No modo comentários o stream ocupa o topo da coluna, e o que interessa
 * ali embaixo, colado na caixa de escrever, é saber de quem é a loja que
 * está respondendo. Reordenar peças prontas (em vez de duplicar markup)
 * é o que mantém as duas montagens idênticas no detalhe.
 *
 * Textos sem caixa, só com sombra: o reel é vídeo, e fundo sólido atrás de
 * cada linha sujaria a imagem. rgba literal é o caso documentado em
 * 01-tokens.md §11 (overlay sobre vídeo).
 */

const { colors, radius } = consumerDesign

export const SOMBRA_TEXTO = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowRadius: 6,
  textShadowOffset: { width: 0, height: 1 },
} as const

/** Avatar + nome + Seguir. */
export function CabecalhoLoja({
  post,
  compacto = false,
}: {
  post: Post
  compacto?: boolean
}) {
  const tamanho = compacto ? 32 : 38

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.white,
        }}
      >
        <Text
          style={{
            color: colors.ink,
            fontWeight: '800',
            fontSize: compacto ? 14 : 16,
            lineHeight: compacto ? 18 : 20,
          }}
        >
          {post.loja_inicial}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push(`/loja/${post.loja_slug}`)}
        activeOpacity={0.75}
        style={{ flexShrink: 1 }}
      >
        <Text
          style={{
            color: colors.white,
            fontWeight: '700',
            fontSize: 14,
            ...SOMBRA_TEXTO,
          }}
          numberOfLines={1}
        >
          {post.loja_nome}
        </Text>
      </TouchableOpacity>

      {/* Seguir grava em useSeguidas — alimenta a tela Seguindo. */}
      <BotaoSeguir
        loja={{ slug: post.loja_slug, nome: post.loja_nome }}
        variante="reel"
        tamanho="sm"
      />
    </View>
  )
}

/** Legenda + hashtags. */
export function DescricaoPost({
  post,
  linhas = 3,
}: {
  post: Post
  linhas?: number
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: colors.white,
          fontSize: 13,
          lineHeight: 19,
          fontWeight: '500',
          ...SOMBRA_TEXTO,
        }}
        numberOfLines={linhas}
      >
        {post.descricao}
      </Text>

      {post.tags.length > 0 && (
        <Text
          style={{
            color: colors.inkSoft,
            fontSize: 12,
            fontWeight: '600',
            ...SOMBRA_TEXTO,
          }}
          numberOfLines={1}
        >
          {post.tags.join('  ')}
        </Text>
      )}
    </View>
  )
}

/** Pílula do produto vitrinado — nome + preço, leva à loja. */
export function PilulaProduto({ post }: { post: Post }) {
  if (!post.produto) return null

  return (
    <TouchableOpacity
      onPress={() => router.push(`/loja/${post.loja_slug}`)}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(17,18,22,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: radius.pill,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      <ConsumerIcon name="bag" size={13} color={colors.accent} />
      <Text
        style={{
          color: colors.white,
          fontSize: 12,
          fontWeight: '600',
          maxWidth: 130,
        }}
        numberOfLines={1}
      >
        {post.produto.nome}
      </Text>
      <View
        style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.22)' }}
      />
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>
        {/* preco em centavos (products.preco) */}
        {formatarReais(post.produto.preco)}
      </Text>
    </TouchableOpacity>
  )
}
