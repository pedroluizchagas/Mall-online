import { View, Text, Image, TouchableOpacity } from 'react-native'
import { formatarReais } from '@mallevo/lib'
import { ConsumerIcon } from '@/components/ConsumerIcon'
import { consumerDesign } from '@/lib/consumer-design'
import { useStoreColors } from '@/lib/store-theme'

/**
 * Card de produto. 2 variantes:
 * - 'lista' (default): row, imagem 88x88 à direita, info à esquerda.
 * - 'grade': coluna, imagem topo, info abaixo.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §3
 */

const { radius } = consumerDesign

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
  const colors = useStoreColors()
  const precoFinal = produto.preco_promocional ?? produto.preco
  const temPromo = !!produto.preco_promocional

  if (variante === 'grade') {
    return (
      <TouchableOpacity
        onPress={aoTocar}
        activeOpacity={consumerDesign.opacity.pressedSoft}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <ImagemProduto url={produto.foto_url} altura={120} />
        <View style={{ padding: 12, gap: 4 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}
            numberOfLines={1}
          >
            {produto.nome}
          </Text>
          {produto.descricao && (
            <Text
              style={{ fontSize: 12, color: colors.inkMuted, fontWeight: '500' }}
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
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}
          numberOfLines={1}
        >
          {produto.nome}
        </Text>
        {produto.descricao && (
          <Text
            style={{ fontSize: 13, color: colors.inkMuted, fontWeight: '500' }}
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
  const colors = useStoreColors()
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: largura,
          height: altura,
          borderRadius: radius.md,
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
        borderRadius: radius.md,
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
  const colors = useStoreColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
        {formatarReais(preco)}
      </Text>
      {precoOriginal !== undefined && (
        <Text
          style={{
            fontSize: 13,
            color: colors.inkSoft,
            textDecorationLine: 'line-through',
          }}
        >
          {formatarReais(precoOriginal)}
        </Text>
      )}
    </View>
  )
}
