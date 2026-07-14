import { View, Text, Image, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreDesign } from '@/lib/store-theme'
import { fontStyle } from '@/lib/store-fonts'

/**
 * Card de produto. 2 variantes:
 * - 'lista' (default): row, imagem 88x88 à direita, info à esquerda.
 * - 'grade': coluna, imagem topo, info abaixo.
 *
 * Dentro de loja tematizada, raio/densidade/fonte vêm do StoreDesign.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §3
 */

export interface ProdutoCardModel {
  id: string
  nome: string
  descricao: string | null
  preco: number
  preco_promocional?: number | null
  foto_url: string | null
}

interface Props {
  produto: ProdutoCardModel
  aoTocar: () => void
  variante?: 'lista' | 'grade'
}

export function ProdutoCard({ produto, aoTocar, variante = 'lista' }: Props) {
  const design = useStoreDesign()
  const { colors } = design
  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional

  if (variante === 'grade') {
    return (
      <TouchableOpacity
        onPress={aoTocar}
        activeOpacity={consumerDesign.opacity.pressedSoft}
        style={{
          backgroundColor: colors.surface,
          borderRadius: design.radius.lg,
          overflow: 'hidden',
        }}
      >
        <ImagemProduto url={produto.foto_url} altura={120} />
        <View style={{ padding: 12, gap: 4 }}>
          <Text
            style={{ fontSize: 14, color: colors.ink, ...fontStyle(design.body, 700) }}
            numberOfLines={1}
          >
            {produto.nome}
          </Text>
          {produto.descricao && (
            <Text
              style={{ fontSize: 12, color: colors.inkMuted, ...fontStyle(design.body, 500) }}
              numberOfLines={2}
            >
              {produto.descricao}
            </Text>
          )}
          <PrecoLinha preco={precoFinal} precoOriginal={temPromo ? produto.preco : undefined} />
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={consumerDesign.opacity.pressedSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: design.spacing.card,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          style={{ fontSize: 16, color: colors.ink, ...fontStyle(design.body, 700) }}
          numberOfLines={1}
        >
          {produto.nome}
        </Text>
        {produto.descricao && (
          <Text
            style={{ fontSize: 13, color: colors.inkMuted, ...fontStyle(design.body, 500) }}
            numberOfLines={2}
          >
            {produto.descricao}
          </Text>
        )}
        <View style={{ marginTop: 4 }}>
          <PrecoLinha preco={precoFinal} precoOriginal={temPromo ? produto.preco : undefined} />
        </View>
      </View>

      <ImagemProduto url={produto.foto_url} altura={88} largura={88} />
    </TouchableOpacity>
  )
}

function ImagemProduto({
  url,
  altura,
  largura = '100%',
}: {
  url: string | null
  altura: number
  largura?: number | `${number}%`
}) {
  const design = useStoreDesign()
  const { colors } = design
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: largura,
          height: altura,
          borderRadius: design.radius.md,
          backgroundColor: colors.canvasAlt,
        }}
        resizeMode="cover"
      />
    )
  }

  return (
    <View
      style={{
        width: largura,
        height: altura,
        borderRadius: design.radius.md,
        backgroundColor: colors.canvasAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ConsumerIcon name="bag" size={28} color={colors.inkSoft} />
    </View>
  )
}

function PrecoLinha({
  preco,
  precoOriginal,
}: {
  preco: number
  precoOriginal?: number
}) {
  const design = useStoreDesign()
  const { colors } = design
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 15, color: colors.ink, ...fontStyle(design.body, 800) }}>
        {formatarReais(preco)}
      </Text>
      {precoOriginal !== undefined && (
        <Text
          style={{
            fontSize: 13,
            color: colors.inkSoft,
            textDecorationLine: 'line-through',
            ...fontStyle(design.body, 400),
          }}
        >
          {formatarReais(precoOriginal)}
        </Text>
      )}
    </View>
  )
}
