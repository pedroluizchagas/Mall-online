/**
 * Banners hardcoded para o home enquanto não vêm do backend.
 * Quando vier de Supabase, é só trocar a fonte de dados em (tabs)/index.tsx.
 *
 * Linguagem única do carrossel: toda peça leva FOTO + véu de cor pela
 * esquerda. A voz muda: institucionais vestem a paleta Mallevo (`tom`);
 * anúncios (`anuncio`) vestem a MARCA do parceiro — cor/acento são dado do
 * criativo (exceção documentada em 01-tokens §11), nunca UI do Mallevo.
 *
 * Fotos: Unsplash de ID fixo (padrão do dataset), TODAS conferidas
 * visualmente — o conteúdo de cada ID foi olhado antes de entrar, não só
 * validado por HTTP. Se trocar, olhe a imagem.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §7
 */
import type { Banner } from '@/components/BannerCarousel'

const foto = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&h=360&q=80&auto=format&fit=crop`

export const BANNERS_MOCK: Banner[] = [
  {
    // Evento-âncora: show com data marcada — a tag carrega a data, que é o
    // que vende ingresso.
    id: 'divino-beer-detonautas',
    tag: 'Show · 22 ago',
    titulo: 'Detonautas no Divino Beer',
    subtitulo: 'Rock e chopp artesanal em Divinópolis',
    foto: foto('1470229722913-7c0e2dbbafd3'), // palco aceso + plateia
    anuncio: {
      cor: '#170D05', // noite de palco, quente
      accent: '#FFB43A', // âmbar de cerveja
    },
  },
  {
    id: 'frete-gratis',
    tom: 'primario',
    tag: 'Novidade',
    titulo: 'Frete grátis no primeiro pedido',
    subtitulo: 'Use o código BEMVINDO',
    foto: foto('1526367790999-0150786686a2'), // entregador de bike, mochila térmica
  },
  {
    id: 'villefort-ofertas',
    tag: 'Ofertas da semana',
    titulo: 'Villefort Supermercado',
    subtitulo: 'Hortifrúti, açougue e mercearia em oferta',
    foto: foto('1542838132-92c53300491e'), // gôndola de hortifrúti
    anuncio: {
      cor: '#D6221C', // vermelho varejo
      accent: '#FFD84D', // amarelo oferta
    },
  },
  {
    id: 'novos-restaurantes',
    tom: 'destaque',
    tag: 'Novos',
    titulo: 'Novos restaurantes esta semana',
    subtitulo: 'Confira as novidades',
    foto: foto('1414235077428-338989a2e8c0'), // prato servido, taças à mesa
  },
  {
    // Industrial: esqueleto de aço + gruas — o amarelo das gruas ecoa o
    // laranja de segurança do acento.
    id: 'jalk-ferro-aco',
    tag: 'Para sua obra',
    titulo: 'Jalk Ferro e Aço',
    subtitulo: 'Vergalhão, telha e perfil — entrega rápida',
    foto: foto('1429497419816-9ca5cfb4571a'), // estrutura de aço + gruas
    anuncio: {
      cor: '#101214', // aço escuro
      accent: '#FF7A2F', // laranja industrial
    },
  },
  {
    id: 'pix',
    tom: 'sucesso',
    tag: 'Promoção',
    titulo: 'Pague com Pix e economize',
    subtitulo: 'Aceito em todas as lojas',
    foto: foto('1512428559087-560fa5ceab42'), // mão pagando no celular
  },
]
