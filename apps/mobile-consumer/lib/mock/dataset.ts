/**
 * Dataset de demonstração do shopping (Mallevo).
 *
 * Modela o mall em "pisos" temáticos — cada piso reúne lojas de uma
 * mesma vertical, exatamente na ordem em que o home (SECOES) renderiza
 * as seções. Preços sempre em centavos (igual ao schema real).
 *
 * Ativado por `EXPO_PUBLIC_USE_MOCK=true`. Não toca nenhuma tela: o
 * client mock (./client) responde às mesmas queries do Supabase.
 */

import { getArquetiposOferecidos } from '@mallevo/lib'
import { LOGO_VITRINE_FASHION } from './logos'

const TENANT = 'mock-tenant-0001'

export const MOCK_USER = {
  id: 'mock-user-0001',
  email: 'visitante@mallevo.app',
  phone: '',
  user_metadata: { nome: 'Visitante Mallevo' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-02T12:00:00.000Z',
}

export const MOCK_SESSION = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
}

export const MOCK_CONSUMER = {
  id: 'mock-consumer-0001',
  user_id: MOCK_USER.id,
  nome: 'Visitante Mallevo',
  telefone: '+5537999990000',
  foto_url: null as string | null,
  enderecos: [
    {
      apelido: 'Casa',
      rua: 'Rua dos Inconfidentes',
      numero: '450',
      complemento: 'Apto 302',
      bairro: 'Centro',
      cidade: 'Divinópolis',
      estado: 'MG',
      cep: '35500-000',
      latitude: -20.1389,
      longitude: -44.8839,
    },
  ],
}

const HORARIOS = {
  seg: { abre: '09:00', fecha: '22:00' },
  ter: { abre: '09:00', fecha: '22:00' },
  qua: { abre: '09:00', fecha: '22:00' },
  qui: { abre: '09:00', fecha: '22:00' },
  sex: { abre: '09:00', fecha: '23:00' },
  sab: { abre: '10:00', fecha: '23:00' },
  dom: { abre: '11:00', fecha: '20:00' },
}

interface StoreRow {
  id: string
  nome: string
  slug: string
  descricao: string
  logo_url: string
  banner_url: string
  taxa_entrega: number
  tempo_entrega: number
  telefone: string
  ativo: true
  aceita_dinheiro: boolean
  aceita_pix: boolean
  aceita_cartao_maquininha: boolean
  aceita_cartao_online: boolean
  horarios: typeof HORARIOS
  tenant_id: string
  piso: string
  // Embeds que algumas telas pedem (categoria:categories(slug) / categories(nome))
  categoria: { slug: string }
  categories: { nome: string }
  // Tema visual (StoreThemeConfig v2) — faz a loja "vestir" seu design no app.
  theme: { v: 2; preset: string }
}

interface ProductRow {
  id: string
  store_id: string
  nome: string
  descricao: string
  preco: number
  preco_promocional: number | null
  foto_url: string
  disponivel: true
  category_id: string
  ordem: number
  /** `galeria`: fotos extras do PDP imersivo (lojas-demo com foto real). */
  metadata: { galeria: string[] } | null
  // Embeds
  categories: { id: string; nome: string; ordem: number }
  stores: { slug: string; nome: string; ativo: true }
}

/** Foto determinística e estável (sempre resolve, sem chave de API). */
const foto = (seed: string, w = 600, h = 420) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

/** Foto real de moda (Unsplash, IDs fixos) em corte retrato 3:4. */
const fotoModa = (id: string, w = 600, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=80&auto=format&fit=crop`

/** [produto, precoCentavos, descricao, fotoUrl?] */
type ItemCatalogo = [string, number, string, string?]
type Catalogo = [string, ItemCatalogo[]][]

interface LojaSpec {
  nome: string
  slug: string
  descricao: string
  taxa: number
  tempo: number
  categoriaSlug: string
  /** Catálogo próprio (senão usa o do piso) — lojas-demo com conteúdo real. */
  catalogo?: Catalogo
  /** Banner próprio (senão usa foto de seed) — hero editorial das lojas-demo. */
  banner?: string
  /** Logo próprio (senão usa foto de seed) — PNG transparente p/ o splash. */
  logo?: string
}

interface PisoSpec {
  piso: string
  secaoSlug: string
  catalogo: Catalogo
  lojas: LojaSpec[]
}

// ─────────────────────────────────────────────────────────────
// Pisos do shopping — a ordem casa com SECOES em (tabs)/index.tsx
// ─────────────────────────────────────────────────────────────

const PISOS: PisoSpec[] = [
  {
    piso: 'Piso Térreo',
    secaoSlug: 'alimentacao',
    catalogo: [
      [
        'Destaques da casa',
        [
          ['Combo do chef', 3990, 'Prato principal + acompanhamento + bebida'],
          ['Porção especial', 4590, 'Serve 2 pessoas, do jeito da casa'],
          ['Prato executivo', 2890, 'Opção do dia, fresco e generoso'],
          ['Sobremesa artesanal', 1690, 'Feita na hora, receita da casa'],
        ],
      ],
      [
        'Bebidas',
        [
          ['Suco natural 500ml', 1290, 'Fruta da estação, sem açúcar'],
          ['Refrigerante lata', 690, 'Gelado, 350ml'],
          ['Água com gás', 590, 'Garrafa 500ml'],
        ],
      ],
    ],
    lojas: [
      { nome: 'Sabor Mineiro', slug: 'sabor-mineiro', descricao: 'Comida mineira de raiz, no fogão de lenha. Tradição de Divinópolis.', taxa: 0, tempo: 35, categoriaSlug: 'restaurante' },
      { nome: 'Burger House DV', slug: 'burger-house', descricao: 'Smash burgers artesanais e batatas rústicas. Direto da chapa.', taxa: 590, tempo: 30, categoriaSlug: 'lanches' },
      { nome: 'Cantina Bella Itália', slug: 'cantina-bella-italia', descricao: 'Massas frescas e pizzas em forno a lenha. Sapore italiano.', taxa: 690, tempo: 45, categoriaSlug: 'restaurante' },
      { nome: 'Sushi Yamato', slug: 'sushi-yamato', descricao: 'Combinados frescos e temaki. Culinária japonesa premium.', taxa: 890, tempo: 50, categoriaSlug: 'japonesa' },
      { nome: 'Café Aroma', slug: 'cafe-aroma', descricao: 'Cafés especiais, bolos caseiros e brunch o dia todo.', taxa: 0, tempo: 25, categoriaSlug: 'cafeteria' },
      { nome: 'Açaí da Praça', slug: 'acai-da-praca', descricao: 'Açaí cremoso na tigela com toppings à vontade.', taxa: 390, tempo: 20, categoriaSlug: 'sobremesas' },
    ],
  },
  {
    piso: 'Piso Térreo',
    secaoSlug: 'essenciais',
    catalogo: [
      [
        'Mais vendidos',
        [
          ['Item essencial', 1290, 'O básico que não pode faltar em casa'],
          ['Pack econômico', 2490, 'Leve mais, pague menos'],
          ['Marca premium', 1890, 'Qualidade superior selecionada'],
          ['Linha tradicional', 990, 'Confiança de sempre'],
        ],
      ],
      [
        'Ofertas da semana',
        [
          ['Promoção relâmpago', 790, 'Enquanto durar o estoque'],
          ['Combo família', 3290, 'Rende para a semana toda'],
          ['Desconto progressivo', 1490, 'Quanto mais leva, mais economiza'],
        ],
      ],
    ],
    lojas: [
      { nome: 'Mercado Central DV', slug: 'mercado-central', descricao: 'Hortifruti, mercearia e açougue. Tudo num lugar só.', taxa: 0, tempo: 40, categoriaSlug: 'mercado' },
      { nome: 'Farmácia Saúde+', slug: 'farmacia-saude-mais', descricao: 'Medicamentos, higiene e dermocosméticos. Entrega rápida.', taxa: 0, tempo: 25, categoriaSlug: 'farmacia' },
      { nome: 'Adega Premium', slug: 'adega-premium', descricao: 'Vinhos, destilados e cervejas especiais selecionados.', taxa: 690, tempo: 35, categoriaSlug: 'bebidas' },
      { nome: 'Hortifruti Viçoso', slug: 'hortifruti-vicoso', descricao: 'Frutas, legumes e verduras fresquinhos todo dia.', taxa: 390, tempo: 30, categoriaSlug: 'mercado' },
      { nome: 'Padaria Pão Quente', slug: 'padaria-pao-quente', descricao: 'Pães, bolos e salgados saindo do forno a toda hora.', taxa: 0, tempo: 20, categoriaSlug: 'padaria' },
      { nome: 'Empório Natural', slug: 'emporio-natural', descricao: 'Produtos naturais, granéis e orgânicos.', taxa: 590, tempo: 35, categoriaSlug: 'mercado' },
    ],
  },
  {
    piso: 'Piso 1',
    secaoSlug: 'moda-beleza',
    catalogo: [
      [
        'Novidades',
        [
          ['Lançamento da coleção', 18990, 'Acabou de chegar na vitrine'],
          ['Peça statement', 24990, 'Para sair do básico com estilo'],
          ['Best-seller', 12990, 'O queridinho que todo mundo quer'],
          ['Edição limitada', 29990, 'Poucas unidades disponíveis'],
        ],
      ],
      [
        'Promoções',
        [
          ['Oferta da estação', 7990, 'Desconto especial por tempo limitado'],
          ['Combo look completo', 19990, 'Monte o visual e economize'],
          ['Última peça', 5990, 'Queima de estoque'],
        ],
      ],
    ],
    lojas: [
      {
        nome: 'Vitrine Fashion',
        slug: 'vitrine-fashion',
        descricao: 'Moda feminina com curadoria editorial — vestidos, alfaiataria e acessórios da estação.',
        taxa: 0,
        tempo: 45,
        categoriaSlug: 'moda',
        // Loja-demo da vitrine editorial (arquétipo `editorial`, ver
        // components/loja/LojaEditorial.tsx): catálogo feminino com fotos reais.
        logo: LOGO_VITRINE_FASHION,
        banner: fotoModa('1524504388940-b1c1722653e1', 900, 1200),
        catalogo: [
          [
            'Coleção nova',
            [
              ['Vestido Brisa off-white', 18990, 'Ombro a ombro, tecido leve com babados', fotoModa('1515372039744-b8f02a3ae446')],
              ['Vestido Maré azul-céu', 24990, 'Maxi fluido com fenda e decote V', fotoModa('1539008835657-9e8e9680c956')],
              ['Macacão Esmeralda', 27990, 'Alfaiataria acetinada de gola halter', fotoModa('1495385794356-15371f348c31')],
              ['Vestido Renda violeta', 32990, 'Renda com recortes, comprimento midi', fotoModa('1551803091-e20673f15770')],
              ['Vestido Rosé Chapeau', 21990, 'Maxi de viscose com amarração na cintura', fotoModa('1596783074918-c84cb06531ca')],
              ['Poncho Tricô cru', 15990, 'Tricô artesanal com franjas', fotoModa('1434389677669-e08b4cac3105')],
            ],
          ],
          [
            'Tendências',
            [
              ['Bolsa Coral estruturada', 19990, 'Couro com fecho metálico', fotoModa('1584917865442-de89df76afd3')],
              ['Conjunto Navy cropped', 16990, 'Camisa de amarração + pantalona', fotoModa('1562572159-4efc207f5aff')],
              ['Pantalona Riscas', 14990, 'Listras verticais, cintura alta', fotoModa('1509631179647-0177331693ae')],
              ['Casaco Vinho de inverno', 29990, 'Lã batida com gola alta', fotoModa('1483985988355-763728e1935b')],
              ['Jaqueta Street noir', 17990, 'Sobreposição oversized', fotoModa('1529139574466-a303027c1d8b')],
              ['Top Verão esmeralda', 8990, 'Tricô texturizado de alças', fotoModa('1469334031218-e382a71b716b')],
            ],
          ],
        ],
      },
      { nome: 'Passo Certo Calçados', slug: 'passo-certo-calcados', descricao: 'Tênis, sapatos e sandálias das melhores marcas.', taxa: 690, tempo: 50, categoriaSlug: 'calcados' },
      { nome: 'Bella Cosméticos', slug: 'bella-cosmeticos', descricao: 'Maquiagem, skincare e perfumaria importada.', taxa: 0, tempo: 35, categoriaSlug: 'beleza' },
      { nome: 'Urban Wear', slug: 'urban-wear', descricao: 'Streetwear, sneakers e acessórios urbanos.', taxa: 790, tempo: 45, categoriaSlug: 'moda' },
      { nome: 'Joalheria Lux', slug: 'joalheria-lux', descricao: 'Joias, relógios e semijoias com garantia.', taxa: 0, tempo: 60, categoriaSlug: 'acessorios' },
      { nome: 'Ótica Visão Clara', slug: 'otica-visao-clara', descricao: 'Óculos de grau e solares das principais grifes.', taxa: 590, tempo: 55, categoriaSlug: 'acessorios' },
    ],
  },
  {
    piso: 'Piso 2',
    secaoSlug: 'tecnologia',
    catalogo: [
      [
        'Lançamentos',
        [
          ['Smartphone última geração', 289900, '128GB, câmera tripla, tela AMOLED'],
          ['Notebook ultrafino', 419900, 'SSD 512GB, leve e potente'],
          ['Console de games', 379900, 'Pronto para a próxima geração'],
          ['Smartwatch fitness', 89900, 'GPS, monitor cardíaco e bateria longa'],
        ],
      ],
      [
        'Acessórios',
        [
          ['Fone bluetooth', 24990, 'Cancelamento de ruído ativo'],
          ['Carregador turbo', 8990, 'Carga rápida 65W'],
          ['Capa protetora', 4990, 'Antichoque e antiqueda'],
        ],
      ],
    ],
    lojas: [
      { nome: 'TechPoint', slug: 'techpoint', descricao: 'Smartphones, tablets e gadgets com garantia oficial.', taxa: 0, tempo: 55, categoriaSlug: 'eletronicos' },
      { nome: 'GameZone', slug: 'gamezone', descricao: 'Consoles, jogos e periféricos gamer.', taxa: 690, tempo: 50, categoriaSlug: 'games' },
      { nome: 'InfoStore DV', slug: 'infostore-dv', descricao: 'Notebooks, PCs e componentes de informática.', taxa: 0, tempo: 60, categoriaSlug: 'informatica' },
      { nome: 'Som & Imagem', slug: 'som-imagem', descricao: 'TVs, soundbars e áudio de alta fidelidade.', taxa: 990, tempo: 70, categoriaSlug: 'eletronicos' },
      { nome: 'iFix Assistência', slug: 'ifix-assistencia', descricao: 'Conserto de celulares e venda de peças originais.', taxa: 0, tempo: 45, categoriaSlug: 'servicos' },
      { nome: 'Mobile Acessórios', slug: 'mobile-acessorios', descricao: 'Capas, películas e carregadores para todo modelo.', taxa: 390, tempo: 35, categoriaSlug: 'acessorios' },
    ],
  },
  {
    piso: 'Piso 3',
    secaoSlug: 'casa-vida',
    catalogo: [
      [
        'Para a casa',
        [
          ['Item de decoração', 7990, 'Dá um toque novo no ambiente'],
          ['Utensílio essencial', 3490, 'Praticidade no dia a dia'],
          ['Kit organização', 5990, 'Para deixar tudo no lugar'],
          ['Peça de destaque', 12990, 'O charme que faltava na casa'],
        ],
      ],
      [
        'Ofertas',
        [
          ['Promoção da semana', 2490, 'Aproveite enquanto dura'],
          ['Combo prático', 8990, 'Conjunto com desconto'],
          ['Liquidação', 1990, 'Últimas unidades'],
        ],
      ],
    ],
    lojas: [
      { nome: 'Casa & Conforto', slug: 'casa-conforto', descricao: 'Cama, mesa, banho e decoração para o seu lar.', taxa: 0, tempo: 60, categoriaSlug: 'casa' },
      { nome: 'Mundo Pet', slug: 'mundo-pet', descricao: 'Ração, acessórios e petiscos para cães e gatos.', taxa: 0, tempo: 40, categoriaSlug: 'petshop' },
      { nome: 'Papelaria Criativa', slug: 'papelaria-criativa', descricao: 'Material escolar, escritório e papelaria fina.', taxa: 490, tempo: 35, categoriaSlug: 'papelaria' },
      { nome: 'Jardim & Flor', slug: 'jardim-flor', descricao: 'Plantas, vasos e arranjos para todos os ambientes.', taxa: 690, tempo: 50, categoriaSlug: 'casa' },
      { nome: 'Utilidades Lar', slug: 'utilidades-lar', descricao: 'Tudo para a cozinha e organização da casa.', taxa: 390, tempo: 45, categoriaSlug: 'casa' },
      { nome: 'Livraria Saber', slug: 'livraria-saber', descricao: 'Livros, mangás e jogos de tabuleiro.', taxa: 0, tempo: 55, categoriaSlug: 'livraria' },
    ],
  },
]

// Chave semântica do spec → categoria canônica (slug do template
// real em packages/lib/templates/mapping.ts) + rótulo amigável.
// Mantém os slugs alinhados ao backend e evita o warning de
// "slug de categoria não mapeado".
const CATEGORIA_CANON: Record<string, { slug: string; nome: string }> = {
  restaurante: { slug: 'alimentos-bebidas', nome: 'Restaurante' },
  lanches: { slug: 'alimentos-bebidas', nome: 'Lanches' },
  japonesa: { slug: 'alimentos-bebidas', nome: 'Japonesa' },
  cafeteria: { slug: 'alimentos-bebidas', nome: 'Cafeteria' },
  sobremesas: { slug: 'alimentos-bebidas', nome: 'Sobremesas' },
  mercado: { slug: 'mercado-conveniencia', nome: 'Mercado' },
  farmacia: { slug: 'farmacia-medicamentos', nome: 'Farmácia' },
  bebidas: { slug: 'alimentos-bebidas', nome: 'Bebidas' },
  padaria: { slug: 'alimentos-bebidas', nome: 'Padaria' },
  moda: { slug: 'vestuario-calcados', nome: 'Moda' },
  calcados: { slug: 'vestuario-calcados', nome: 'Calçados' },
  beleza: { slug: 'beleza-cosmeticos', nome: 'Beleza' },
  acessorios: { slug: 'acessorios-joias', nome: 'Acessórios' },
  eletronicos: { slug: 'eletronicos-tecnologia', nome: 'Eletrônicos' },
  games: { slug: 'eletronicos-tecnologia', nome: 'Games' },
  informatica: { slug: 'eletronicos-tecnologia', nome: 'Informática' },
  servicos: { slug: 'oficinas-manutencao', nome: 'Assistência' },
  casa: { slug: 'casa-decoracao', nome: 'Casa & Decoração' },
  petshop: { slug: 'pet-shop', nome: 'Pet Shop' },
  papelaria: { slug: 'papelaria-livraria', nome: 'Papelaria' },
  livraria: { slug: 'papelaria-livraria', nome: 'Livraria' },
}

// ─────────────────────────────────────────────────────────────
// Materialização das tabelas
// ─────────────────────────────────────────────────────────────

const stores: StoreRow[] = []
const products: ProductRow[] = []

PISOS.forEach((piso, pisoIdx) => {
  piso.lojas.forEach((loja, lojaIdx) => {
    const storeId = `store-${pisoIdx + 1}-${lojaIdx + 1}`
    const aceitaOnline = lojaIdx % 3 !== 0
    const cat = CATEGORIA_CANON[loja.categoriaSlug] ?? {
      slug: 'outros',
      nome: 'Loja',
    }

    // Pele da loja: cicla entre os arquétipos oferecidos para a categoria
    // (default + alternativas) → demo com variedade coerente por nicho.
    const oferecidos = getArquetiposOferecidos(cat.slug).map((a) => a.codigo)
    const preset = oferecidos[lojaIdx % oferecidos.length] ?? 'editorial'

    stores.push({
      id: storeId,
      nome: loja.nome,
      slug: loja.slug,
      descricao: loja.descricao,
      logo_url: loja.logo ?? foto(`${loja.slug}-logo`, 600, 400),
      banner_url: loja.banner ?? foto(`${loja.slug}-banner`, 1000, 480),
      taxa_entrega: loja.taxa,
      tempo_entrega: loja.tempo,
      telefone: `+55379${String(80000000 + pisoIdx * 1000 + lojaIdx)}`,
      ativo: true,
      aceita_dinheiro: true,
      aceita_pix: true,
      aceita_cartao_maquininha: true,
      aceita_cartao_online: aceitaOnline,
      horarios: HORARIOS,
      tenant_id: TENANT,
      piso: piso.piso,
      categoria: { slug: cat.slug },
      categories: { nome: cat.nome },
      theme: { v: 2, preset },
    })

    const catalogo = loja.catalogo ?? piso.catalogo
    catalogo.forEach(([catNome, itens], catIdx) => {
      const categoryId = `${storeId}-cat-${catIdx + 1}`
      itens.forEach(([nome, preco, descricao, fotoUrl], prodIdx) => {
        // ~1 em cada 4 produtos entra em promoção (−18%)
        const ehPromo = (lojaIdx + prodIdx) % 4 === 0
        const ordem = catIdx * 100 + prodIdx
        const id = `${storeId}-p-${catIdx + 1}-${prodIdx + 1}`
        // Fotos reais (Unsplash) ganham galeria p/ o PDP imersivo: o mesmo
        // look em corte 9:16 de corpo inteiro + um segundo enquadramento.
        const galeria = fotoUrl?.includes('images.unsplash.com')
          ? [
              fotoUrl.replace('h=800', 'h=1600'),
              `${fotoUrl.replace('h=800', 'h=1600')}&crop=entropy`,
            ]
          : null
        products.push({
          id,
          store_id: storeId,
          nome,
          descricao,
          preco,
          preco_promocional: ehPromo ? Math.round(preco * 0.82) : null,
          foto_url: fotoUrl ?? foto(`${loja.slug}-${catIdx}-${prodIdx}`, 400, 400),
          disponivel: true,
          category_id: categoryId,
          ordem,
          metadata: galeria ? { galeria } : null,
          categories: { id: categoryId, nome: catNome, ordem: catIdx },
          stores: { slug: loja.slug, nome: loja.nome, ativo: true },
        })
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────
// Entregador + localização (rastreio do pedido ativo)
// ─────────────────────────────────────────────────────────────

const COURIER = {
  id: 'mock-courier-0001',
  nome: 'Carlos Entregador',
  telefone: '+5537998887766',
}

// Sem localização semeada de propósito: o mapa do entregador usa
// `react-native-maps`, que não tem módulo nativo no Expo Go (SDK 54) e
// derruba a tela de acompanhamento. Sem localização, `exibirMapa` fica
// falso e o pedido ativo continua rico (card do entregador, timeline,
// itens) sem montar o mapa. Para ver o mapa, use um development build.
const courier_locations: { courier_id: string; latitude: number; longitude: number }[] = []

// ─────────────────────────────────────────────────────────────
// Pedidos — 1 ativo (a caminho) + 2 históricos
// ─────────────────────────────────────────────────────────────

const agora = Date.now()
const iso = (msAtras: number) => new Date(agora - msAtras).toISOString()

function itemPedido(p: ProductRow, qtd: number) {
  const preco = p.preco_promocional ?? p.preco
  return {
    id: `oi-${p.id}`,
    nome: p.nome,
    quantidade: qtd,
    preco_unit: preco,
    subtotal: preco * qtd,
    observacoes: null,
    modifiers: null,
    variant_id: null,
    product_variants: null,
  }
}

const lojaAtiva = stores[1] // Burger House DV
const itensAtivo = products.filter((p) => p.store_id === lojaAtiva.id).slice(0, 2)
const subtotalAtivo = itensAtivo.reduce(
  (s, p) => s + (p.preco_promocional ?? p.preco) * 1,
  0
)

const lojaHist1 = stores[0] // Sabor Mineiro
const itensHist1 = products.filter((p) => p.store_id === lojaHist1.id).slice(0, 3)
const subHist1 = itensHist1.reduce(
  (s, p) => s + (p.preco_promocional ?? p.preco),
  0
)

const lojaHist2 = stores[12] // Vitrine Fashion
const itensHist2 = products.filter((p) => p.store_id === lojaHist2.id).slice(0, 1)
const subHist2 = itensHist2.reduce(
  (s, p) => s + (p.preco_promocional ?? p.preco),
  0
)

const orders = [
  {
    id: 'order-ativo-0001',
    consumer_id: MOCK_CONSUMER.id,
    store_id: lojaAtiva.id,
    tenant_id: TENANT,
    status: 'saiu_para_entrega',
    payment_status: 'pago',
    forma_pagamento: 'online_pix',
    subtotal: subtotalAtivo,
    taxa_entrega: lojaAtiva.taxa_entrega,
    total: subtotalAtivo + lojaAtiva.taxa_entrega,
    criado_em: iso(25 * 60 * 1000),
    endereco_entrega: MOCK_CONSUMER.enderecos[0],
    observacoes: 'Sem cebola, por favor.',
    motivo_cancelamento: null,
    tipo: 'entrega',
    agendamento_inicio_at: null,
    agendamento_fim_at: null,
    staff_id: null,
    service_staff: null,
    pagarme_qr_code: null,
    pagarme_qr_code_url: null,
    pagarme_qr_code_expires_at: null,
    order_items: itensAtivo.map((p) => itemPedido(p, 1)),
    delivery_assignments: [
      {
        id: 'da-0001',
        status: 'a_caminho',
        courier_id: COURIER.id,
        couriers: COURIER,
      },
    ],
    stores: {
      id: lojaAtiva.id,
      nome: lojaAtiva.nome,
      telefone: lojaAtiva.telefone,
      slug: lojaAtiva.slug,
    },
  },
  {
    id: 'order-hist-0001',
    consumer_id: MOCK_CONSUMER.id,
    store_id: lojaHist1.id,
    tenant_id: TENANT,
    status: 'entregue',
    payment_status: 'pago',
    forma_pagamento: 'dinheiro',
    subtotal: subHist1,
    taxa_entrega: lojaHist1.taxa_entrega,
    total: subHist1 + lojaHist1.taxa_entrega,
    criado_em: iso(3 * 24 * 60 * 60 * 1000),
    endereco_entrega: MOCK_CONSUMER.enderecos[0],
    observacoes: null,
    motivo_cancelamento: null,
    tipo: 'entrega',
    agendamento_inicio_at: null,
    agendamento_fim_at: null,
    staff_id: null,
    service_staff: null,
    pagarme_qr_code: null,
    pagarme_qr_code_url: null,
    pagarme_qr_code_expires_at: null,
    order_items: itensHist1.map((p) => itemPedido(p, 1)),
    delivery_assignments: [],
    stores: {
      id: lojaHist1.id,
      nome: lojaHist1.nome,
      telefone: lojaHist1.telefone,
      slug: lojaHist1.slug,
    },
  },
  {
    id: 'order-hist-0002',
    consumer_id: MOCK_CONSUMER.id,
    store_id: lojaHist2.id,
    tenant_id: TENANT,
    status: 'cancelado',
    payment_status: 'estornado',
    forma_pagamento: 'online_cartao',
    subtotal: subHist2,
    taxa_entrega: lojaHist2.taxa_entrega,
    total: subHist2 + lojaHist2.taxa_entrega,
    criado_em: iso(9 * 24 * 60 * 60 * 1000),
    endereco_entrega: MOCK_CONSUMER.enderecos[0],
    observacoes: null,
    motivo_cancelamento: 'Loja sem o produto em estoque.',
    tipo: 'entrega',
    agendamento_inicio_at: null,
    agendamento_fim_at: null,
    staff_id: null,
    service_staff: null,
    pagarme_qr_code: null,
    pagarme_qr_code_url: null,
    pagarme_qr_code_expires_at: null,
    order_items: itensHist2.map((p) => itemPedido(p, 1)),
    delivery_assignments: [],
    stores: {
      id: lojaHist2.id,
      nome: lojaHist2.nome,
      telefone: lojaHist2.telefone,
      slug: lojaHist2.slug,
    },
  },
]

export interface MockDB {
  stores: StoreRow[]
  products: ProductRow[]
  consumers: (typeof MOCK_CONSUMER)[]
  orders: typeof orders
  order_items: any[]
  push_tokens: any[]
  courier_locations: typeof courier_locations
}

/** Estado em memória — reiniciado a cada boot do app. */
export function criarDB(): MockDB {
  return {
    stores,
    products,
    consumers: [MOCK_CONSUMER],
    orders: JSON.parse(JSON.stringify(orders)),
    order_items: [],
    push_tokens: [],
    courier_locations,
  }
}
