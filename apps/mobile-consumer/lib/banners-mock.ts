/**
 * Banners hardcoded para o home enquanto não vêm do backend.
 * Quando vier de Supabase, é só trocar a fonte de dados em (tabs)/index.tsx.
 *
 * Spec: docs/system-design/consumer/04-componentes-dominio.md §7
 */
import type { Banner } from '@/components/BannerCarousel'

export const BANNERS_MOCK: Banner[] = [
  {
    id: 'frete-gratis',
    tom: 'primario',
    tag: 'Novidade',
    titulo: 'Frete grátis no primeiro pedido',
    subtitulo: 'Use o código BEMVINDO',
  },
  {
    id: 'novos-restaurantes',
    tom: 'destaque',
    tag: 'Novos',
    titulo: 'Novos restaurantes esta semana',
    subtitulo: 'Confira as novidades',
  },
  {
    id: 'pix',
    tom: 'sucesso',
    tag: 'Promoção',
    titulo: 'Pague com Pix e economize',
    subtitulo: 'Aceito em todas as lojas',
  },
]
