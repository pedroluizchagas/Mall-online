import { useEffect, useState } from 'react'
import { Alert, Image, Switch, Text, TouchableOpacity, View } from 'react-native'
import { useAuthStore } from '@/store/useAuthStore'
import { listarCategorias, type CamposProduto, type Categoria } from '@/lib/catalogo'
import { escolherImagem } from '@/lib/upload'
import { CampoTexto, Cartao, Chip, Legenda } from '@/components/Basicos'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'

// Formulário de produto (criar/editar) — campos idênticos ao schemaProduto
// do Dashboard (preço digitado em reais → convertido a centavos no submit,
// mesmo Math.round(parseFloat*100) do web).

export interface ValoresForm {
  nome: string
  descricao: string
  precoReais: string
  precoPromoReais: string
  categoryId: string | null
  disponivel: boolean
  trackStock: boolean
  stockQuantity: string
  stockMinimo: string
  fotoUri: string | null // nova foto local (null = manter atual)
}

export function valoresIniciais(): ValoresForm {
  return {
    nome: '',
    descricao: '',
    precoReais: '',
    precoPromoReais: '',
    categoryId: null,
    disponivel: true,
    trackStock: false,
    stockQuantity: '',
    stockMinimo: '',
    fotoUri: null,
  }
}

/** Converte o form para os campos do banco (centavos), como o web faz. */
export function paraCampos(v: ValoresForm): { campos?: CamposProduto; erro?: string } {
  const preco = Math.round(parseFloat(v.precoReais.replace(',', '.')) * 100)
  if (!Number.isFinite(preco) || preco < 1) return { erro: 'Preço deve ser maior que zero' }

  const promo = v.precoPromoReais.trim()
    ? Math.round(parseFloat(v.precoPromoReais.replace(',', '.')) * 100)
    : null
  if (promo !== null && !Number.isFinite(promo)) return { erro: 'Preço promocional inválido' }

  return {
    campos: {
      nome: v.nome.trim(),
      descricao: v.descricao.trim() || null,
      preco,
      preco_promocional: promo,
      category_id: v.categoryId,
      disponivel: v.disponivel,
      track_stock: v.trackStock,
      stock_quantity: v.trackStock && v.stockQuantity.trim() ? parseInt(v.stockQuantity, 10) : null,
      stock_minimo: v.trackStock && v.stockMinimo.trim() ? parseInt(v.stockMinimo, 10) : 0,
    },
  }
}

export function FormProduto({
  valores,
  aoMudar,
  fotoAtualUrl,
}: {
  valores: ValoresForm
  aoMudar: (v: ValoresForm) => void
  fotoAtualUrl?: string | null
}) {
  const { tenant } = useAuthStore()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const { colors, radius, spacing, typography } = partnerDesign

  useEffect(() => {
    if (tenant) void listarCategorias(tenant.id).then(setCategorias)
  }, [tenant?.id])

  function escolherFoto() {
    Alert.alert('Foto do produto', undefined, [
      { text: 'Tirar foto', onPress: () => void pegar('camera') },
      { text: 'Escolher da galeria', onPress: () => void pegar('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function pegar(origem: 'camera' | 'galeria') {
    const uri = await escolherImagem(origem)
    if (uri) aoMudar({ ...valores, fotoUri: uri })
  }

  const fotoExibida = valores.fotoUri ?? fotoAtualUrl ?? null

  return (
    <>
      {/* Foto */}
      <Legenda>Foto</Legenda>
      <TouchableOpacity onPress={escolherFoto} activeOpacity={0.8} style={{ marginBottom: spacing.lg }}>
        {fotoExibida ? (
          <Image
            source={{ uri: fotoExibida }}
            style={{ width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: 140,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <PartnerIcon name="camera" size={26} color={colors.inkSoft} />
            <Text style={{ color: colors.inkMuted, fontSize: typography.bodySm.size, fontWeight: '600' }}>
              Adicionar foto (câmera ou galeria)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dados */}
      <Legenda>Dados</Legenda>
      <Cartao>
        <CampoTexto rotulo="Nome" valor={valores.nome} aoMudar={(t) => aoMudar({ ...valores, nome: t })} placeholder="Ex.: Pão de queijo (12 un)" />
        <CampoTexto rotulo="Descrição" valor={valores.descricao} aoMudar={(t) => aoMudar({ ...valores, descricao: t })} multiline placeholder="Opcional" />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <CampoTexto rotulo="Preço (R$)" valor={valores.precoReais} aoMudar={(t) => aoMudar({ ...valores, precoReais: t })} teclado="decimal-pad" placeholder="0,00" />
          </View>
          <View style={{ flex: 1 }}>
            <CampoTexto rotulo="Promocional (R$)" valor={valores.precoPromoReais} aoMudar={(t) => aoMudar({ ...valores, precoPromoReais: t })} teclado="decimal-pad" placeholder="Opcional" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ flex: 1, color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: '600' }}>
            Disponível para venda
          </Text>
          <Switch
            value={valores.disponivel}
            onValueChange={(v) => aoMudar({ ...valores, disponivel: v })}
            trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
            thumbColor={colors.white}
          />
        </View>
      </Cartao>

      {/* Categoria */}
      <Legenda>Categoria</Legenda>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
        <Chip rotulo="Sem categoria" ativo={valores.categoryId === null} onPress={() => aoMudar({ ...valores, categoryId: null })} />
        {categorias.map((c) => (
          <Chip
            key={c.id}
            rotulo={`${c.icone ? `${c.icone} ` : ''}${c.nome}`}
            ativo={valores.categoryId === c.id}
            onPress={() => aoMudar({ ...valores, categoryId: c.id })}
          />
        ))}
      </View>

      {/* Estoque */}
      <Legenda>Estoque</Legenda>
      <Cartao>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
          <Text style={{ flex: 1, color: colors.ink, fontSize: typography.bodyLg.size, fontWeight: '600' }}>
            Controlar estoque
          </Text>
          <Switch
            value={valores.trackStock}
            onValueChange={(v) => aoMudar({ ...valores, trackStock: v })}
            trackColor={{ true: colors.accentStrong, false: colors.canvasAlt }}
            thumbColor={colors.white}
          />
        </View>
        {valores.trackStock && (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <CampoTexto rotulo="Quantidade" valor={valores.stockQuantity} aoMudar={(t) => aoMudar({ ...valores, stockQuantity: t })} teclado="numeric" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <CampoTexto rotulo="Alerta mínimo" valor={valores.stockMinimo} aoMudar={(t) => aoMudar({ ...valores, stockMinimo: t })} teclado="numeric" placeholder="0" />
            </View>
          </View>
        )}
      </Cartao>
    </>
  )
}
