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
import { EXPLORE_FEED, type ExploreFeedRow } from './feed'
import {
  LOGO_ACAI,
  LOGO_ARENA_FIT,
  LOGO_LOJAO,
  LOGO_BELLA,
  LOGO_BURGER_HOUSE,
  LOGO_CAFE_AROMA,
  LOGO_CANTINA,
  LOGO_CASA_CONFORTO,
  LOGO_FARMACIA,
  LOGO_ROXA,
  LOGO_URBAN_WEAR,
  LOGO_VITRINE_FASHION,
} from './logos'

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
  theme: { v: 2; preset: string; palette?: string }
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
  /**
   * `galeria`: fotos extras do PDP imersivo; `especificacoes`: ficha técnica
   * do PDP artesão; `exige_receita`: selo/aviso da vitrine clínica (mesmo
   * contrato lido pelo ModalProduto); `duracao_min`: minutos do slot no PDP
   * de agendamento (template `services`), derivado da 1ª especificação.
   */
  metadata: {
    galeria?: string[]
    especificacoes?: [string, string][]
    exige_receita?: boolean
    duracao_min?: number
  } | null
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

/** [produto, precoCentavos, descricao, fotoUrl?, especificacoes?, exigeReceita?] */
type ItemCatalogo = [string, number, string, string?, [string, string][]?, boolean?]
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
  /** Arquétipo fixo (senão cicla entre os oferecidos da categoria). */
  preset?: string
  /** Paleta curada do arquétipo (palettes.ts) — lojas-demo com pele exata. */
  palette?: string
}

interface PisoSpec {
  piso: string
  secaoSlug: string
  catalogo: Catalogo
  lojas: LojaSpec[]
}

// ─────────────────────────────────────────────────────────────
// Pisos do shopping — os 9 pisos canônicos de packages/lib/pisos.ts
// ─────────────────────────────────────────────────────────────

// Cada loja aparece uma única vez, no piso canônico da sua categoria
// (primeira correspondência por ordem). `piso` é organizacional: nenhuma
// tela lê o campo — quem agrupa o home é a categoria da loja.
const PISOS: PisoSpec[] = [
  {
    piso: 'Praça de Alimentação',
    secaoSlug: 'praca-alimentacao',
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
      // Presets explícitos: o tom de cada casa manda na pele (a rotação
      // automática criava dissonâncias — ex.: hamburgueria em fine-dining).
      { nome: 'Sabor Mineiro', slug: 'sabor-mineiro', descricao: 'Comida mineira de raiz, no fogão de lenha. Tradição de Divinópolis.', taxa: 0, tempo: 35, categoriaSlug: 'restaurante', preset: 'heritage' },
      {
        nome: 'Burger House DV',
        slug: 'burger-house',
        descricao: 'Smash burgers artesanais e batatas rústicas. Direto da chapa.',
        taxa: 590,
        tempo: 30,
        categoriaSlug: 'lanches',
        // Loja-demo da vitrine smash (Stack N Snack): bordô + laranja, folha
        // creme de cardápio — o arquétipo desenhado pra hamburgueria.
        preset: 'smash',
        logo: LOGO_BURGER_HOUSE,
        banner: fotoModa('1571091718767-18b5b1457add', 900, 1200),
        catalogo: [
          [
            'Burgers',
            [
              ['Duplo Smash da Casa', 3290, 'Dois smash na chapa, cheddar derretido, picles e molho da casa no brioche', fotoModa('1568901346375-23c9450c58cd')],
              ['Crispy Chicken', 2990, 'Frango empanado no buttermilk, coleslaw crocante e maionese de chipotle', fotoModa('1606755962773-d324e0a13086')],
              ['Cheddar Bacon', 3490, 'Burger 160g, muito cheddar, bacon caramelizado e cebola crispy', fotoModa('1553979459-d2229ba7433b')],
              ['Clássico da Chapa', 2690, 'Burger 160g, queijo prato, alface americana, tomate e maionese verde', fotoModa('1550547660-d9450f859349')],
              ['Veggie da Praça', 2890, 'Burger de grão-de-bico crocante, queijo vegetal e maionese defumada', fotoModa('1551782450-a2132b4ba21d')],
            ],
          ],
          [
            'Combos',
            [
              // Descrições em "item + item" viram a lista em bullets dos
              // cards de oferta da vitrine smash (LojaSmash.tsx).
              ['Combo Smash Solo', 4290, 'Duplo Smash da Casa + fritas médias + refri lata', fotoModa('1610614819513-58e34989848b')],
              ['Combo Crispy', 4190, 'Crispy Chicken + fritas médias + refri lata', fotoModa('1607013251379-e6eecfffe234')],
              ['Combo Casal', 6990, 'Dois burgers da casa + fritas grandes + dois refris', fotoModa('1561758033-d89a9ad46330')],
              ['Combo Festa da Casa', 8990, 'Duplo Smash + Crispy Chicken + fritas grandes + nuggets 10un + dois refris', fotoModa('1571091718767-18b5b1457add')],
            ],
          ],
          [
            'Acompanhamentos',
            [
              ['Fritas Rústicas', 1490, 'Batatas na casca com alecrim e maionese da casa', fotoModa('1573080496219-bb080dd4f877')],
              ['Fritas Cheddar & Bacon', 1890, 'Cheddar cremoso por cima e bacon em cubos', fotoModa('1585109649139-366815a0d713')],
              ['Nuggets da Casa 10un', 1690, 'Frango crocante com dois molhos pra mergulhar', fotoModa('1541592106381-b31e9677c0e5')],
            ],
          ],
          [
            'Bebidas',
            [
              ['Milkshake de Chocolate', 1790, 'Cremoso, com calda 70% e chantilly', fotoModa('1572490122747-3968b75cc699')],
              ['Milkshake de Morango', 1790, 'Morangos batidos na hora com chantilly', fotoModa('1576107232684-1279f390859f')],
              ['Refri no Copo 400ml', 690, 'Gelado, com muito gelo — clássico do balcão', fotoModa('1547584370-2cc98b8b8dc8')],
            ],
          ],
        ],
      },
      {
        nome: 'Cantina Bella Itália',
        slug: 'cantina-bella-italia',
        descricao: 'Onde a massa fresca encontra a arte silenciosa do forno a lenha.',
        taxa: 690,
        tempo: 45,
        categoriaSlug: 'restaurante',
        // Loja-demo da vitrine noir gastronômica (The Obscura): fine dining
        // em preto, marfim e dourado (ver LojaNoir.tsx).
        preset: 'noir',
        logo: LOGO_CANTINA,
        banner: fotoModa('1514933651103-005eec06c04b', 900, 1200),
        catalogo: [
          [
            'Do forno',
            [
              ['Margherita di Bufala', 6890, 'San Marzano · muçarela de búfala · basílico', fotoModa('1574071318508-1cdbab80d002')],
              ['Diavola Calabra', 7490, 'Calabresa artesanal · nduja · mel picante', fotoModa('1481931098730-318b6f776db0')],
              ['Burrata della Casa', 5890, 'Burrata cremosa · tomate confit · pão de fermentação', fotoModa('1529042410759-befb1204b468')],
            ],
          ],
          [
            'Massas di casa',
            [
              ['Tagliatelle della Nonna', 9890, 'Massa fresca · ragù de 8 horas · grana padano', fotoModa('1473093295043-cdd812d0e601')],
              ['Farfalle al Pesto', 7890, 'Pesto genovês · tomate-cereja · pinoli tostado', fotoModa('1414235077428-338989a2e8c0')],
              ['Polpette al Ragù', 8490, 'Almôndegas de costela · rúcula · pecorino', fotoModa('1550966871-3ed3cdb5ed0c')],
            ],
          ],
          [
            'Dolci & Bar',
            [
              ['Tiramisù della Nonna', 3890, 'Mascarpone · café ristretto · cacau amargo', fotoModa('1571877227200-a0d98ea607e9')],
              ['Panna Cotta ai Frutti', 3490, 'Baunilha de fava · morangos macerados', fotoModa('1488477181946-6428a0291777')],
              ['Negroni Antico', 4290, 'Gin · vermute rosso · bitter de laranja', fotoModa('1470337458703-46ad1756a187')],
            ],
          ],
        ],
      },
      {
        nome: 'Sushi Yamato',
        slug: 'sushi-yamato',
        descricao: 'O balcão silencioso — peixe do dia, arroz no ponto e a calma do mestre.',
        taxa: 890,
        tempo: 50,
        categoriaSlug: 'japonesa',
        // Omakase premium: noir na paleta prata (preto + aço) + cardápio real.
        preset: 'noir',
        palette: 'prata',
        banner: fotoModa('1552566626-52f8b828add9', 900, 1200),
        catalogo: [
          [
            'Do balcão',
            [
              ['Omakase Nigiri', 12890, 'Seleção do mestre · 12 peças · peixe do dia', fotoModa('1617196034796-73dfa7b1fd56')],
              ['Uramaki Salmão', 5890, 'Salmão maçaricado · cream cheese · teriyaki', fotoModa('1579871494447-9811cf80d66c')],
              ['Barco Yamato', 18990, 'Combinado da casa · 42 peças · para dividir', fotoModa('1553621042-f6e147245754')],
              ['Festival da Casa', 9890, 'Hossomaki · uramaki · niguiri variados', fotoModa('1611143669185-af224c5e3252')],
            ],
          ],
        ],
      },
      {
        nome: 'Café Aroma',
        slug: 'cafe-aroma',
        descricao: 'Sempre fresco, sempre na hora — grãos de especialidade torrados na casa.',
        taxa: 0,
        tempo: 25,
        categoriaSlug: 'cafeteria',
        // Loja-demo da vitrine torra (Kafoska): pôster verde + âmbar.
        preset: 'roast',
        logo: LOGO_CAFE_AROMA,
        banner: fotoModa('1501339847302-ac426a4a7cbb', 900, 1200),
        catalogo: [
          [
            'Cafés',
            [
              ['Cold Brew Tônica', 1690, 'Extração a frio · tônica · laranja bruleé', fotoModa('1517701550927-30cf4ba1dba5')],
              ['Latte da Casa', 1490, 'Espresso duplo · leite vaporizado · arte', fotoModa('1541167760496-1628856ab772')],
              ['Cappuccino Trio', 1590, 'Espresso · leite cremoso · toque de cacau', fotoModa('1509042239860-f550ce710b93')],
              ['Coado da Torra', 990, 'Método V60 · grãos da semana', fotoModa('1514432324607-a09d9b4aefdd')],
              ['Café Gelado Clássico', 1290, 'Espresso · gelo · calda da casa', fotoModa('1461023058943-07fcbe16d735')],
            ],
          ],
          [
            'Doces & fatias',
            [
              ['Croissant Amanteigado', 1190, 'Folhado na manteiga francesa', fotoModa('1555507036-ab1f4038808a')],
              ['Bolo Trufado', 1490, 'Fatia generosa · ganache 70%', fotoModa('1578985545062-69928b1d9587')],
              ['Cookie Tostado', 890, 'Gotas de chocolate · flor de sal', fotoModa('1499636136210-6f4ee915583e')],
            ],
          ],
        ],
      },
      {
        nome: 'Açaí da Praça',
        slug: 'acai-da-praca',
        descricao: 'Batido na pedra, cremoso de verdade — o açaí da praça com toppings à vontade.',
        taxa: 390,
        tempo: 20,
        categoriaSlug: 'sobremesas',
        // Açaíteria = vitrine torra com a paleta AÇAÍ (mesmo layout do
        // Kafoska, pele roxo + orquídea): a tese das paletas em ação.
        preset: 'roast',
        palette: 'acai',
        logo: LOGO_ACAI,
        banner: fotoModa('1615478503562-ec2d8aa0e24e', 900, 1200),
        catalogo: [
          [
            'Tigelas & copos',
            [
              ['Copo da Praça 500', 1890, 'Açaí batido na pedra · frutas por cima', fotoModa('1615478503562-ec2d8aa0e24e')],
              ['Tigela Clássica 300', 1490, 'Granola crocante · banana · mel', fotoModa('1494597564530-871f2b93ac55')],
              ['Duo Berry 400', 1690, 'Açaí com morango · blueberry · hortelã', fotoModa('1553530666-ba11a7da3888')],
              ['Vitamina Morango', 1190, 'Morango batido · leite gelado · chia', fotoModa('1502741224143-90386d7f8c82')],
            ],
          ],
          [
            'Sucos & extras',
            [
              ['Trio Vitaminas', 1390, 'Banana · maçã · granola artesanal', fotoModa('1505252585461-04db1eb84625')],
              ['Suco Verde Detox', 990, 'Couve · kiwi · maçã verde · gengibre', fotoModa('1610970881699-44a5587cabec')],
              ['Salada de Frutas', 1090, 'Frutas da estação · calda cítrica', fotoModa('1490474418585-ba9bad8fd0ea')],
              ['Banana Extra', 390, 'Porção de complemento pra turbinar', fotoModa('1571771894821-ce9b6c11b08e')],
            ],
          ],
        ],
      },
      {
        nome: 'Roxa Açaí',
        slug: 'roxa-acai',
        descricao: 'Um ritual pra quem romantiza a vida — uma tigela de cada vez.',
        taxa: 490,
        tempo: 25,
        categoriaSlug: 'sobremesas',
        // Loja-demo da vitrine ritual (OCHA): rosa chiclete + roxo-açaí +
        // creme, com os cartões flutuando na página. Banner de ambiente (não
        // de produto) porque o hero da ritual é lifestyle, não vitrine.
        preset: 'ritual',
        logo: LOGO_ROXA,
        banner: fotoModa('1554118811-1e0d58224f24', 900, 1200),
        catalogo: [
          [
            // Os 4 primeiros itens com foto alimentam o carrossel de especiais
            // (palavra gigante atrás) e as miniaturas do hero — por isso cada
            // um traz uma foto DIFERENTE do banner: o dedupe do hero descarta
            // repetidas e deixaria a fileira curta.
            'Especiais da casa',
            [
              ['Tigela Nascer do Sol 400', 2290, 'Açaí cremoso · manga · maracujá · coco em lascas', fotoModa('1519996529931-28324d5a630e')],
              ['Granola da Casa 400', 2390, 'Granola tostada no mel · banana caramelada · morango', fotoModa('1494597564530-871f2b93ac55')],
              ['Roxa Assinatura 500', 2790, 'A tigela que batiza a casa · pasta de amendoim · cacau nibs', fotoModa('1615478503562-ec2d8aa0e24e')],
              ['Bowl Frutas do Verão 500', 2590, 'Melancia · uva-verde · amora · hortelã fresca', fotoModa('1490474418585-ba9bad8fd0ea')],
            ],
          ],
          [
            'Tigelas',
            [
              ['Tigela 300', 1590, 'O tamanho de todo dia · um complemento à escolha', fotoModa('1502741224143-90386d7f8c82')],
              ['Tigela 500', 2090, 'Açaí puro batido na pedra · dois complementos à escolha', fotoModa('1553530666-ba11a7da3888')],
              ['Tigela Compartilha 700', 2990, 'Pra dividir a dois · três complementos · frutas da estação', fotoModa('1622597467836-f3285f2131b8')],
              ['Tigela Zero Açúcar 400', 2190, 'Adoçada só com tâmara · granola sem glúten · frutas vermelhas', fotoModa('1596591606975-97ee5cef3a1e')],
            ],
          ],
          [
            'Batidos & sucos',
            [
              ['Batido de Açaí com Banana 500ml', 1790, 'Açaí · banana · leite gelado · o copo de sempre', fotoModa('1505252585461-04db1eb84625')],
              ['Suco Verde da Manhã 500ml', 1390, 'Couve · abacaxi · gengibre · limão-siciliano', fotoModa('1610970881699-44a5587cabec')],
              ['Batido Proteico de Cacau 500ml', 1990, 'Cacau 70% · pasta de amendoim · banana · whey', fotoModa('1638176066666-ffb2f013c7dd')],
            ],
          ],
          [
            'Extras',
            [
              ['Frutas Extras', 490, 'Porção de banana, morango ou kiwi pra completar', fotoModa('1571771894821-ce9b6c11b08e')],
              ['Picolé de Açaí', 890, 'Açaí puro no palito · amora · coco ralado', fotoModa('1488900128323-21503983a07e')],
              ['Combo de Complementos', 990, 'Granola · leite condensado · paçoca · cacau nibs', fotoModa('1495214783159-3503fd1b572d')],
            ],
          ],
        ],
      },
      { nome: 'Padaria Pão Quente', slug: 'padaria-pao-quente', descricao: 'Pães, bolos e salgados saindo do forno a toda hora.', taxa: 0, tempo: 20, categoriaSlug: 'padaria', preset: 'heritage' },
      {
        nome: 'Adega Premium',
        slug: 'adega-premium',
        descricao: 'Rótulos guardados no escuro, à espera da ocasião certa.',
        taxa: 690,
        tempo: 35,
        categoriaSlug: 'bebidas',
        // Vinhos no escuro: noir na paleta rubi + carta real.
        preset: 'noir',
        palette: 'rubi',
        banner: fotoModa('1528823872057-9c018a7a7553', 900, 1200),
        catalogo: [
          [
            'Cave & taça',
            [
              ['Degustação Vertical', 18900, 'Quatro safras do mesmo rótulo · guiada', fotoModa('1568213816046-0ee1c42bd559')],
              ['Tinto da Casa', 8900, 'Corte bordalês · taninos macios · 750ml', fotoModa('1506377247377-2a5b3b417ebb')],
              ['Brinde Reserva', 12900, 'Seleção premiada para ocasiões · 750ml', fotoModa('1510812431401-41d2bd2722f3')],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Moda & Estilo',
    secaoSlug: 'moda-estilo',
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
      {
        nome: 'Passo Certo Calçados',
        slug: 'passo-certo-calcados',
        descricao: 'Tênis de drop, clássicos de vitrine — o par certo pro seu corre.',
        taxa: 690,
        tempo: 50,
        categoriaSlug: 'calcados',
        // Sneaker shop: vitrine raw na paleta laranja 'sinal' + drops reais.
        preset: 'raw',
        palette: 'sinal',
        banner: fotoModa('1460353581641-37baddab0fa2', 900, 1200),
        catalogo: [
          [
            'drop TÊNIS',
            [
              ['Air Max Solar', 79990, 'Malha branca com explosão laranja', fotoModa('1600185365483-26d7a4cc7519')],
              ['AF-1 Caramelo', 84990, 'Couro fosco tom terra, sola gum', fotoModa('1549298916-b41d501d3772')],
              ['Runner Prisma', 69990, 'Chunky multicolor de cadarço duplo', fotoModa('1560769629-975ec94e6a86')],
            ],
          ],
          [
            'vitrine CLÁSSICA',
            [
              ['Night Runner', 59990, 'Preto total com detalhe volt', fotoModa('1491553895911-0055eca6402d')],
              ['Scarpin Floral', 45990, 'Cetim estampado, salto agulha 9cm', fotoModa('1543163521-1bf539c55dd2')],
            ],
          ],
        ],
      },
      {
        nome: 'Urban Wear',
        slug: 'urban-wear',
        descricao: 'Streetwear de rua raiz — drops limitados, sneakers e o inconformismo de uniforme.',
        taxa: 790,
        tempo: 45,
        categoriaSlug: 'moda',
        // Loja-demo da vitrine raw (Rawline): pele vermelhão 'brasa' +
        // catálogo streetwear com fotos reais (ver LojaRaw.tsx).
        preset: 'raw',
        palette: 'brasa',
        logo: LOGO_URBAN_WEAR,
        banner: fotoModa('1523398002811-999ca8dec234', 900, 1200),
        catalogo: [
          [
            'drop CONCRETO',
            [
              ['Tee Esqueleto Paz', 9990, 'Algodão pesado, estampa serigrafada', fotoModa('1503341504253-dff4815485f1')],
              ['Jordan Cimento Laranja', 89990, 'Couro e camurça, sola de tração', fotoModa('1556906781-9a412961c28c')],
              ['Runner Vermelho Fogo', 69990, 'Malha respirável, amortecimento integral', fotoModa('1542291026-7eec264c27ff')],
              ['Perfecto Couro', 129990, 'Couro legítimo, zíperes gun metal', fotoModa('1520975954732-35dd22299614')],
              ['Bomber Ferrugem', 45990, 'Nylon matte com forro acolchoado', fotoModa('1591047139829-d91aecb6caea')],
              ['Jordan Bred Quadra', 99990, 'O clássico vermelho e preto', fotoModa('1552346154-21d32810aba3')],
            ],
          ],
          [
            'queima TOTAL',
            [
              ['Tee Branca Heavy', 7990, 'Fio 30.1 penteado, corte reto', fotoModa('1521572163474-6864f9cf17ab')],
              ['Tee Preta 705', 8990, 'Estampa circular no peito', fotoModa('1618354691373-d851c5c3a990')],
              ['Tee Off Minimal', 7490, 'Logo bordado tom sobre tom', fotoModa('1529374255404-311a2a4f1fd9')],
              ['Look Motor City', 119990, 'Jaqueta de couro + calça slim', fotoModa('1520975661595-6453be3f7070')],
              ['Look Cobble', 64990, 'Bomber vinho + jeans stone', fotoModa('1512353087810-25dfcd100962')],
              ['College Caramelo', 84990, 'Couro texturizado, punhos canelados', fotoModa('1487222477894-8943e31ef7b2')],
            ],
          ],
        ],
      },
      { nome: 'Joalheria Lux', slug: 'joalheria-lux', descricao: 'Joias, relógios e semijoias com garantia.', taxa: 0, tempo: 60, categoriaSlug: 'acessorios', preset: 'noir' },
      {
        nome: 'Ótica Visão Clara',
        slug: 'otica-visao-clara',
        descricao: 'Armações de grife e solares com lentes de proteção total.',
        taxa: 590,
        tempo: 55,
        categoriaSlug: 'acessorios',
        // Ótica minimal: vitrine editorial com curadoria real.
        preset: 'editorial',
        banner: fotoModa('1511499767150-a48a237f0083', 900, 1200),
        catalogo: [
          [
            'Coleção',
            [
              ['Wayfarer Noir', 89990, 'Acetato preto polido, lente G15', fotoModa('1572635196237-14b3f281503f')],
              ['Panorama Rosé', 74990, 'Translúcido com lente espelhada', fotoModa('1577803645773-f96470509666')],
              ['Clubmaster Tartaruga', 64990, 'Meia-armação clássica para grau', fotoModa('1574258495973-f010dfbb5371')],
            ],
          ],
        ],
      },
      {
        nome: 'Arena Fit',
        slug: 'arena-fit',
        descricao: 'Performance em cada treino. Roupas, suplementos e atitude no repeat.',
        taxa: 590,
        tempo: 40,
        categoriaSlug: 'moda',
        // Loja-demo da vitrine volt (Nivest): fitness com energia elétrica.
        preset: 'volt',
        logo: LOGO_ARENA_FIT,
        banner: fotoModa('1517836357463-d25dfeac3438', 900, 1200),
        catalogo: [
          [
            'Performance',
            [
              ['Legging Alta Resistência', 18990, 'Compressão média, cós alto, bolso lateral', fotoModa('1546483875-ad9014c88eba')],
              ['Conjunto Treino Red', 22990, 'Top + short com tecido respirável', fotoModa('1518611012118-696072aa579a')],
              ['Jogger Flex Cinza', 15990, 'Moletom leve de secagem rápida', fotoModa('1506629082955-511b1aa562c8')],
              ['Top Impacto Laranja', 9990, 'Sustentação alta para corrida', fotoModa('1571019613454-1cb2f99b2d8b')],
            ],
          ],
          [
            'Suplementos & gear',
            [
              ['Whey Isolado Baunilha', 16990, '900g · 27g de proteína por dose', fotoModa('1593095948071-474c5cc2989d')],
              ['Shaker Rotina Pro', 4990, '700ml com mola misturadora', fotoModa('1579722820308-d74e571900a9')],
              ['Barra Proteica Choco', 890, '45g · 15g de proteína · sem açúcar', fotoModa('1622484212850-eb596d769edc')],
              ['Luva Cross Grip', 7990, 'Couro reforçado para barra e corda', fotoModa('1517344884509-a0c97ec11bcc')],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Saúde',
    secaoSlug: 'saude',
    catalogo: [
      [
        'Atendimentos',
        [
          ['Consulta inicial', 18000, 'Primeira avaliação com plano de cuidado por escrito', undefined, [['Duracao', '50 min'], ['Profissional', 'Equipe da clínica']]],
          ['Sessão de acompanhamento', 12000, 'Continuidade do tratamento em sala individual', undefined, [['Duracao', '40 min'], ['Profissional', 'Equipe da clínica']]],
          ['Retorno', 7000, 'Reavaliação em até 30 dias do atendimento inicial', undefined, [['Duracao', '30 min'], ['Profissional', 'Equipe da clínica']]],
        ],
      ],
      [
        'Pacotes',
        [
          ['Pacote 5 sessões', 52000, 'Cinco atendimentos com reavaliação na última', undefined, [['Duracao', '40 min'], ['Sessões', '5'], ['Validade', '60 dias']]],
          ['Pacote 10 sessões', 96000, 'Dez atendimentos em horário fixo semanal', undefined, [['Duracao', '40 min'], ['Sessões', '10'], ['Validade', '90 dias']]],
          ['Avaliação avulsa', 9000, 'Diagnóstico pontual com relatório para o médico', undefined, [['Duracao', '45 min'], ['Entrega', 'Relatório em PDF']]],
        ],
      ],
    ],
    lojas: [
      {
        nome: 'Farmácia Saúde+',
        slug: 'farmacia-saude-mais',
        descricao: 'Sua farmácia de confiança — medicamentos com procedência e farmacêutico de plantão.',
        taxa: 0,
        tempo: 25,
        categoriaSlug: 'farmacia',
        // Loja-demo da vitrine clínica: busca, lista densa e selo de receita.
        preset: 'clinic',
        logo: LOGO_FARMACIA,
        banner: fotoModa('1576602976047-174e57a47881', 900, 1200),
        catalogo: [
          [
            'Medicamentos',
            [
              ['Analgésico 500mg · 20cp', 1290, 'Paracetamol · dor e febre', fotoModa('1584308666744-24d5c474f2ae')],
              ['Antibiótico 500mg · 21cp', 4590, 'Amoxicilina · uso sob prescrição', fotoModa('1550572017-edd951b55104'), undefined, true],
              ['Antigripal Dia & Noite', 2190, 'Alívio completo dos sintomas gripais', fotoModa('1628771065518-0d82f1938462')],
            ],
          ],
          [
            'Vitaminas & bem-estar',
            [
              ['Vitamina C 1g · 30 efervescentes', 2490, 'Imunidade diária · sabor laranja', fotoModa('1587854692152-cbe660dbde88')],
              ['Ômega 3 + Vitamina D', 5990, '60 cápsulas · EPA e DHA concentrados', fotoModa('1512069772995-ec65ed45afd6')],
              ['Multivitamínico A-Z', 3990, '90 comprimidos · rotina completa', fotoModa('1607619056574-7b8d3ee536b2')],
              ['Imunidade Zinco + Própolis', 3490, '30 cápsulas · defesa natural', fotoModa('1471864190281-a93a3070b6de')],
            ],
          ],
        ],
      },
      {
        nome: 'Movimento Fisioterapia',
        slug: 'movimento-fisioterapia',
        descricao: 'Reabilitação com hora marcada — ortopedia, RPG e pilates clínico em sala individual.',
        // Serviço não tem entrega: taxa 0 e `tempo` = duração típica da sessão.
        taxa: 0,
        tempo: 50,
        categoriaSlug: 'fisioterapia',
        // Vitrine clínica (clinic + saude-bem-estar): abas por tipo de terapia,
        // busca no hero e cartões quadrados. Paleta azul = consultório sério.
        preset: 'clinic',
        palette: 'azul',
        catalogo: [
          [
            'Sessões',
            [
              ['Avaliação Fisioterapêutica', 14000, 'Anamnese, testes de força e mobilidade e plano de tratamento impresso', undefined, [['Duracao', '60 min'], ['Profissional', 'Fisioterapeuta'], ['Inclui', 'Relatório para o médico']]],
              ['Sessão de Fisioterapia Ortopédica', 12000, 'Terapia manual, mobilização articular e exercícios guiados para lombar, ombro ou joelho', undefined, [['Duracao', '50 min'], ['Profissional', 'Fisioterapeuta'], ['Local', 'Sala individual']]],
              ['Sessão de RPG', 15000, 'Reeducação postural global em posturas ativas, com espelho e faixas elásticas', undefined, [['Duracao', '60 min'], ['Profissional', 'Fisioterapeuta'], ['Indicação', 'Dor postural crônica']]],
              ['Pilates Clínico Individual', 13000, 'Reformer e cadillac com carga ajustada à lesão, um a um com o fisioterapeuta', undefined, [['Duracao', '55 min'], ['Profissional', 'Fisioterapeuta'], ['Aparelhos', 'Reformer · cadillac · chair']]],
              ['Fisioterapia Pélvica', 16000, 'Tratamento de incontinência e dor pélvica com biofeedback e exercícios do assoalho', undefined, [['Duracao', '50 min'], ['Profissional', 'Fisioterapeuta pélvica'], ['Local', 'Sala fechada']]],
            ],
          ],
          [
            'Terapias e recursos',
            [
              ['Liberação Miofascial', 11000, 'Ventosas, pinçamento e rolo em pontos-gatilho de costas e panturrilha', undefined, [['Duracao', '40 min'], ['Profissional', 'Fisioterapeuta']]],
              ['Agulhamento a Seco', 9000, 'Dry needling em trapézio, lombar e glúteo para dor miofascial', undefined, [['Duracao', '30 min'], ['Profissional', 'Fisioterapeuta'], ['Material', 'Agulha descartável']]],
              ['Ultrassom + TENS', 7000, 'Analgesia e controle de inflamação em tendinite e bursite', undefined, [['Duracao', '25 min'], ['Profissional', 'Fisioterapeuta']]],
              ['Drenagem Pós-Operatória', 13000, 'Drenagem linfática manual para pós-cirúrgico, com bandagem de contenção', undefined, [['Duracao', '60 min'], ['Profissional', 'Fisioterapeuta dermatofuncional']]],
              ['Bandagem Elástica', 5000, 'Aplicação de kinesio tape para suporte articular no esporte', undefined, [['Duracao', '15 min'], ['Profissional', 'Fisioterapeuta']]],
            ],
          ],
          [
            'Pacotes',
            [
              ['Pacote Ortopédico · 10 sessões', 99000, 'Dez sessões em horário fixo, com reavaliação na quinta', undefined, [['Duracao', '50 min'], ['Sessões', '10'], ['Validade', '90 dias']]],
              ['Pacote Pós-Operatório · 8 sessões', 88000, 'Protocolo de joelho ou ombro do primeiro pós até a alta funcional', undefined, [['Duracao', '50 min'], ['Sessões', '8'], ['Validade', '60 dias']]],
              ['Pacote RPG · 6 sessões', 78000, 'Ciclo completo de reeducação postural com fotos de antes e depois', undefined, [['Duracao', '60 min'], ['Sessões', '6'], ['Validade', '60 dias']]],
            ],
          ],
        ],
      },
      {
        nome: 'Consultório Nutrir',
        slug: 'consultorio-nutrir',
        descricao: 'Nutrição clínica sem dieta de gaveta — plano alimentar montado com o que já se come em casa.',
        taxa: 0,
        tempo: 60,
        categoriaSlug: 'nutricao',
        // Mesma vitrine clínica, pele BOTICA (verde): consultório de nutrição
        // pede um tom mais natural que o azul hospitalar da fisioterapia.
        preset: 'clinic',
        palette: 'botica',
        catalogo: [
          [
            'Consultas',
            [
              ['Consulta Nutricional Inicial', 22000, 'Anamnese alimentar, bioimpedância e plano montado na hora, com lista de compras', undefined, [['Duracao', '60 min'], ['Profissional', 'Nutricionista'], ['Inclui', 'Bioimpedância + plano em PDF']]],
              ['Retorno de Acompanhamento', 14000, 'Ajuste do plano, nova bioimpedância e leitura dos exames recentes', undefined, [['Duracao', '40 min'], ['Profissional', 'Nutricionista'], ['Indicação', 'A cada 30 dias']]],
              ['Nutrição Esportiva', 25000, 'Cálculo de macros e estratégia de suplementação periodizada com o treino', undefined, [['Duracao', '60 min'], ['Profissional', 'Nutricionista esportiva'], ['Inclui', 'Plano pré e pós-treino']]],
              ['Nutrição Infantil', 20000, 'Consulta de 2 a 12 anos, com estratégias para seletividade e lancheira da escola', undefined, [['Duracao', '50 min'], ['Profissional', 'Nutricionista materno-infantil'], ['Faixa etária', '2 a 12 anos']]],
              ['Consulta da Gestante', 23000, 'Acompanhamento por trimestre, com controle de ganho de peso e ferro', undefined, [['Duracao', '55 min'], ['Profissional', 'Nutricionista'], ['Inclui', 'Cardápio por trimestre']]],
            ],
          ],
          [
            'Avaliações',
            [
              ['Bioimpedância Avulsa', 6000, 'Composição corporal em balança tetrapolar, com laudo impresso na hora', undefined, [['Duracao', '20 min'], ['Preparo', 'Sem treino nas 12h anteriores']]],
              ['Avaliação Antropométrica', 7000, 'Sete dobras cutâneas com adipômetro e circunferências, ponto a ponto', undefined, [['Duracao', '30 min'], ['Profissional', 'Nutricionista']]],
              ['Leitura de Exames', 9000, 'Interpretação de hemograma, ferritina, vitamina D e perfil lipídico', undefined, [['Duracao', '30 min'], ['Profissional', 'Nutricionista'], ['Trazer', 'Exames dos últimos 6 meses']]],
            ],
          ],
          [
            'Programas',
            [
              ['Programa 3 Meses', 54000, 'Consulta inicial, três retornos e ajuste por mensagem em dias úteis', undefined, [['Duracao', '60 min'], ['Retornos', '3'], ['Suporte', 'WhatsApp em dias úteis']]],
              ['Programa Emagrecimento · 6 meses', 96000, 'Seis encontros, remontagem do cardápio a cada mês e metas de rotina', undefined, [['Duracao', '60 min'], ['Retornos', '5'], ['Validade', '180 dias']]],
              ['Programa Casal', 38000, 'Duas pessoas na mesma consulta, com um cardápio que fecha a cozinha da casa', undefined, [['Duracao', '75 min'], ['Pessoas', '2'], ['Inclui', 'Lista de compras conjunta']]],
            ],
          ],
        ],
      },
      {
        nome: 'Divinolab Análises Clínicas',
        slug: 'divinolab',
        descricao: 'Coleta com hora marcada e resultado no aplicativo — exames de rotina, check-up e testes rápidos.',
        taxa: 0,
        tempo: 20,
        categoriaSlug: 'laboratorio',
        // Laboratório é o caso perfeito da vitrine clínica: lista densa, busca
        // por nome do exame e o selo RECEITA nos que pedem requisição médica.
        preset: 'clinic',
        palette: 'azul',
        catalogo: [
          [
            'Exames de rotina',
            [
              ['Hemograma Completo', 3500, 'Série vermelha, branca e plaquetas, com contagem diferencial', undefined, [['Duracao', '15 min'], ['Preparo', 'Sem jejum'], ['Resultado', 'Em 24h no app']]],
              ['Glicemia de Jejum', 1800, 'Dosagem de glicose no sangue para rastreio de diabetes', undefined, [['Duracao', '15 min'], ['Preparo', 'Jejum de 8h'], ['Resultado', 'Em 24h no app']]],
              ['Perfil Lipídico', 4900, 'Colesterol total, HDL, LDL e triglicérides no mesmo tubo', undefined, [['Duracao', '15 min'], ['Preparo', 'Jejum de 12h'], ['Resultado', 'Em 24h no app']]],
              ['TSH e T4 Livre', 5900, 'Rastreio de tireoide para cansaço, queda de cabelo e variação de peso', undefined, [['Duracao', '15 min'], ['Preparo', 'Sem jejum'], ['Resultado', 'Em 48h no app']], true],
              ['Vitamina D · 25-OH', 6900, 'Dosagem sérica para acompanhamento de suplementação', undefined, [['Duracao', '15 min'], ['Preparo', 'Sem jejum'], ['Resultado', 'Em 48h no app']], true],
              ['Creatinina e Ácido Úrico', 3900, 'Função renal e rastreio de gota, colhidos na mesma punção', undefined, [['Duracao', '15 min'], ['Preparo', 'Jejum de 4h'], ['Resultado', 'Em 24h no app']]],
            ],
          ],
          [
            'Check-ups',
            [
              ['Check-up Homem 40+', 24900, 'Hemograma, PSA, lipidograma, glicemia, TGO/TGP e creatinina', undefined, [['Duracao', '20 min'], ['Exames', '6 no total'], ['Preparo', 'Jejum de 8h']], true],
              ['Check-up Mulher 40+', 24900, 'Hemograma, ferritina, TSH, lipidograma, glicemia e vitamina D', undefined, [['Duracao', '20 min'], ['Exames', '6 no total'], ['Preparo', 'Jejum de 8h']], true],
              ['Check-up Pré-Natal', 27900, 'Tipagem sanguínea, sorologias, hemograma e glicemia do primeiro trimestre', undefined, [['Duracao', '25 min'], ['Exames', '8 no total'], ['Preparo', 'Jejum de 8h']], true],
              ['Check-up Esportivo', 19900, 'Hemograma, CPK, ferro, magnésio e função renal para quem treina forte', undefined, [['Duracao', '20 min'], ['Exames', '5 no total'], ['Preparo', 'Sem treino 24h antes']]],
            ],
          ],
          [
            'Coleta e testes rápidos',
            [
              ['Coleta Domiciliar', 8900, 'Técnica de enfermagem vai até você no Centro e bairros até 5 km', undefined, [['Duracao', '30 min'], ['Área', 'Centro e bairros até 5 km'], ['Horário', 'Manhã, de segunda a sábado']]],
              ['Teste Rápido de Gravidez', 4500, 'Beta-HCG qualitativo em sangue, com resultado no balcão', undefined, [['Duracao', '15 min'], ['Preparo', 'Sem jejum'], ['Resultado', 'Em 30 min']]],
              ['Teste Rápido Covid e Influenza', 9900, 'Swab nasal combinado para os dois vírus, com laudo assinado', undefined, [['Duracao', '20 min'], ['Preparo', 'Sem preparo'], ['Resultado', 'Em 20 min']]],
              ['Aplicação de Injetável', 3500, 'Aplicação intramuscular de medicação prescrita, com descarte seguro', undefined, [['Duracao', '15 min'], ['Profissional', 'Técnica de enfermagem'], ['Trazer', 'Medicação e receita']], true],
            ],
          ],
        ],
      },
      {
        nome: 'Vet Amigo Fiel',
        slug: 'vet-amigo-fiel',
        descricao: 'Clínica veterinária de cães e gatos no Interlagos — consulta, vacina e cirurgia com hora marcada.',
        taxa: 0,
        tempo: 40,
        categoriaSlug: 'veterinaria',
        // Veterinária só aceita clinic e soft; clinic + botica dá o verde de
        // clínica de bairro (a azul ficou para o laboratório, sem repetir pele).
        preset: 'clinic',
        palette: 'botica',
        catalogo: [
          [
            'Consultas',
            [
              ['Consulta Clínica Geral', 13000, 'Exame físico completo, peso, temperatura e orientação de manejo em casa', undefined, [['Duracao', '40 min'], ['Profissional', 'Médico-veterinário'], ['Atende', 'Cães e gatos']]],
              ['Consulta de Retorno', 6000, 'Reavaliação em até 15 dias, com ajuste de medicação e curativo', undefined, [['Duracao', '30 min'], ['Profissional', 'Médico-veterinário'], ['Prazo', 'Até 15 dias da consulta']]],
              ['Atendimento Dermatológico', 18000, 'Raspado de pele e citologia para coceira, queda de pelo e otite de repetição', undefined, [['Duracao', '50 min'], ['Profissional', 'Veterinária dermatologista'], ['Inclui', 'Exame de lâmina no local']]],
              ['Consulta Geriátrica', 17000, 'Cão ou gato acima de 8 anos: pressão arterial, avaliação renal e cardíaca', undefined, [['Duracao', '50 min'], ['Profissional', 'Médico-veterinário'], ['Indicação', 'A partir de 8 anos']]],
            ],
          ],
          [
            'Vacinas e prevenção',
            [
              ['Vacina V10 · cães', 9000, 'Múltipla canina com aplicação, carteirinha e observação de 20 minutos', undefined, [['Duracao', '20 min'], ['Reforço', 'Anual'], ['Profissional', 'Médico-veterinário']]],
              ['Vacina V4 · gatos', 9500, 'Quádrupla felina para gatos a partir de 8 semanas', undefined, [['Duracao', '20 min'], ['Reforço', 'Anual'], ['Profissional', 'Médico-veterinário']]],
              ['Antirrábica', 6500, 'Dose única anual, aplicada e registrada na carteira de vacinação', undefined, [['Duracao', '15 min'], ['Reforço', 'Anual'], ['Profissional', 'Médico-veterinário']]],
              ['Vermífugo e Antipulgas', 7500, 'Dose calculada pelo peso do animal e aplicada ali mesmo, na clínica', undefined, [['Duracao', '15 min'], ['Reforço', 'A cada 3 meses'], ['Atende', 'Cães e gatos']]],
              ['Microchipagem', 12000, 'Chip ISO aplicado no subcutâneo e registro no cadastro nacional', undefined, [['Duracao', '20 min'], ['Inclui', 'Registro nacional'], ['Profissional', 'Médico-veterinário']]],
            ],
          ],
          [
            'Exames e cirurgias',
            [
              ['Ultrassom Abdominal', 22000, 'Fígado, rins, bexiga e alças intestinais com laudo no mesmo dia', undefined, [['Duracao', '40 min'], ['Preparo', 'Jejum de 8h'], ['Entrega', 'Laudo no mesmo dia']]],
              ['Castração de Gata', 39000, 'Cirurgia com anestesia inalatória, exames pré-operatórios e medicação pós', undefined, [['Duracao', '90 min'], ['Internação', 'Meio período'], ['Inclui', 'Pré-operatório e retorno']]],
              ['Castração de Cadela até 15 kg', 55000, 'Ovariosalpingohisterectomia com monitoração multiparamétrica', undefined, [['Duracao', '120 min'], ['Internação', 'Meio período'], ['Inclui', 'Exames pré e dois retornos']]],
              ['Limpeza de Tártaro', 45000, 'Profilaxia dentária sob anestesia, com ultrassom, polimento e extrações leves', undefined, [['Duracao', '80 min'], ['Preparo', 'Jejum de 10h'], ['Inclui', 'Avaliação cardíaca prévia']]],
            ],
          ],
        ],
      },
      {
        nome: 'Núcleo Pilates & Performance',
        slug: 'nucleo-pilates',
        descricao: 'Studio de pilates e treino funcional — turma pequena, carga na medida e energia no repeat.',
        taxa: 0,
        tempo: 50,
        categoriaSlug: 'pilates',
        // Saúde ESPORTIVA pede volt (alternativa oferecida para saude-bem-estar):
        // ativa a vitrine Nivest — hero elétrico e blocos de performance.
        preset: 'volt',
        palette: 'eletrico',
        catalogo: [
          [
            'Aulas',
            [
              ['Aula Experimental', 3900, 'Primeira aula com avaliação postural e teste de mobilidade antes de começar', undefined, [['Duracao', '50 min'], ['Turma', 'Até 4 alunos'], ['Profissional', 'Fisioterapeuta do studio']]],
              ['Pilates Solo em Grupo', 5500, 'Mat pilates com bola, magic circle e faixa elástica, em turma reduzida', undefined, [['Duracao', '50 min'], ['Turma', 'Até 6 alunos'], ['Nível', 'Iniciante a avançado']]],
              ['Pilates em Aparelhos', 8500, 'Reformer, cadillac, chair e barrel com carga ajustada aluno a aluno', undefined, [['Duracao', '50 min'], ['Turma', 'Até 4 alunos'], ['Aparelhos', 'Reformer · cadillac · chair · barrel']]],
              ['Treino Funcional', 6500, 'Circuito de força e condicionamento com kettlebell, corda naval e caixa', undefined, [['Duracao', '45 min'], ['Turma', 'Até 8 alunos'], ['Profissional', 'Educador físico']]],
              ['Personal 1 a 1', 14000, 'Treino individual com plano de 12 semanas e progressão registrada', undefined, [['Duracao', '60 min'], ['Turma', 'Individual'], ['Profissional', 'Educador físico']]],
            ],
          ],
          [
            'Avaliações',
            [
              ['Avaliação Física Completa', 12000, 'Bioimpedância, flexibilidade, força de preensão e plano de treino por escrito', undefined, [['Duracao', '60 min'], ['Profissional', 'Educador físico'], ['Entrega', 'Relatório em PDF']]],
              ['Reavaliação Trimestral', 7000, 'Comparativo com a avaliação anterior e ajuste das cargas do trimestre', undefined, [['Duracao', '40 min'], ['Profissional', 'Educador físico'], ['Indicação', 'A cada 90 dias']]],
              ['Análise de Corrida', 16000, 'Filmagem na esteira em câmera lenta, leitura de cadência e pisada', undefined, [['Duracao', '60 min'], ['Profissional', 'Fisioterapeuta esportivo'], ['Entrega', 'Vídeo comentado']]],
            ],
          ],
          [
            'Planos',
            [
              ['Plano 2x na Semana', 26000, 'Oito aulas no mês em horário fixo, solo ou aparelhos', undefined, [['Duracao', '50 min'], ['Frequência', '2x por semana'], ['Validade', '30 dias']]],
              ['Plano 3x na Semana', 34000, 'Doze aulas no mês, com uma trocável por treino funcional', undefined, [['Duracao', '50 min'], ['Frequência', '3x por semana'], ['Validade', '30 dias']]],
              ['Pacote 10 Aulas Livres', 48000, 'Dez aulas para usar em 90 dias, sem horário fixo na agenda', undefined, [['Duracao', '50 min'], ['Aulas', '10'], ['Validade', '90 dias']]],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Beleza',
    secaoSlug: 'beleza',
    catalogo: [
      [
        'Serviços da casa',
        [
          ['Corte e finalização', 8900, 'Corte personalizado com lavagem e finalização em escova', undefined, [['Duração', '60 min'], ['Inclui', 'Lavagem e escova']]],
          ['Coloração completa', 19900, 'Cor uniforme da raiz às pontas com tonalização final', undefined, [['Duração', '120 min'], ['Inclui', 'Teste de mecha e tonalização']]],
          ['Manicure e pedicure', 6500, 'Mão e pé com cutícula, lixa e esmaltação da cartela da casa', undefined, [['Duração', '75 min'], ['Inclui', 'Alicate esterilizado em autoclave']]],
          ['Design de sobrancelha', 3900, 'Mapeamento do rosto com linha e pinça, sem cera', undefined, [['Duração', '30 min'], ['Técnica', 'Linha e pinça']]],
        ],
      ],
      [
        'Cuidados & tratamentos',
        [
          ['Limpeza de pele', 13900, 'Vapor de ozônio, extração completa e máscara calmante', undefined, [['Duração', '80 min'], ['Inclui', 'Protetor solar ao final']]],
          ['Massagem relaxante', 10900, 'Corpo inteiro com óleo morno e aromaterapia na sala', undefined, [['Duração', '60 min'], ['Inclui', 'Compressa quente na cervical']]],
          ['Hidratação capilar', 7900, 'Máscara de reconstrução aplicada com vaporizador', undefined, [['Duração', '45 min'], ['Inclui', 'Massagem craniana']]],
        ],
      ],
    ],
    lojas: [
      {
        nome: 'Bella Cosméticos',
        slug: 'bella-cosmeticos',
        descricao: 'Skincare e beleza com fórmulas limpas — o ritual delicado de todo dia.',
        taxa: 0,
        tempo: 35,
        categoriaSlug: 'beleza',
        // Loja-demo da vitrine serena (All Natural): pele ardósia delicada +
        // catálogo de skincare com fotos reais (ver LojaSerena.tsx).
        preset: 'serene',
        logo: LOGO_BELLA,
        banner: fotoModa('1620916566398-39f1143ab7be', 900, 1200),
        catalogo: [
          [
            'Skincare',
            [
              ['Sérum Hidratante', 8990, 'Ácido hialurônico e vitamina B5', fotoModa('1620756236308-65c3ef5d25f3')],
              ['Creme Corporal Nuvem', 6990, 'Manteiga de karité, toque seco', fotoModa('1625772452859-1c03d5bf1137')],
              ['Óleo Facial Âmbar', 11990, 'Jojoba e rosa mosqueta prensadas a frio', fotoModa('1617897903246-719242758050')],
              ['Kit Botânico', 15990, 'Tônico, sérum e máscara em edição especial', fotoModa('1612817288484-6f916006741a')],
              ['Máscara Capilar Repair', 7990, 'Reconstrução com aminoácidos', fotoModa('1608248543803-ba4f8c70ae0b')],
              ['Limpador Suave', 5990, 'Espuma cremosa para todos os tipos de pele', fotoModa('1556228720-195a672e8a03')],
            ],
          ],
          [
            'Maquiagem',
            [
              ['Kit Pincéis Rosé', 12990, 'Sete pincéis de cerdas macias', fotoModa('1596462502278-27bfdc403348')],
              ['Paleta Nude', 9990, 'Doze tons matte e acetinados', fotoModa('1522335789203-aabd1fc54bc9')],
              ['Rotina Glow', 13990, 'Base leve + iluminador + blush cremoso', fotoModa('1601049676869-702ea24cfd58')],
              ['Duo Coral Vivo', 8490, 'Batom e blush líquido em tom coral', fotoModa('1615397349754-cfa2066a298e')],
              ['Coleção Essencial', 10990, 'O necessário para o dia a dia', fotoModa('1598440947619-2c35fc9aa908')],
              ['Kit Assinatura', 17990, 'A curadoria completa da casa', fotoModa('1571781926291-c477ebfd024b')],
            ],
          ],
        ],
      },
      {
        nome: 'Ateliê Camélia',
        slug: 'atelie-camelia',
        descricao: 'Cabelo com hora marcada e mão de mestre — corte, cor e tratamento no ritmo da casa.',
        taxa: 0,
        tempo: 90,
        categoriaSlug: 'salao',
        // Loja-demo da vitrine serena em salões: `serene` + saloes-estetica abre
        // a LojaSerena (ver [slug].tsx). Paleta pérola = marrom quente sobre
        // branco, o tom de ateliê que a categoria pede.
        preset: 'serene',
        palette: 'perola',
        banner: fotoModa('1560066984-138dadb4c035', 900, 1200),
        catalogo: [
          [
            'Corte & finalização',
            [
              ['Corte Feminino Assinatura', 12900, 'Diagnóstico de fio, corte a seco e finalização em escova modelada', undefined, [['Duração', '90 min'], ['Inclui', 'Lavagem, hidratação express e escova'], ['Profissional', 'Cabeleireira sênior']]],
              ['Corte Masculino Social', 6900, 'Tesoura e máquina com acabamento na navalha e finalização em pomada', undefined, [['Duração', '45 min'], ['Inclui', 'Lavagem e finalização']]],
              ['Corte Infantil', 5500, 'Corte tranquilo com cadeira alta e desenho rodando na TV', undefined, [['Duração', '40 min'], ['Idade', 'Até 10 anos']]],
              ['Escova Modelada', 7500, 'Escova com babyliss ou prancha, do liso ao ondulado', undefined, [['Duração', '50 min'], ['Inclui', 'Lavagem e óleo de finalização']]],
              ['Penteado de Festa', 18900, 'Preso, semipreso ou ondas de festa com fixação de longa duração', undefined, [['Duração', '80 min'], ['Inclui', 'Prova de penteado agendada à parte']]],
            ],
          ],
          [
            'Coloração',
            [
              ['Retoque de Raiz', 16900, 'Tintura sem amônia na raiz com selagem ácida ao final', undefined, [['Duração', '120 min'], ['Inclui', 'Teste de mecha e tonalização']]],
              ['Mechas Balayage', 39900, 'Iluminação à mão livre com pó descolorante vegano e matização', undefined, [['Duração', '240 min'], ['Inclui', 'Matização e máscara reconstrutora'], ['Observação', 'Cabelo abaixo do ombro tem acréscimo']]],
              ['Morena Iluminada', 32900, 'Mechas finas próximas ao tom natural, com efeito de brilho de vidro', undefined, [['Duração', '180 min'], ['Inclui', 'Matização e finalização']]],
              ['Tonalizante Brilho', 11900, 'Banho de cor sem clareamento para reavivar o pigmento', undefined, [['Duração', '60 min'], ['Durabilidade', 'Cerca de 6 semanas']]],
            ],
          ],
          [
            'Tratamentos',
            [
              ['Cronograma Capilar · Sessão', 13900, 'Hidratação, nutrição ou reconstrução conforme o diagnóstico do fio', undefined, [['Duração', '70 min'], ['Inclui', 'Diagnóstico com microcâmera']]],
              ['Botox Capilar', 15900, 'Redução de volume e alinhamento sem formol, com brilho imediato', undefined, [['Duração', '100 min'], ['Inclui', 'Lavagem e escova']]],
              ['Selagem Térmica', 21900, 'Selagem da cutícula com queratina hidrolisada e prancha a 180°', undefined, [['Duração', '150 min'], ['Durabilidade', 'Até 3 meses']]],
              ['Spa dos Fios', 9900, 'Massagem craniana, vaporizador e máscara de argila branca', undefined, [['Duração', '45 min'], ['Inclui', 'Massagem no couro cabeludo']]],
            ],
          ],
        ],
      },
      {
        nome: 'Barbearia Fio Nobre',
        slug: 'barbearia-fio-nobre',
        descricao: 'Cadeira reclinável, toalha quente e navalha afiada — a barbearia clássica do centro.',
        taxa: 0,
        tempo: 60,
        categoriaSlug: 'barbearia',
        // Barbearia clássica pede escuro: `noir` na paleta prata (preto + aço).
        // Sem vitrine própria (noir só abre a LojaNoir em alimentos-bebidas) —
        // aqui o ganho é a pele, e o PDP continua o de agendamento.
        preset: 'noir',
        palette: 'prata',
        banner: fotoModa('1503951914875-452162b0f3f1', 900, 1200),
        catalogo: [
          [
            'Cadeira',
            [
              ['Corte Clássico na Tesoura', 6500, 'Máquina nas laterais, topo na tesoura e acabamento na navalha', undefined, [['Duração', '45 min'], ['Inclui', 'Toalha quente e finalização']]],
              ['Corte + Barba Completa', 11900, 'O combo da casa: corte social e barba desenhada em duas passadas', undefined, [['Duração', '75 min'], ['Inclui', 'Toalha quente, óleo e balm']]],
              ['Barboterapia', 6900, 'Barba na navalha com toalha quente e massagem facial ao final', undefined, [['Duração', '40 min'], ['Inclui', 'Óleo pré-barba e balm calmante']]],
              ['Degradê Navalhado', 7500, 'Fade do zero com pézinho na navalha e risco a critério', undefined, [['Duração', '50 min'], ['Inclui', 'Lavagem e pomada modeladora']]],
              ['Pézinho Avulso', 2500, 'Manutenção do contorno entre um corte e outro', undefined, [['Duração', '15 min'], ['Ideal', 'De 10 a 15 dias após o corte']]],
            ],
          ],
          [
            'Tratamentos',
            [
              ['Pigmentação de Barba', 8900, 'Preenchimento de falhas com pigmento temporário à prova de suor', undefined, [['Duração', '40 min'], ['Durabilidade', 'Cerca de 8 dias']]],
              ['Hidratação Capilar Masculina', 5500, 'Máscara de argila com mentol para couro cabeludo oleoso', undefined, [['Duração', '30 min'], ['Inclui', 'Massagem craniana']]],
              ['Relaxamento de Fios', 9900, 'Alinhamento sem formol para cachos e crespos, com corte incluso', undefined, [['Duração', '90 min'], ['Inclui', 'Corte e finalização']]],
              ['Limpeza de Pele Masculina', 12900, 'Extração, vapor de ozônio e máscara de carvão para pele com barba', undefined, [['Duração', '60 min'], ['Inclui', 'Protetor solar ao final']]],
            ],
          ],
          [
            'Combos',
            [
              ['Combo Noivo', 24900, 'Corte, barba e limpeza de pele na véspera, com brinde no balcão', undefined, [['Duração', '150 min'], ['Inclui', 'Corte + barba + limpeza de pele'], ['Reserva', 'Agende com 30 dias de antecedência']]],
              ['Pai & Filho', 9900, 'Duas cadeiras lado a lado, corte para o pai e para o pequeno', undefined, [['Duração', '70 min'], ['Inclui', 'Dois cortes com finalização']]],
              ['Assinatura Mensal', 19900, 'Quatro cortes no mês com hora garantida na cadeira', undefined, [['Duração', '45 min'], ['Validade', '30 dias a partir do primeiro corte']]],
            ],
          ],
        ],
      },
      {
        nome: 'Esmalteria Lilás',
        slug: 'esmalteria-lilas',
        descricao: 'Mão, pé e unha em gel com hora marcada — alicate esterilizado em autoclave, sempre.',
        taxa: 0,
        tempo: 60,
        categoriaSlug: 'esmalteria',
        // Esmalteria = `soft` na paleta lavanda: o roxo claro é literalmente a
        // identidade da casa (e soft é o default do arquétipo p/ saloes-estetica).
        preset: 'soft',
        palette: 'lavanda',
        banner: fotoModa('1604654894610-df63bc536371', 900, 1200),
        catalogo: [
          [
            'Mãos',
            [
              ['Manicure Tradicional', 3500, 'Cutícula, lixa e esmaltação nas cores da cartela da casa', undefined, [['Duração', '45 min'], ['Inclui', 'Alicate esterilizado em autoclave']]],
              ['Manicure em Gel', 8900, 'Esmaltação em gel curada em cabine LED, sem lascar', undefined, [['Duração', '75 min'], ['Durabilidade', 'Até 21 dias']]],
              ['Alongamento em Fibra de Vidro', 14900, 'Molde, fibra e acabamento natural no formato que você escolher', undefined, [['Duração', '120 min'], ['Manutenção', 'A cada 21 dias']]],
              ['Manutenção de Alongamento', 9900, 'Preenchimento do crescimento, reequilíbrio e nova esmaltação', undefined, [['Duração', '90 min'], ['Ideal', 'Até 25 dias após a aplicação']]],
              ['Nail Art Autoral', 4500, 'Desenho à mão livre, francesinha colorida ou cromado em 4 unhas', undefined, [['Duração', '30 min'], ['Cobertura', '4 unhas · adicionais sob consulta']]],
            ],
          ],
          [
            'Pés',
            [
              ['Pedicure Completa', 4500, 'Escalda-pés de camomila, esfoliação, cutícula, lixa e esmalte', undefined, [['Duração', '60 min'], ['Inclui', 'Escalda-pés e hidratação']]],
              ['Spa dos Pés', 8900, 'Sais de banho, esfoliação de açúcar, máscara e massagem', undefined, [['Duração', '75 min'], ['Inclui', 'Massagem relaxante de 15 min']]],
              ['Podologia Preventiva', 11900, 'Atendimento clínico para calos, unha encravada e fissuras', undefined, [['Duração', '60 min'], ['Profissional', 'Podóloga com registro']]],
            ],
          ],
          [
            'Sobrancelhas & cílios',
            [
              ['Design de Sobrancelha', 3900, 'Mapeamento do rosto feito com linha e pinça, sem cera', undefined, [['Duração', '30 min'], ['Técnica', 'Linha e pinça']]],
              ['Design com Henna', 5500, 'Design mapeado com preenchimento em henna importada', undefined, [['Duração', '45 min'], ['Durabilidade', 'De 8 a 12 dias']]],
              ['Extensão de Cílios Fio a Fio', 16900, 'Aplicação clássica com fios de seda na curvatura à sua escolha', undefined, [['Duração', '120 min'], ['Manutenção', 'A cada 20 dias']]],
              ['Lash Lifting', 12900, 'Curvatura permanente dos cílios naturais com nutrição de queratina', undefined, [['Duração', '70 min'], ['Durabilidade', 'De 6 a 8 semanas']]],
            ],
          ],
        ],
      },
      {
        nome: 'Pele Viva Estética',
        slug: 'pele-viva-estetica',
        descricao: 'Estética facial e corporal com protocolo fechado — avaliação antes, resultado registrado depois.',
        taxa: 0,
        tempo: 75,
        categoriaSlug: 'estetica',
        // `soft` na paleta menta: verde clínico suave, que separa esta casa da
        // esmalteria lavanda sem sair do arquétipo default da categoria.
        preset: 'soft',
        palette: 'menta',
        banner: fotoModa('1540555700478-4be289fbecef', 900, 1200),
        catalogo: [
          [
            'Facial',
            [
              ['Limpeza de Pele Profunda', 15900, 'Vapor de ozônio, extração completa, alta frequência e máscara calmante', undefined, [['Duração', '90 min'], ['Inclui', 'Protetor solar e orientação de home care']]],
              ['Peeling de Diamante', 18900, 'Esfoliação mecânica com ponteira diamantada para textura e poros', undefined, [['Duração', '60 min'], ['Protocolo', '4 sessões quinzenais']]],
              ['Microagulhamento Facial', 34900, 'Indução de colágeno com caneta elétrica e drug delivery de ativos', undefined, [['Duração', '80 min'], ['Pós-sessão', '48h sem sol e sem ácidos']]],
              ['Hidratação Facial Profunda', 12900, 'Ácido hialurônico e vitamina C em máscara de biocelulose', undefined, [['Duração', '50 min'], ['Indicação', 'Pele desidratada e opaca']]],
              ['Revitalização com LED', 9900, 'Fototerapia azul para acne ou vermelha para colágeno', undefined, [['Duração', '40 min'], ['Inclui', 'Higienização e sérum específico']]],
            ],
          ],
          [
            'Corporal',
            [
              ['Drenagem Linfática Manual', 11900, 'Manobras suaves de corpo inteiro para retenção e pós-operatório', undefined, [['Duração', '60 min'], ['Indicação', 'Retenção de líquido e pós-cirúrgico']]],
              ['Massagem Modeladora', 12900, 'Manobras vigorosas com ventosa e creme térmico na região escolhida', undefined, [['Duração', '60 min'], ['Região', 'Abdômen, flancos ou culote']]],
              ['Massagem Relaxante', 10900, 'Óleo morno de lavanda no corpo inteiro, com aromaterapia na sala', undefined, [['Duração', '60 min'], ['Inclui', 'Compressa quente na cervical']]],
              ['Protocolo Detox Corporal', 19900, 'Esfoliação, argila verde, bandagem e drenagem em sequência', undefined, [['Duração', '90 min'], ['Inclui', 'Chá termogênico ao final']]],
            ],
          ],
          [
            'Depilação',
            [
              ['Laser Diodo · Axilas', 8900, 'Sessão avulsa com ponteira resfriada e disparo em pele bronzeada', undefined, [['Duração', '20 min'], ['Protocolo', 'De 8 a 10 sessões']]],
              ['Laser Diodo · Virilha Completa', 15900, 'Sessão avulsa com avaliação de fototipo antes da primeira aplicação', undefined, [['Duração', '30 min'], ['Protocolo', 'De 8 a 10 sessões']]],
              ['Cera Quente · Pernas Inteiras', 7900, 'Cera de mel em bandas com óleo calmante pós-depilação', undefined, [['Duração', '45 min'], ['Inclui', 'Óleo pós-depilação']]],
            ],
          ],
        ],
      },
      {
        nome: 'Sálvia Estúdio de Tatuagem',
        slug: 'salvia-tatuagem',
        descricao: 'Fine line, botânicas e cobertura autoral — sessão fechada, agulha lacrada na sua frente.',
        taxa: 0,
        tempo: 120,
        categoriaSlug: 'tatuagem',
        // Segunda pele `serene` do piso, agora na paleta sálvia (verde seco):
        // mesma vitrine LojaSerena do Ateliê Camélia com identidade oposta — a
        // tese das paletas, igual Café Aroma × Roxa Açaí no piso de alimentação.
        preset: 'serene',
        palette: 'salvia',
        banner: fotoModa('1611501275019-9b5cda994e8d', 900, 1200),
        catalogo: [
          [
            'Sessões',
            [
              ['Fine Line · Peça Pequena', 25000, 'Traço fino em preto e cinza de até 8 cm, com estêncil aprovado antes', undefined, [['Duração', '90 min'], ['Tamanho', 'Até 8 cm'], ['Inclui', 'Estêncil e kit de cicatrização']]],
              ['Sessão Média Autoral', 45000, 'Peça de 8 a 15 cm desenhada sob briefing, em sessão fechada', undefined, [['Duração', '180 min'], ['Tamanho', 'De 8 a 15 cm'], ['Inclui', 'Desenho exclusivo e uma alteração']]],
              ['Diária Fechada', 120000, 'Projeto grande em um dia só, com pausas e almoço no estúdio', undefined, [['Duração', '360 min'], ['Inclui', 'Almoço, pausas e retoque em 60 dias']]],
              ['Flash do Mês', 18000, 'Desenho pronto da cartela do mês, em preto e sem alteração', undefined, [['Duração', '60 min'], ['Cartela', 'Trocada todo dia 1º']]],
            ],
          ],
          [
            'Projetos especiais',
            [
              ['Cobertura de Tatuagem', 60000, 'Cover-up com estudo de saturação por cima da peça antiga', undefined, [['Duração', '240 min'], ['Inclui', 'Consultoria prévia de viabilidade']]],
              ['Blackwork Ornamental', 55000, 'Preenchimento sólido com padrões ornamentais em braço ou perna', undefined, [['Duração', '240 min'], ['Observação', 'Pode exigir segunda sessão']]],
              ['Aquarela Botânica', 48000, 'Folhagens e flores em aquarela, com contorno mínimo', undefined, [['Duração', '200 min'], ['Inclui', 'Prova de cor na pele']]],
              ['Retoque Pós-cicatrização', 8000, 'Ajuste de traço e saturação em peças feitas aqui na casa', undefined, [['Duração', '60 min'], ['Prazo', 'De 60 a 120 dias após a sessão']]],
            ],
          ],
          [
            'Piercing & consulta',
            [
              ['Aplicação de Piercing', 12000, 'Perfuração com agulha estéril e joia inicial de aço cirúrgico', undefined, [['Duração', '30 min'], ['Inclui', 'Joia inicial e guia de higiene']]],
              ['Troca de Joia', 4000, 'Troca da joia inicial por titânio ou ouro depois de cicatrizar', undefined, [['Duração', '20 min'], ['Prazo', 'Após 8 semanas de cicatrização']]],
              ['Consulta de Projeto', 5000, 'Uma hora com o tatuador para fechar referência, tamanho e local', undefined, [['Duração', '60 min'], ['Abatimento', 'Descontado do valor da sessão']]],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Pet',
    secaoSlug: 'pet',
    catalogo: [
      [
        'Para o seu bicho',
        [
          ['Ração do dia a dia 1kg', 2290, 'Fracionada e embalada na loja, sem corante'],
          ['Petisco natural', 1490, 'Desidratado devagar, sem açúcar nem conservante'],
          ['Brinquedo mordedor', 2990, 'Borracha atóxica que aguenta a mordida forte'],
          ['Coleira ajustável', 3490, 'Nylon resistente com fivela de engate rápido'],
        ],
      ],
      [
        'Higiene & cuidado',
        [
          ['Shampoo neutro 500ml', 2790, 'Espuma suave, pH próprio para cães e gatos'],
          ['Tapete higiênico 30un', 5990, 'Alta absorção com gel que neutraliza o odor'],
          ['Areia higiênica 4kg', 2490, 'Grãos finos que empedram e travam o cheiro'],
        ],
      ],
    ],
    lojas: [
      { nome: 'Mundo Pet', slug: 'mundo-pet', descricao: 'Ração, acessórios e petiscos para cães e gatos.', taxa: 0, tempo: 40, categoriaSlug: 'petshop', preset: 'soft' },
      {
        nome: 'Amigo Fiel Pet & Banho',
        slug: 'amigo-fiel-pet',
        descricao: 'Pet shop completo com banho e tosa na hora marcada — ração, farmácia e cuidado no mesmo balcão.',
        taxa: 0,
        tempo: 45,
        categoriaSlug: 'petshop',
        // Pet shop com banho & tosa: soft na paleta menta (verde de tosquia
        // limpa) — o template pet não é de agendamento, então banho entra como
        // PRODUTO comum, com porte e duração nas especificações.
        preset: 'soft',
        palette: 'menta',
        catalogo: [
          [
            'Banho & tosa',
            [
              ['Banho Higiênico · porte médio', 6500, 'Banho com shampoo neutro, secagem na sopradora, corte de unhas e limpeza de ouvido', undefined, [['Porte', 'Médio · 10 a 25 kg'], ['Duração', '1h30 na loja'], ['Inclui', 'Banho · secagem · unhas · ouvido']]],
              ['Banho Simples · porte pequeno', 4500, 'Para cães de até 10 kg: shampoo neutro, secagem e perfume pet sem álcool', undefined, [['Porte', 'Pequeno · até 10 kg'], ['Duração', '1h'], ['Inclui', 'Banho · secagem · colônia']]],
              ['Tosa na Máquina · porte médio', 9000, 'Tosa completa na máquina com acabamento na tesoura, já com banho e secagem', undefined, [['Porte', 'Médio · 10 a 25 kg'], ['Duração', '2h30'], ['Inclui', 'Banho · tosa · acabamento']]],
              ['Tosa Higiênica + Banho · porte pequeno', 7500, 'Aparo de barriga, patas e região íntima com banho completo', undefined, [['Porte', 'Pequeno · até 10 kg'], ['Duração', '1h40'], ['Inclui', 'Banho · tosa higiênica']]],
              ['Hidratação Pós-Banho', 3500, 'Máscara de queratina e óleo de argan aplicada com vapor, para pelo ressecado'],
              ['Banho Medicamentoso Antipulgas', 8500, 'Shampoo com princípio ativo, tempo de contato controlado e pente-fino ao final'],
            ],
          ],
          [
            'Ração & alimentação',
            [
              ['Ração Premium Cães Adultos 15kg', 32900, 'Frango e arroz, 26% de proteína, grão médio para raças a partir de 10 kg'],
              ['Ração Gatos Castrados 3kg', 12900, 'Baixo teor de gordura com L-carnitina, controle de bola de pelo'],
              ['Ração Filhotes Raças Pequenas 1kg', 4990, 'Grão pequeno com DHA e colostro, do desmame aos 12 meses'],
              ['Sachê Cães Sabor Carne 100g', 490, 'Pedaços ao molho, complemento úmido para uma refeição'],
              ['Sachê Gatos Peixe Branco 85g', 450, 'Peixe em geleia, sem corante — ajuda na hidratação diária'],
            ],
          ],
          [
            'Higiene & farmácia',
            [
              ['Antipulgas Cães 10 a 25kg · 3 pipetas', 12900, 'Proteção mensal contra pulgas, carrapatos e piolhos por 3 meses'],
              ['Vermífugo Cães · 4 comprimidos', 4590, 'Dose única para verminose comum, palatável sabor carne'],
              ['Areia Higiênica Sílica 1,6kg', 3990, 'Cristais que secam a urina e seguram o odor por até 30 dias'],
              ['Tapete Higiênico 30un', 5990, '60 × 60 cm com gel superabsorvente e atrativo canino'],
              ['Shampoo Neutro Filhotes 500ml', 3490, 'Fórmula sem lágrimas, pH 7 e enxágue fácil'],
            ],
          ],
          [
            'Conforto & brinquedos',
            [
              ['Caminha Iglu Fleece M', 13900, 'Toca fechada em fleece com base antiderrapante, lavável na máquina'],
              ['Arranhador Torre para Gatos', 18900, 'Três níveis em sisal natural com nicho e bolinha pendurada'],
              ['Mordedor de Borracha Recheável', 3490, 'Borracha maciça para rechear com petisco — entretém por horas'],
              ['Coleira Peitoral Antipuxão M', 8990, 'Acolchoada no peito, com faixa refletiva e engate duplo'],
            ],
          ],
        ],
      },
      {
        nome: 'Casa da Ração São Bento',
        slug: 'casa-racao-sao-bento',
        descricao: 'Ração a granel pesada na hora, sacaria fechada e petisco natural. A casa de ração do bairro São Bento.',
        taxa: 590,
        tempo: 55,
        categoriaSlug: 'racoes',
        // Casa de ração de bairro: playful na paleta sol (âmbar de sacaria e
        // grão) — varejo popular, preço por quilo em destaque.
        preset: 'playful',
        palette: 'sol',
        catalogo: [
          [
            'Granel por quilo',
            [
              ['Ração Premium Cães Adultos · 1kg', 1890, 'Frango e cereais integrais, 26% de proteína, pesada e embalada na hora'],
              ['Ração Super Premium Cães · 1kg', 2790, 'Carne desossada, sem corante, com probiótico para digestão'],
              ['Ração Gatos Adultos · 1kg', 2290, 'Peixe e frango com taurina, grão pequeno para mastigação felina'],
              ['Ração Filhotes · 1kg', 2490, 'Grão macio com leite e DHA, do desmame aos 12 meses'],
              ['Milho Triturado para Aves · 1kg', 890, 'Milho limpo e triturado fino, para galinha caipira e codorna'],
            ],
          ],
          [
            'Sacarias fechadas',
            [
              ['Ração Cães Adultos 25kg', 21900, 'Saco lacrado de fábrica, o melhor custo por quilo da casa'],
              ['Ração Cães Filhotes 15kg', 16900, 'Grão pequeno com cálcio e fósforo balanceados para crescimento'],
              ['Ração Gatos Castrados 10,1kg', 18900, 'Controle de peso e de urina, com fibras e L-carnitina'],
              ['Ração Raças Pequenas 10,1kg', 19900, 'Grão mini com ação antitártaro, para cães de até 10 kg'],
            ],
          ],
          [
            'Petiscos naturais',
            [
              ['Bifinho de Frango 500g granel', 2490, 'Filé desidratado sem sal, cortado em tiras finas'],
              ['Orelha Bovina Desidratada · un', 690, 'Secagem lenta, sem tempero — dura a tarde toda'],
              ['Osso de Nó Bovino Médio', 1490, 'Osso natural defumado, para cães acima de 10 kg'],
              ['Snack Dental 7un', 1990, 'Um por dia, com textura que raspa a placa dos dentes'],
            ],
          ],
          [
            'Do dia a dia',
            [
              ['Areia Higiênica Grãos Finos 4kg', 2790, 'Argila que empedra rápido e facilita a peneirada'],
              ['Comedouro Inox Duplo com Suporte', 4990, 'Tigelas removíveis em inox e base de madeira com pés de borracha'],
              ['Pote Hermético para Ração 10kg', 6990, 'Trava a umidade e o cheiro, com pá dosadora inclusa'],
            ],
          ],
        ],
      },
      {
        nome: 'Vira-Lata Chique',
        slug: 'vira-lata-chique',
        descricao: 'Boutique pet de rua — roupinha sob medida, coleira de couro com plaquinha gravada e mimo de aniversário.',
        taxa: 790,
        tempo: 40,
        categoriaSlug: 'petboutique',
        // Boutique pet: playful na paleta chiclete (rosa de vitrine) — o
        // catálogo é de moda, então as fotos de seed já bastam para o grid.
        preset: 'playful',
        palette: 'chiclete',
        catalogo: [
          [
            'Roupinhas',
            [
              ['Moletom Listrado Pet · P', 6990, 'Algodão flanelado por dentro, com abertura para a guia nas costas'],
              ['Capa de Chuva Impermeável · M', 8990, 'Nylon revestido com capuz e faixa refletiva, cobre até a cauda'],
              ['Vestido Xadrez Cereja · P', 7490, 'Tricoline xadrez com saia rodada e laço removível'],
              ['Pijama Nuvem Soft · M', 6490, 'Malha soft de manga longa, para as noites frias do inverno mineiro'],
              ['Camiseta Time do Coração · G', 5990, 'Malha respirável com número nas costas, corte largo no peito'],
            ],
          ],
          [
            'Coleiras & guias',
            [
              ['Coleira de Couro com Placa Gravada', 9990, 'Couro curtido ao vegetal, fivela dourada e plaquinha com nome e telefone'],
              ['Peitoral Acolchoado Neon · M', 11990, 'Regulagem em quatro pontos, com alça de segurança nas costas'],
              ['Guia Retrátil 5m até 20kg', 8990, 'Fita de nylon com trava de uma mão e cabo emborrachado'],
              ['Coleira de Gato com Guizo', 3490, 'Fecho de segurança que solta sozinho se prender em algum lugar'],
            ],
          ],
          [
            'Caminhas & transporte',
            [
              ['Caminha Suspensa Aveludada M', 19900, 'Estrutura de madeira com colchonete de veludo removível'],
              ['Bolsa de Transporte Aérea P', 24900, 'Aprovada para cabine, com tela dos dois lados e fundo rígido'],
              ['Caixa de Transporte n.2', 13900, 'Plástico rígido com trava dupla e alça — cães de até 12 kg'],
              ['Cobertor Plush Chiclete', 5990, 'Manta dupla face 80 × 60 cm que não solta pelo'],
            ],
          ],
          [
            'Mimos & festa',
            [
              ['Bolo de Aniversário Pet 300g', 4990, 'Massa de batata-doce com cobertura de iogurte natural, sem açúcar'],
              ['Kit Bandana + Chapéu de Festa', 3990, 'Algodão estampado com elástico macio, tamanho único'],
              ['Colônia Pet Sem Álcool 120ml', 4290, 'Perfume leve de baunilha que dura o dia sem irritar a pele'],
            ],
          ],
        ],
      },
      {
        nome: 'Aquário Água Viva',
        slug: 'aquario-agua-viva',
        descricao: 'Aquarismo de verdade — montagem de plantados, filtragem certa e teste de água na bancada da loja.',
        taxa: 1290,
        tempo: 60,
        categoriaSlug: 'aquarismo',
        // Aquarismo: soft na paleta lavanda — o violeta-azulado do LED de
        // aquário plantado, com o catálogo técnico em fichas.
        preset: 'soft',
        palette: 'lavanda',
        catalogo: [
          [
            'Aquários & kits',
            [
              ['Aquário de Vidro 30L com Tampa', 26900, 'Vidro colado em silicone neutro, tampa com passagem para mangueira', undefined, [['Volume', '30 litros'], ['Medidas', '40 × 25 × 30 cm'], ['Vidro', '5 mm temperado']]],
              ['Aquário Plantado 60L Completo', 74900, 'Já sai da loja com filtro, luminária LED e substrato fértil montados', undefined, [['Volume', '60 litros'], ['Medidas', '60 × 30 × 35 cm'], ['Inclui', 'Filtro · LED · substrato']]],
              ['Kit Betteira 8L com Iluminação', 12900, 'Cuba curva com LED embutido e tampa vazada — ideal para um betta'],
              ['Aquário Redondo 12L', 8990, 'Vidro moldado sem emenda, com base de apoio antiderrapante'],
            ],
          ],
          [
            'Filtragem & equipamentos',
            [
              ['Filtro Hang On 300L/h', 8990, 'Pendura na borda, com cesto para mídia e vazão regulável'],
              ['Termostato com Controlador 100W', 6990, 'Aquece até 60 L, desliga sozinho ao chegar na temperatura'],
              ['Bomba de Ar Dupla Saída', 4990, 'Silenciosa, com registro individual para cada mangueira'],
              ['Mídia Biológica Cerâmica 500g', 2990, 'Canudos porosos que abrigam a colônia de bactérias do filtro'],
              ['Sifão Manual com Mangueira 1,5m', 2490, 'Aspira o resíduo do fundo na troca parcial de água'],
            ],
          ],
          [
            'Substrato & paisagismo',
            [
              ['Substrato Fértil para Plantados 5kg', 8990, 'Argila nutritiva que segura raiz e libera nutriente aos poucos'],
              ['Cascalho Natural Bege 3kg', 2790, 'Grão arredondado lavado, não altera o pH da água'],
              ['Tronco de Mopani Médio', 5990, 'Madeira densa que afunda sozinha, deixa a água levemente âmbar'],
              ['Anúbias Nana em Tronco', 4490, 'Planta rústica já fixada, cresce devagar e aguenta pouca luz'],
              ['Musgo de Java em Porção', 2990, 'Porção para amarrar em tronco ou pedra — abrigo de alevinos'],
            ],
          ],
          [
            'Alimentos & tratamento',
            [
              ['Ração em Flocos Peixes Tropicais 50g', 1990, 'Flocos que boiam por minutos, sem sujar tanto a água'],
              ['Ração para Betta em Grânulos 10g', 1490, 'Grânulo pequeno rico em proteína, realça a cor da cauda'],
              ['Condicionador de Água Anticloro 100ml', 2490, 'Neutraliza cloro e cloramina na hora da troca — rende 400 L'],
              ['Kit Teste de pH e Amônia', 5990, 'Reagentes líquidos com tabela de cor, cerca de 60 leituras'],
            ],
          ],
        ],
      },
      {
        nome: 'Ninho & Cia',
        slug: 'ninho-e-cia',
        descricao: 'Aves e pequenos animais — mistura de sementes selecionada, gaiola de criação e viveiro sob encomenda.',
        taxa: 690,
        tempo: 50,
        categoriaSlug: 'aves',
        // Aves e roedores: playful na paleta sol (amarelo de alpiste e milho),
        // a mesma família da casa de ração, mas com catálogo bem distinto.
        preset: 'playful',
        palette: 'sol',
        catalogo: [
          [
            'Alimentação de aves',
            [
              ['Mistura para Calopsitas 500g', 1890, 'Painço, girassol sem casca, aveia e alpiste — sem corante'],
              ['Alpiste Selecionado 1kg', 2290, 'Grão limpo e peneirado, base da dieta de canário e periquito'],
              ['Farinhada de Ovos para Canários 300g', 2490, 'Complemento úmido do período de muda e de criação'],
              ['Ração Extrusada para Papagaios 500g', 4990, 'Pellet colorido com vitamina A, evita a escolha só do girassol'],
              ['Bloco de Cálcio com Iodo', 890, 'Prende na grade da gaiola, desgasta o bico e repõe mineral'],
            ],
          ],
          [
            'Roedores & pequenos',
            [
              ['Ração para Hamster 500g', 1690, 'Mix de sementes, milho floculado e pellet, sem excesso de gordura'],
              ['Feno de Tifton para Coelhos 1kg', 2990, 'Corte alto e verde, fibra longa que mantém o dente no tamanho'],
              ['Mistura para Porquinho-da-índia 800g', 3290, 'Com vitamina C estabilizada, que o porquinho não produz sozinho'],
              ['Substrato de Serragem Prensada 2kg', 1990, 'Absorve umidade e segura o cheiro — sem pó de pinho'],
            ],
          ],
          [
            'Gaiolas & viveiros',
            [
              ['Gaiola para Calopsita 60cm', 24900, 'Grade horizontal para escalar, bandeja removível e dois poleiros'],
              ['Viveiro de Chão 1,20m para Casal', 58900, 'Estrutura galvanizada com porta dupla e rodízios com trava'],
              ['Gaiola de Criação com Divisória', 18900, 'Divisória removível para separar o casal na hora certa'],
              ['Caixa de Transporte para Aves P', 4990, 'Ventilada dos dois lados, com poleiro fixo e trava de segurança'],
            ],
          ],
          [
            'Acessórios & manejo',
            [
              ['Poleiro Natural de Eucalipto · 3un', 2490, 'Diâmetros diferentes, exercitam a pata e evitam calo'],
              ['Comedouro Antidesperdício Externo', 1890, 'Encaixa na porta e prende a casca dentro do pote'],
              ['Ninho de Madeira para Calopsita', 5990, 'Pinus com tampa de inspeção e degrau interno para a fêmea'],
              ['Brinquedo Escalada de Corda', 2790, 'Sisal natural com argolas de madeira sem verniz'],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Casa & Vida',
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
      {
        nome: 'Casa & Conforto',
        slug: 'casa-conforto',
        descricao: 'Não é só mobília. É arquitetura tátil para a sua casa.',
        taxa: 0,
        tempo: 60,
        categoriaSlug: 'casa',
        // Loja-demo da vitrine artesã (Graft): peças autorais com ficha
        // técnica e fotos reais (ver LojaArtesa.tsx).
        preset: 'artisan',
        logo: LOGO_CASA_CONFORTO,
        banner: fotoModa('1618220179428-22790b461013', 900, 1200),
        catalogo: [
          [
            'Peças autorais',
            [
              ['Sofá Caramelo', 449900, 'Couro natural sobre madeira maciça', fotoModa('1540574163026-643ea20ade25'), [['Dimensões', 'L 220 × P 90 × A 78 cm'], ['Estrutura', 'Eucalipto maciço'], ['Acabamento', 'Couro caramelo natural']]],
              ['Poltrona Mostarda', 189900, 'Veludo mostarda de linhas retas', fotoModa('1586023492125-27b2c045efd7'), [['Dimensões', 'L 74 × P 80 × A 86 cm'], ['Revestimento', 'Veludo algodão'], ['Pés', 'Madeira tauari']]],
              ['Sofá Esmeralda', 389900, 'Veludo profundo de três lugares', fotoModa('1555041469-a586c61ea9bc'), [['Dimensões', 'L 210 × P 88 × A 80 cm'], ['Revestimento', 'Veludo esmeralda'], ['Espuma', 'D-33 soft']]],
              ['Poltrona Ocre', 149900, 'Capitonê baixo de um lugar', fotoModa('1616627547584-bf28cee262db'), [['Dimensões', 'L 66 × P 74 × A 72 cm'], ['Revestimento', 'Linho ocre'], ['Acabamento', 'Capitonê artesanal']]],
              ['Sala Terracota', 529900, 'Seccional de couro para a família', fotoModa('1616047006789-b7af5afb8c20'), [['Dimensões', 'L 260 × P 160 × A 76 cm'], ['Revestimento', 'Couro terracota'], ['Módulos', 'Chaise + 3 lugares']]],
              ['Poltrona Nuvem', 129900, 'Curvas macias em bouclé claro', fotoModa('1567538096630-e0c55bd6374c'), [['Dimensões', 'L 68 × P 70 × A 75 cm'], ['Revestimento', 'Bouclé cru'], ['Pés', 'Torneados brancos']]],
            ],
          ],
          [
            'Para a casa',
            [
              ['Mesa Aro', 89900, 'Tampo redondo com luminária de arco', fotoModa('1519710164239-da123dc03ef4')],
              ['Banco Nórdico', 39900, 'Madeira clara de traço escandinavo', fotoModa('1503602642458-232111445657')],
              ['Luminária Fuso', 49900, 'Piso articulada em aço grafite', fotoModa('1507473885765-e6ed057f782c')],
              ['Pendente Sino', 34900, 'Cúpula esmaltada suspensa', fotoModa('1513506003901-1e6a229e2d15')],
              ['Sala Galeria', 259900, 'Composição com parede-galeria', fotoModa('1615873968403-89e068629265')],
              ['Estar Clássico', 219900, 'Conjunto neutro atemporal', fotoModa('1616486338812-3dadae4b4ace')],
            ],
          ],
        ],
      },
      { nome: 'Utilidades Lar', slug: 'utilidades-lar', descricao: 'Tudo para a cozinha e organização da casa.', taxa: 390, tempo: 45, categoriaSlug: 'casa', preset: 'editorial' },
      {
        nome: 'Jardim & Flor',
        slug: 'jardim-flor',
        descricao: 'Não vendemos plantas. Cultivamos pequenos jardins para dentro de casa.',
        taxa: 690,
        tempo: 50,
        categoriaSlug: 'flores',
        // Floricultura: vitrine artesã com viveiro real e fichas de cultivo.
        preset: 'artisan',
        banner: fotoModa('1497250681960-ef046c08a56e', 900, 1200),
        catalogo: [
          [
            'Viveiro da casa',
            [
              ['Suculenta Menta', 4990, 'Em vaso de cerâmica esmaltada', fotoModa('1485955900006-10f4d324d411'), [['Vaso', 'Cerâmica esmaltada 12 cm'], ['Luz', 'Sol pleno da manhã'], ['Rega', '1x por semana']]],
              ['Kit Cultivo', 8990, 'Pá, substrato e adubo orgânico', fotoModa('1416879595882-3373a0480b5b'), [['Conteúdo', 'Pá · substrato 2L · adubo'], ['Uso', 'Vasos e canteiros'], ['Origem', 'Orgânico certificado']]],
              ['Mudas da Estação', 3490, 'Bandeja com 12 mudas de temperos', fotoModa('1466692476868-aef1dfb1e735'), [['Bandeja', '12 células biodegradáveis'], ['Espécies', 'Manjericão · salsa · tomilho'], ['Transplante', 'Em 3 semanas']]],
            ],
          ],
        ],
      },
      { nome: 'TechPoint', slug: 'techpoint', descricao: 'Smartphones, tablets e gadgets com garantia oficial.', taxa: 0, tempo: 55, categoriaSlug: 'eletronicos', preset: 'tech' },
      { nome: 'GameZone', slug: 'gamezone', descricao: 'Consoles, jogos e periféricos gamer.', taxa: 690, tempo: 50, categoriaSlug: 'games', preset: 'raw' },
      { nome: 'InfoStore DV', slug: 'infostore-dv', descricao: 'Notebooks, PCs e componentes de informática.', taxa: 0, tempo: 60, categoriaSlug: 'informatica', preset: 'tech' },
      { nome: 'Som & Imagem', slug: 'som-imagem', descricao: 'TVs, soundbars e áudio de alta fidelidade.', taxa: 990, tempo: 70, categoriaSlug: 'eletronicos', preset: 'noir' },
      { nome: 'Mobile Acessórios', slug: 'mobile-acessorios', descricao: 'Capas, películas e carregadores para todo modelo.', taxa: 390, tempo: 35, categoriaSlug: 'acessorios', preset: 'tech' },
      {
        nome: 'Depósito Itapecerica',
        slug: 'deposito-itapecerica',
        descricao: 'Cimento, areia e tijolo com entrega de caminhão em toda Divinópolis. Do saco avulso ao milheiro.',
        taxa: 1990,
        tempo: 120,
        categoriaSlug: 'construcao',
        // Depósito de obra: market na paleta atacado (claro, azul de orçamento) —
        // preço por saco, m³ e milheiro pede lista sóbria, não vitrine.
        preset: 'market',
        palette: 'atacado',
        catalogo: [
          [
            'Cimento & argamassa',
            [
              ['Cimento CP-II 50kg', 4290, 'Saco de 50 kg · uso geral em concreto, assentamento e reboco'],
              ['Argamassa AC-II 20kg', 1890, 'Saco de 20 kg · assenta porcelanato em área interna e externa'],
              ['Cal Hidratada CH-III 20kg', 1450, 'Saco de 20 kg · rende mais na massa de reboco'],
              ['Rejunte Flexível 5kg', 2290, 'Saco de 5 kg · juntas de até 6 mm · 14 cores no estoque'],
              ['Massa Única Pronta 30kg', 2690, 'Saco de 30 kg · emboço e reboco em uma demão só'],
            ],
          ],
          [
            'Alvenaria & estrutura',
            [
              ['Tijolo Baiano 8 Furos · milheiro', 119000, 'Milheiro 9×19×19 cm · queima uniforme · descarregado na obra'],
              ['Tijolo Maciço · milheiro', 149000, 'Milheiro 5×10×20 cm · churrasqueira, fornalha e parede aparente'],
              ['Bloco de Concreto 14×19×39', 390, 'Unidade estrutural classe B · vedação e alvenaria aparente'],
              ['Laje Treliçada H8 · m²', 5490, 'Vigota treliçada e lajota de EPS · vão livre de até 4 m'],
              ['Vergalhão CA-50 8mm · barra 12m', 4890, 'Barra de 12 m · aço nervurado para pilar, viga e cinta'],
            ],
          ],
          [
            'Areia, brita & telhas',
            [
              ['Areia Média Lavada · m³', 12900, 'Metro cúbico peneirado · reboco, contrapiso e assentamento'],
              ['Brita 1 · m³', 14500, 'Metro cúbico · concreto estrutural, calçada e dreno'],
              ['Saco de Areia 20kg', 990, 'Saco fechado · reparo pequeno sem sujar o quintal'],
              ['Telha Cerâmica Portuguesa · cento', 24900, 'Cento em natural · 16 peças por m² de telhado'],
              ['Telha de Fibrocimento 2,44×1,10m', 4990, 'Chapa de 6 mm · cobertura de garagem e área de serviço'],
            ],
          ],
        ],
      },
      {
        nome: 'Ferragens Cruzeiro',
        slug: 'ferragens-cruzeiro',
        descricao: 'Ferramenta profissional, parafuso a granel e chave que não espana. Balcão aberto desde 1994.',
        taxa: 890,
        tempo: 60,
        categoriaSlug: 'ferramentas',
        // Ferragem clássica: utility na paleta oficina (grafite com vermelho de
        // caixa de ferramenta) — o arquétipo default da categoria.
        preset: 'utility',
        palette: 'oficina',
        banner: fotoModa('1504148455328-c376907d081c', 900, 1200),
        catalogo: [
          [
            'Ferramentas elétricas',
            [
              ['Furadeira de Impacto 800W', 34900, 'Mandril de 1/2" · reversível · maleta com 10 brocas'],
              ['Parafusadeira 12V Bateria Dupla', 29900, 'Duas baterias de lítio · 25 níveis de torque · carregador rápido'],
              ['Esmerilhadeira 4.1/2" 850W', 25900, '11.000 rpm · protetor de disco regulável sem chave'],
              ['Serra Circular 7.1/4" 1400W', 45900, 'Corte de até 65 mm · base de alumínio com guia paralela'],
              ['Lixadeira Orbital 1/4 de Folha', 19900, 'Base de 110×100 mm · saco coletor de pó acoplado'],
            ],
          ],
          [
            'Chaves & manuais',
            [
              ['Jogo de Chaves Combinadas 12pç', 12900, 'De 8 a 22 mm · aço cromo-vanádio · estojo de lona'],
              ['Jogo de Chave de Fenda e Philips 6pç', 4590, 'Cabo emborrachado · ponta imantada'],
              ['Alicate Universal 8" Isolado', 4990, 'Isolação até 1.000V · corta arame recozido'],
              ['Martelo Unha 27mm Cabo de Fibra', 3990, 'Cabeça forjada · cabo antivibração'],
              ['Trena 5m com Trava Automática', 2290, 'Fita de 19 mm · clipe de cinto e ímã na ponta'],
              ['Nível de Alumínio 60cm', 3490, 'Três bolhas · base usinada para não bambear'],
            ],
          ],
          [
            'Fixação & ferragens',
            [
              ['Parafuso com Bucha 8mm · 100un', 2490, 'Caixa com 100 conjuntos · furo em tijolo e concreto'],
              ['Disco de Corte 4.1/2" · 10un', 3490, 'Pacote com 10 · corte fino em metalon e inox'],
              ['Cadeado de Latão 40mm', 2790, 'Haste cromada · três chaves por cadeado'],
              ['Dobradiça de Porta 3" · par', 1990, 'Par em aço inox com pino solto · parafusos inclusos'],
              ['Fita Isolante Antichama 20m', 890, 'Rolo de 19 mm · isolamento até 750V'],
            ],
          ],
        ],
      },
      {
        nome: 'Tintas Aurora',
        slug: 'tintas-aurora',
        descricao: 'Máquina de tingir com 1.500 cores na hora, mais rolo, trincha e o palpite de quem pinta há 20 anos.',
        taxa: 990,
        tempo: 70,
        categoriaSlug: 'tintas',
        // Casa de tintas: market na paleta feira (fundo claro, laranja) — a cor do
        // produto só aparece sobre fundo branco, então nada de pele escura aqui.
        preset: 'market',
        palette: 'feira',
        catalogo: [
          [
            'Parede & teto',
            [
              ['Tinta Acrílica Fosca Branca 18L', 24900, 'Lata de 18L · rende até 300 m² por demão · interna e externa'],
              ['Acrílica Premium Lavável 18L', 36900, 'Lata de 18L · aguenta 10.000 ciclos de limpeza · cor tingida na hora'],
              ['Acrílica Semibrilho 3,6L', 9900, 'Galão de 3,6L · cozinha e banheiro · seca ao toque em 4 horas'],
              ['Massa Corrida PVA 18L', 8900, 'Lata de 18L · nivela parede interna antes da pintura'],
              ['Selador Acrílico 18L', 11900, 'Lata de 18L · uniformiza a absorção do reboco novo'],
              ['Textura Rústica 25kg', 13900, 'Balde de 25 kg · efeito riscado em fachada e muro'],
            ],
          ],
          [
            'Esmaltes & vernizes',
            [
              ['Esmalte Sintético Brilhante 900ml', 6490, 'Lata de 900 ml · madeira e metal · base água, sem cheiro forte'],
              ['Verniz Marítimo Brilhante 900ml', 7290, 'Lata de 900 ml · proteção UV para porta e portão de madeira'],
              ['Tinta Epóxi para Piso 3,6L', 18900, 'Galão de 3,6L · garagem e área de alto tráfego'],
              ['Fundo Anticorrosivo Zarcão 900ml', 5490, 'Lata de 900 ml · base para portão, grade e estrutura de ferro'],
            ],
          ],
          [
            'Rolo, trincha & preparo',
            [
              ['Rolo de Lã 23cm com Cabo', 3490, 'Lã sintética antigota · cabo rosqueável de 30 cm'],
              ['Trincha 2" Cerdas Cinza', 1490, 'Cabo de madeira · para canto, rodapé e recorte'],
              ['Fita Crepe 48mm × 50m', 1890, 'Rolo de 50 m · desenha o recorte sem borrar o teto'],
              ['Bandeja Plástica para Rolo', 1290, 'Encaixa rolo de até 23 cm · lava e reusa'],
              ['Lona Plástica 4×5m', 2990, 'Espessura de 100 micras · protege móvel e piso'],
            ],
          ],
        ],
      },
      {
        nome: 'Autopeças Oeste',
        slug: 'autopecas-oeste',
        descricao: 'Peça de linha leve com aplicação conferida pela placa — óleo, filtro, freio e bateria no mesmo balcão.',
        taxa: 690,
        tempo: 50,
        categoriaSlug: 'autopecas',
        // Autopeças: utility na paleta elétrico (grafite com ciano de painel), que
        // separa a loja do vermelho da ferragem no mesmo piso.
        preset: 'utility',
        palette: 'eletrico',
        catalogo: [
          [
            'Óleo & filtros',
            [
              ['Óleo Sintético 5W30 · 1L', 4990, 'Frasco de 1L · API SP · motor flex com injeção direta'],
              ['Kit Troca 5W30 · 4L + filtro', 21900, 'Quatro litros de sintético mais o filtro de óleo do seu modelo'],
              ['Filtro de Óleo Blindado', 3490, 'Rosca metálica com válvula antirretorno'],
              ['Filtro de Ar do Motor', 4590, 'Elemento plissado · troca a cada 10.000 km'],
              ['Filtro de Combustível em Linha', 3990, 'Para flex · retém borra e água do tanque'],
              ['Aditivo de Radiador Pronto Uso 1L', 2990, 'Orgânico rosa · já vem diluído, é só completar'],
            ],
          ],
          [
            'Elétrica & partida',
            [
              ['Bateria 60Ah Selada', 45900, '18 meses de garantia · livre de manutenção · levamos a velha'],
              ['Palheta de Limpador 24" · unidade', 3990, 'Silicone com trava universal · encaixe gancho ou baioneta'],
              ['Jogo de Velas de Ignição 4un', 8990, 'Eletrodo de níquel · para motor 1.0 e 1.6 flex'],
              ['Lâmpada H4 Super Branca · par', 3990, 'Par de 55/60W · luz de 4.200K, aparência branca'],
              ['Kit Correia Dentada com Tensor', 15900, 'Correia mais rolamento tensor · troca aos 60.000 km'],
            ],
          ],
          [
            'Freio & suspensão',
            [
              ['Jogo de Pastilhas Dianteiras', 12900, 'Quatro pastilhas cerâmicas · pouca poeira na roda'],
              ['Par de Discos Ventilados 256mm', 29900, 'Par dianteiro · ferro fundido usinado'],
              ['Amortecedor Dianteiro · unidade', 21900, 'Pressurizado a gás · vendido por unidade'],
              ['Kit Bieleta e Pivô', 8900, 'Par de bieletas mais o pivô da suspensão dianteira'],
              ['Fluido de Freio DOT 4 · 500ml', 2790, 'Frasco de 500 ml · ponto de ebulição de 230 °C'],
            ],
          ],
        ],
      },
      {
        nome: 'Garagem 37',
        slug: 'garagem-37',
        descricao: 'Som, multimídia e acessório instalado no mesmo dia — com box próprio e teste de bancada antes de sair.',
        taxa: 1290,
        tempo: 90,
        categoriaSlug: 'automotivo',
        // Som automotivo: noir na paleta prata (preto com aço) — a alternativa
        // premium de automotivo e o contraponto escuro da autopeças.
        preset: 'noir',
        palette: 'prata',
        catalogo: [
          [
            'Som & multimídia',
            [
              ['Multimídia 2 DIN 7" Android', 89900, 'Tela de 7" · espelhamento sem fio · câmera de ré inclusa e instalada'],
              ['Par de Alto-falantes 6" 120W', 24900, 'Par coaxial · encaixe original das portas dianteiras'],
              ['Módulo Amplificador 400W RMS', 39900, 'Quatro canais · acompanha cabo e fusível de linha'],
              ['Subwoofer 12" 300W RMS', 44900, 'Bobina dupla · projetado para caixa selada de 40 litros'],
              ['Kit de Instalação 4mm²', 12900, 'Cabo de 4 mm², fusível, RCA e terminais para o módulo'],
            ],
          ],
          [
            'Dentro do carro',
            [
              ['Jogo de Tapetes PVC 5pç', 12900, 'Cinco peças universais · borda alta que segura água e barro'],
              ['Capa de Banco em Couro Sintético', 29900, 'Jogo completo · costura reforçada · encaixe com apoio de cabeça'],
              ['Suporte Magnético de Celular', 4990, 'Ímã de neodímio · prende na saída de ar sem balançar'],
              ['Carregador Veicular 30W USB-C', 5990, 'Duas saídas · carga rápida do celular na estrada'],
            ],
          ],
          [
            'Estética & proteção',
            [
              ['Película Automotiva G20 Instalada', 39900, 'Cinco vidros · nanocerâmica com garantia de 5 anos'],
              ['Cera de Carnaúba 200g', 4990, 'Pote de 200 g · brilho molhado que dura cerca de 3 meses'],
              ['Kit de Lavagem Completo', 8990, 'Shampoo de 500 ml, pretinho, flanela de microfibra e luva'],
              ['Jogo de Calotas Aro 14', 15900, 'Quatro peças · encaixe travado em aro de aço'],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Mercado',
    secaoSlug: 'mercado',
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
      { nome: 'Mercado Central DV', slug: 'mercado-central', descricao: 'Hortifruti, mercearia e açougue. Tudo num lugar só.', taxa: 0, tempo: 40, categoriaSlug: 'mercado', preset: 'market' },
      { nome: 'Hortifruti Viçoso', slug: 'hortifruti-vicoso', descricao: 'Frutas, legumes e verduras fresquinhos todo dia.', taxa: 390, tempo: 30, categoriaSlug: 'mercado', preset: 'market' },
      { nome: 'Empório Natural', slug: 'emporio-natural', descricao: 'Produtos naturais, granéis e orgânicos.', taxa: 590, tempo: 35, categoriaSlug: 'mercado', preset: 'artisan' },
    ],
  },
  {
    piso: 'Serviços',
    secaoSlug: 'servicos',
    catalogo: [
      [
        'Agende agora',
        [
          ['Visita técnica', 9900, 'Diagnóstico no local com orçamento fechado antes de começar', undefined, [['Duração', '45 min'], ['Local', 'A domicílio']]],
          ['Manutenção preventiva', 15900, 'Checklist completo para o equipamento não parar na hora errada', undefined, [['Duração', '60 min'], ['Local', 'No estabelecimento']]],
          ['Instalação padrão', 19900, 'Montagem, teste de funcionamento e orientação de uso na entrega', undefined, [['Duração', '90 min'], ['Garantia', '90 dias na mão de obra']]],
          ['Orçamento presencial', 4900, 'Visita para medir, avaliar e fechar o escopo do trabalho', undefined, [['Duração', '30 min'], ['Abate', 'Valor abatido no serviço']]],
        ],
      ],
      [
        'Aulas e pacotes',
        [
          ['Aula experimental', 4900, 'Primeira aula com nivelamento e devolutiva por escrito no fim', undefined, [['Duração', '60 min'], ['Turma', 'Até 6 alunos']]],
          ['Pacote mensal', 32900, 'Quatro encontros no mês, com material digital incluso', undefined, [['Duração', '60 min'], ['Frequência', '1 encontro por semana']]],
          ['Plantão emergencial', 22900, 'Atendimento fora do horário comercial, com chegada rápida', undefined, [['Duração', '60 min'], ['Horário', 'Noites, domingos e feriados']]],
        ],
      ],
    ],
    lojas: [
      { nome: 'iFix Assistência', slug: 'ifix-assistencia', descricao: 'Conserto de celulares e venda de peças originais.', taxa: 0, tempo: 45, categoriaSlug: 'servicos', preset: 'utility' },
      {
        nome: 'Mecânica Beira-Rio',
        slug: 'mecanica-beira-rio',
        descricao: 'Elevador, scanner e conversa reta — orçamento fechado antes de girar a chave.',
        taxa: 0,
        tempo: 120,
        categoriaSlug: 'oficina',
        // Oficina de bairro: utility na paleta 'oficina' (grafite + amarelo de
        // sinalização). Todo item é agendável — o PDP de serviços lê a duração.
        preset: 'utility',
        palette: 'oficina',
        banner: fotoModa('1487754180451-c456f719a1fc', 900, 1200),
        catalogo: [
          [
            'Revisão & motor',
            [
              ['Troca de Óleo e Filtro', 18900, 'Óleo sintético 5W30, filtro novo e conferência de todos os níveis', undefined, [['Duração', '40 min'], ['Inclui', 'Óleo 4L + filtro de óleo'], ['Local', 'Na oficina']]],
              ['Revisão Completa 30 mil km', 49900, 'Motor, freios, suspensão e fluidos conferidos item a item no elevador', undefined, [['Duração', '120 min'], ['Checklist', '42 pontos'], ['Entrega', 'Relatório com fotos']]],
              ['Diagnóstico Eletrônico', 12900, 'Leitura dos códigos de falha no scanner e teste de sensores em tempo real', undefined, [['Duração', '45 min'], ['Equipamento', 'Scanner OBD-II'], ['Abate', 'Valor abatido no reparo']]],
              ['Troca de Correia Dentada', 89900, 'Correia, tensor e rolamentos novos com o sincronismo conferido no ponto', undefined, [['Duração', '240 min'], ['Peças', 'Kit correia + tensor'], ['Garantia', '1 ano ou 20 mil km']]],
            ],
          ],
          [
            'Freios & suspensão',
            [
              ['Troca de Pastilhas Dianteiras', 24900, 'Pastilhas novas, limpeza das pinças e sangria do sistema conferida', undefined, [['Duração', '60 min'], ['Peças', 'Par de pastilhas'], ['Garantia', '6 meses']]],
              ['Alinhamento e Balanceamento', 13900, 'Alinhamento 3D das quatro rodas e balanceamento com contrapesos novos', undefined, [['Duração', '50 min'], ['Equipamento', 'Alinhador 3D'], ['Inclui', 'Calibragem dos 4 pneus']]],
              ['Revisão de Suspensão', 19900, 'Amortecedores, batentes e bandejas avaliados no elevador e na rua', undefined, [['Duração', '75 min'], ['Inclui', 'Teste de rua de 5 km'], ['Local', 'Na oficina']]],
            ],
          ],
          [
            'Socorro & pré-viagem',
            [
              ['Check-up Pré-Viagem', 8900, 'Pneus, freios, fluidos, correias e iluminação conferidos antes da estrada', undefined, [['Duração', '30 min'], ['Checklist', '18 pontos'], ['Ideal', 'Véspera de viagem longa']]],
              ['Troca de Bateria a Domicílio', 6900, 'Mão de obra no local com teste do alternador — bateria cobrada à parte', undefined, [['Duração', '30 min'], ['Local', 'A domicílio'], ['Atende', 'Divinópolis e região']]],
              ['Higienização do Ar-Condicionado', 15900, 'Filtro de cabine novo e saídas higienizadas com produto bactericida', undefined, [['Duração', '60 min'], ['Inclui', 'Filtro de cabine'], ['Recomendado', 'A cada 12 meses']]],
            ],
          ],
        ],
      },
      {
        nome: 'Reparo Já',
        slug: 'reparo-ja',
        descricao: 'Eletricista e encanador com hora marcada — orçamento fechado antes de furar a parede.',
        taxa: 0,
        tempo: 60,
        categoriaSlug: 'manutencao',
        // Mesma família da oficina, pele elétrica: utility na paleta 'eletrico'
        // (azul de quadro + amarelo de advertência) pra separar as duas no piso.
        preset: 'utility',
        palette: 'eletrico',
        banner: fotoModa('1621905251189-08b45d6a269e', 900, 1200),
        catalogo: [
          [
            'Elétrica residencial',
            [
              ['Visita Técnica com Diagnóstico', 9900, 'O eletricista vai até você, mede a rede e fecha o orçamento na hora', undefined, [['Duração', '45 min'], ['Local', 'A domicílio'], ['Abate', 'Valor abatido no serviço']]],
              ['Instalação de Chuveiro Elétrico', 12900, 'Troca do aparelho com fiação e disjuntor conferidos — chuveiro à parte', undefined, [['Duração', '60 min'], ['Inclui', 'Conectores e teste de carga'], ['Garantia', '90 dias na mão de obra']]],
              ['Troca de Quadro de Disjuntores', 39900, 'Quadro novo com DR, circuitos identificados e teste de corrente de fuga', undefined, [['Duração', '180 min'], ['Norma', 'NBR 5410'], ['Inclui', 'Etiquetagem dos circuitos']]],
              ['Pontos de Tomada e Interruptor', 7900, 'Até três pontos novos por visita, passando fio em conduíte existente', undefined, [['Duração', '60 min'], ['Pontos', 'Até 3 por visita'], ['Local', 'A domicílio']]],
              ['Instalação de Ventilador de Teto', 11900, 'Fixação em laje ou forro, ligação do controle e teste nas três velocidades', undefined, [['Duração', '75 min'], ['Inclui', 'Bucha, parafuso e teste'], ['Aparelho', 'Por conta do cliente']]],
            ],
          ],
          [
            'Hidráulica',
            [
              ['Caça-Vazamento com Geofone', 24900, 'Localiza o ponto exato do vazamento sem quebrar a parede inteira', undefined, [['Duração', '90 min'], ['Equipamento', 'Geofone eletrônico'], ['Entrega', 'Laudo com o ponto marcado']]],
              ['Desentupimento de Pia ou Ralo', 15900, 'Desentupimento com mangote, limpeza do sifão e teste de escoamento', undefined, [['Duração', '60 min'], ['Local', 'A domicílio'], ['Garantia', '30 dias']]],
              ['Troca de Registro ou Torneira', 8900, 'Rede fechada, peça trocada e pressão testada — peça cobrada à parte', undefined, [['Duração', '45 min'], ['Local', 'A domicílio'], ['Garantia', '90 dias na mão de obra']]],
              ['Reparo de Caixa de Água e Boia', 13900, 'Boia nova, limpeza da tampa e ajuste do nível de enchimento', undefined, [['Duração', '75 min'], ['Inclui', 'Boia nova'], ['Local', 'A domicílio']]],
            ],
          ],
          [
            'Pacotes & plantão',
            [
              ['Vistoria Elétrica da Casa', 18900, 'Todos os circuitos medidos, aterramento conferido e riscos apontados', undefined, [['Duração', '120 min'], ['Entrega', 'Relatório em PDF'], ['Ideal', 'Antes de comprar ou alugar']]],
              ['Plantão Emergencial 24h', 22900, 'Falta de luz ou vazamento fora do horário comercial, no mesmo dia', undefined, [['Duração', '60 min'], ['Horário', 'Noites, domingos e feriados'], ['Chegada', 'Até 90 min']]],
              ['Manutenção Trimestral do Prédio', 45900, 'Ronda de elétrica e hidráulica nas áreas comuns, com laudo para o síndico', undefined, [['Duração', '240 min'], ['Frequência', 'A cada 3 meses'], ['Entrega', 'Laudo assinado']]],
            ],
          ],
        ],
      },
      {
        nome: 'Frio Certo Refrigeração',
        slug: 'frio-certo',
        descricao: 'Linha branca e ar-condicionado consertados na sua casa, com peça original e nota fiscal.',
        taxa: 0,
        tempo: 75,
        categoriaSlug: 'eletrodomesticos',
        // Assistência de bancada: utility 'oficina' — o mesmo grafite da mecânica,
        // porque o público lê as duas como "conserto", não como loja.
        preset: 'utility',
        palette: 'oficina',
        banner: fotoModa('1626806787461-102c1bfaaea1', 900, 1200),
        catalogo: [
          [
            'Linha branca',
            [
              ['Visita Técnica Domiciliar', 9900, 'O técnico avalia o aparelho na sua casa e fecha o orçamento antes de abrir', undefined, [['Duração', '45 min'], ['Local', 'A domicílio'], ['Abate', 'Valor abatido no conserto']]],
              ['Conserto de Máquina de Lavar', 26900, 'Correia, bomba ou pressostato trocados com teste de ciclo completo', undefined, [['Duração', '90 min'], ['Marcas', 'Brastemp, Consul, Electrolux e LG'], ['Garantia', '90 dias na mão de obra']]],
              ['Reparo de Geladeira', 32900, 'Carga de gás, termostato aferido e teste de temperatura por 24 horas', undefined, [['Duração', '120 min'], ['Inclui', 'Carga de gás R-134a'], ['Garantia', '90 dias']]],
              ['Manutenção de Fogão e Cooktop', 15900, 'Chama regulada, injetores trocados e teste de estanqueidade no gás', undefined, [['Duração', '60 min'], ['Inclui', 'Teste de vazamento'], ['Local', 'A domicílio']]],
              ['Conserto de Micro-ondas', 18900, 'Magnetron, fusível ou prato giratório trocados com teste de aquecimento', undefined, [['Duração', '75 min'], ['Local', 'Na bancada'], ['Prazo', 'Retirada em 2 dias']]],
            ],
          ],
          [
            'Climatização',
            [
              ['Higienização de Split', 19900, 'Evaporadora e condensadora lavadas com bactericida e dreno desobstruído', undefined, [['Duração', '90 min'], ['Recomendado', 'A cada 6 meses'], ['Inclui', 'Limpeza de filtro e dreno']]],
              ['Instalação de Split até 12.000 BTUs', 45900, 'Furo, suporte, três metros de tubulação, vácuo e teste de carga', undefined, [['Duração', '240 min'], ['Inclui', '3 m de tubulação e suporte'], ['Garantia', '1 ano na instalação']]],
              ['Recarga de Gás do Split', 27900, 'Vazamento localizado, ponto soldado e carga nova de gás refrigerante', undefined, [['Duração', '120 min'], ['Inclui', 'Detecção de vazamento'], ['Garantia', '6 meses']]],
            ],
          ],
          [
            'Pequenos aparelhos',
            [
              ['Conserto de Máquina de Café', 12900, 'Descalcificação, vedação nova e teste de pressão da bomba', undefined, [['Duração', '60 min'], ['Local', 'Na bancada'], ['Prazo', 'Retirada em 2 dias']]],
              ['Reparo de Aspirador ou Ventilador', 9900, 'Escova, capacitor ou rolamento trocados, com limpeza interna completa', undefined, [['Duração', '50 min'], ['Local', 'Na bancada'], ['Garantia', '90 dias']]],
              ['Reparo de Forno Elétrico', 14900, 'Resistência, termostato e vedação da porta trocados e testados na hora', undefined, [['Duração', '70 min'], ['Local', 'Na bancada'], ['Garantia', '90 dias']]],
            ],
          ],
        ],
      },
      {
        nome: 'Chaveiro São Cristóvão',
        slug: 'chaveiro-sao-cristovao',
        descricao: 'Chave codificada, fechadura e portão — e plantão 24h pra quem ficou do lado de fora.',
        taxa: 0,
        tempo: 45,
        categoriaSlug: 'chaveiro',
        // Chaveiro/serralheria também é utility 'oficina': é a mesma linguagem de
        // bancada, ferramenta e placa de plantão.
        preset: 'utility',
        palette: 'oficina',
        banner: fotoModa('1582139329536-e7284fece509', 900, 1200),
        catalogo: [
          [
            'Chaves & cópias',
            [
              ['Cópia de Chave Simples', 1500, 'Chave de porta ou cadeado copiada na hora, na máquina de corte', undefined, [['Duração', '10 min'], ['Local', 'No balcão'], ['Prazo', 'Na hora']]],
              ['Chave Codificada de Carro', 24900, 'Chave nova cortada e programada no imobilizador do veículo', undefined, [['Duração', '60 min'], ['Inclui', 'Corte + programação'], ['Modelos', 'Nacionais e importados populares']]],
              ['Cópia de Chave Tetra', 4900, 'Chave de segurança duplicada em máquina de corte vertical', undefined, [['Duração', '20 min'], ['Local', 'No balcão'], ['Prazo', 'Na hora']]],
              ['Reparo de Controle de Portão', 8900, 'Bateria nova, botão ressoldado e recodificação no motor do portão', undefined, [['Duração', '30 min'], ['Local', 'No balcão'], ['Garantia', '90 dias']]],
            ],
          ],
          [
            'Fechaduras & aberturas',
            [
              ['Abertura de Porta sem Danos', 12900, 'Impressionamento na fechadura — porta e cilindro continuam inteiros', undefined, [['Duração', '40 min'], ['Local', 'A domicílio'], ['Plantão', '24h, inclusive feriados']]],
              ['Troca de Segredo da Fechadura', 9900, 'Cilindro novo e chaves refeitas: quem tinha a chave antiga não entra mais', undefined, [['Duração', '45 min'], ['Inclui', '3 chaves novas'], ['Local', 'A domicílio']]],
              ['Instalação de Fechadura Digital', 29900, 'Fixação, cadastro de digitais e senha mestra — aparelho cobrado à parte', undefined, [['Duração', '90 min'], ['Inclui', 'Cadastro de até 10 digitais'], ['Garantia', '90 dias']]],
              ['Abertura de Carro', 14900, 'Chave trancada dentro? Abertura com haste, sem forçar vidro nem lataria', undefined, [['Duração', '30 min'], ['Plantão', '24h'], ['Chegada', 'Até 40 min na cidade']]],
            ],
          ],
          [
            'Serralheria',
            [
              ['Solda de Portão ou Grade', 18900, 'Solda no local, lixamento do cordão e retoque com tinta antiferrugem', undefined, [['Duração', '120 min'], ['Local', 'A domicílio'], ['Inclui', 'Retoque antiferrugem']]],
              ['Ajuste de Roldana de Portão', 13900, 'Roldanas novas, trilho alinhado e fim de curso do motor regulado', undefined, [['Duração', '90 min'], ['Inclui', 'Par de roldanas'], ['Garantia', '6 meses']]],
              ['Medição para Grade sob Medida', 4900, 'Visita para medir o vão e fechar o projeto da grade ou do corrimão', undefined, [['Duração', '30 min'], ['Abate', 'Valor abatido na obra'], ['Entrega', 'Orçamento em 48h']]],
            ],
          ],
        ],
      },
      {
        nome: 'Ponte Idiomas',
        slug: 'ponte-idiomas',
        descricao: 'Inglês e espanhol em turmas de até seis alunos — conversação desde a primeira aula.',
        taxa: 0,
        tempo: 60,
        categoriaSlug: 'idiomas',
        // Escola de idiomas: editorial na paleta 'papel' — tipografia calma e
        // cara de livro, o oposto do grafite das oficinas do mesmo piso.
        preset: 'editorial',
        palette: 'papel',
        banner: fotoModa('1503676260728-1c00da094a0b', 900, 1200),
        catalogo: [
          [
            'Comece por aqui',
            [
              ['Aula Experimental de Nivelamento', 4900, 'Uma aula inteira com teste de nível e devolutiva por escrito no fim', undefined, [['Duração', '60 min'], ['Formato', 'Presencial ou online'], ['Entrega', 'Relatório de nível MCER']]],
              ['Aula Avulsa de Conversação', 8900, 'Uma hora só falando, com pauta de temas e correção no fim da aula', undefined, [['Duração', '60 min'], ['Turma', 'Até 6 alunos'], ['Nível', 'A partir do A2']]],
              ['Consultoria de Plano de Estudo', 6900, 'Sessão para montar a rotina de estudo e escolher o material certo', undefined, [['Duração', '45 min'], ['Formato', 'Online'], ['Entrega', 'Plano de 12 semanas']]],
            ],
          ],
          [
            'Pacotes mensais',
            [
              ['Inglês Geral — Mensal 2x', 39900, 'Oito aulas no mês em turma de até seis alunos, material digital incluso', undefined, [['Duração', '60 min'], ['Frequência', '2 aulas por semana'], ['Inclui', 'Material digital']]],
              ['Espanhol Geral — Mensal 2x', 36900, 'Oito aulas no mês com foco no espanhol falado na América Latina', undefined, [['Duração', '60 min'], ['Frequência', '2 aulas por semana'], ['Turma', 'Até 6 alunos']]],
              ['Inglês Individual — Mensal 1x', 49900, 'Quatro aulas particulares no mês, com pauta montada pro seu objetivo', undefined, [['Duração', '60 min'], ['Turma', 'Individual'], ['Horário', 'Você escolhe']]],
              ['Kids 7 a 11 anos — Mensal 2x', 32900, 'Oito aulas com jogos, música e histórias — sem lição de casa escrita', undefined, [['Duração', '50 min'], ['Idade', '7 a 11 anos'], ['Turma', 'Até 8 crianças']]],
            ],
          ],
          [
            'Preparatórios',
            [
              ['Inglês para Entrevista', 12900, 'Simulação de entrevista técnica gravada, com correção de pronúncia', undefined, [['Duração', '90 min'], ['Formato', 'Online'], ['Entrega', 'Gravação + correções']]],
              ['Preparatório TOEFL — Mensal', 59900, 'Quatro encontros com simulados cronometrados das quatro habilidades', undefined, [['Duração', '120 min'], ['Frequência', '1 encontro por semana'], ['Inclui', '2 simulados completos']]],
              ['Inglês para Viagem', 24900, 'Quatro aulas com aeroporto, hotel, restaurante e emergência no roteiro', undefined, [['Duração', '60 min'], ['Pacote', '4 aulas'], ['Turma', 'Até 6 alunos']]],
            ],
          ],
        ],
      },
      {
        nome: 'Clave Nove Estúdio',
        slug: 'clave-nove',
        descricao: 'Aulas de instrumento e sala de ensaio no centro — do primeiro acorde ao primeiro show.',
        taxa: 0,
        tempo: 50,
        categoriaSlug: 'musica',
        // Estúdio de música: playful na paleta 'sol' (amarelo quente) — a
        // alternativa alegre de aulas-cursos, ao lado do editorial da escola.
        preset: 'playful',
        palette: 'sol',
        banner: fotoModa('1511671782779-c97d3d27a1d4', 900, 1200),
        catalogo: [
          [
            'Aulas de instrumento',
            [
              ['Aula Experimental de Violão', 3900, 'Primeira aula com violão do estúdio — você sai tocando dois acordes', undefined, [['Duração', '50 min'], ['Inclui', 'Instrumento emprestado'], ['Idade', 'A partir de 8 anos']]],
              ['Violão e Guitarra — Mensal', 32900, 'Quatro aulas individuais no mês, com repertório escolhido por você', undefined, [['Duração', '50 min'], ['Frequência', '1 aula por semana'], ['Turma', 'Individual']]],
              ['Teclado e Piano — Mensal', 34900, 'Quatro aulas com leitura de partitura e cifra na mesma rotina', undefined, [['Duração', '50 min'], ['Frequência', '1 aula por semana'], ['Turma', 'Individual']]],
              ['Bateria — Mensal', 36900, 'Quatro aulas na bateria acústica, com fone e metrônomo desde o começo', undefined, [['Duração', '50 min'], ['Inclui', 'Baquetas do estúdio'], ['Sala', 'Tratada acusticamente']]],
              ['Canto e Técnica Vocal — Mensal', 39900, 'Quatro aulas de respiração e repertório, com gravação no fim do mês', undefined, [['Duração', '50 min'], ['Frequência', '1 aula por semana'], ['Entrega', 'Gravação do repertório']]],
            ],
          ],
          [
            'Estúdio & ensaio',
            [
              ['Hora de Sala de Ensaio', 8900, 'Sala tratada com backline completo: amplificadores, bateria e PA', undefined, [['Duração', '60 min'], ['Inclui', 'Backline completo'], ['Capacidade', 'Até 6 músicos']]],
              ['Gravação de Voz e Violão', 24900, 'Duas horas de estúdio com técnico na mesa e mixagem simples inclusa', undefined, [['Duração', '120 min'], ['Inclui', 'Técnico + mixagem'], ['Entrega', 'WAV e MP3 em 5 dias']]],
              ['Turno Fechado para Banda', 22900, 'Três horas seguidas de sala, com gravação ambiente de referência', undefined, [['Duração', '180 min'], ['Inclui', 'Gravação de referência'], ['Capacidade', 'Até 6 músicos']]],
            ],
          ],
          [
            'Turmas & reforço',
            [
              ['Musicalização Infantil', 24900, 'Quatro encontros em grupo com percussão, ritmo e brincadeira cantada', undefined, [['Duração', '40 min'], ['Idade', '4 a 7 anos'], ['Turma', 'Até 8 crianças']]],
              ['Reforço de Teoria Musical', 18900, 'Quatro aulas de leitura, campo harmônico e cifra — pra destravar', undefined, [['Duração', '50 min'], ['Formato', 'Presencial ou online'], ['Turma', 'Até 4 alunos']]],
              ['Preparatório para Tocar em Banda', 29900, 'Quatro ensaios guiados por professor, com repertório fechado no fim', undefined, [['Duração', '90 min'], ['Frequência', '1 ensaio por semana'], ['Turma', 'Até 6 músicos']]],
            ],
          ],
        ],
      },
    ],
  },
  {
    piso: 'Presentes & Diversão',
    secaoSlug: 'presentes-diversao',
    catalogo: [
      [
        'Mais presenteados',
        [
          ['Caixa de presente montada', 8990, 'Você escolhe três itens da loja e a casa embrulha com laço'],
          ['Cartão comemorativo', 1290, 'Papel texturizado 240g com envelope e lacre adesivo'],
          ['Kit criativo do mês', 6490, 'Seleção da casa para quem gosta de fazer à mão'],
          ['Jogo para a mesa da sala', 12990, 'Partida rápida de 2 a 6 jogadores, regras em português'],
        ],
      ],
      [
        'Para a festa',
        [
          ['Kit decoração básica', 4990, 'Balões, bandeirola de papel e velas numeradas'],
          ['Lembrancinha montada 10un', 3990, 'Sacola, doce e tag com o nome do convidado'],
          ['Vela de aniversário especial', 990, 'Chama colorida e queima lenta, com base antipingo'],
        ],
      ],
    ],
    lojas: [
      { nome: 'Papelaria Criativa', slug: 'papelaria-criativa', descricao: 'Material escolar, escritório e papelaria fina.', taxa: 490, tempo: 35, categoriaSlug: 'papelaria', preset: 'playful' },
      { nome: 'Livraria Saber', slug: 'livraria-saber', descricao: 'Livros, mangás e jogos de tabuleiro.', taxa: 0, tempo: 55, categoriaSlug: 'livraria', preset: 'editorial' },
      {
        nome: 'Lojão Central',
        slug: 'lojao-central',
        descricao: 'Do carrinho de bebê à furadeira — tudo para a casa em um só lugar, com oferta toda semana.',
        taxa: 890,
        tempo: 75,
        categoriaSlug: 'departamento',
        // Loja-demo da vitrine magazine (Revive): varejo clássico vende-tudo.
        preset: 'magazine',
        logo: LOGO_LOJAO,
        banner: fotoModa('1556911220-bff31c812dba', 900, 1200),
        catalogo: [
          [
            'Eletro & casa',
            [
              ['Geladeira Retrô Menta 260L', 289900, 'Degelo automático · classe A', fotoModa('1571175443880-49e1d25b2bc5')],
              ['Smart TV 50" 4K', 219900, 'HDR · apps integrados · voz', fotoModa('1593359677879-a4bb92f829d1')],
            ],
          ],
          [
            'Infantil',
            [
              ['Boia Divertida Baby', 4990, 'Com assento e protetor solar UV', fotoModa('1519689680058-324335c77eba')],
              ['Macacão Ursinho Plush', 7990, 'Tamanhos RN a 12 meses', fotoModa('1522771930-78848d9293e8')],
              ['Trem de Madeira 24pç', 12990, 'Trilhos e estação — 3+ anos', fotoModa('1596461404969-9ae70f2830c1')],
              ['Kit Primeiros Brinquedos', 8990, 'Pelúcias e livro de banho', fotoModa('1515488042361-ee00e0ddd4e4')],
            ],
          ],
          [
            'Ferramentas',
            [
              ['Furadeira de Impacto 20V', 39900, 'Bateria dupla · maleta inclusa', fotoModa('1504148455328-c376907d081c')],
              ['Kit Alicates Pro 6pç', 15990, 'Aço cromo-vanádio · cabo isolado', fotoModa('1530124566582-a618bc2615dc')],
            ],
          ],
        ],
      },
      {
        nome: 'Pião & Girassol',
        slug: 'piao-girassol',
        descricao: 'Brinquedo que ensina brincando — madeira, encaixe e ciência para cada fase.',
        taxa: 490,
        tempo: 45,
        categoriaSlug: 'brinquedos',
        // Brinquedo educativo pede calma, não estardalhaço: soft na paleta
        // menta (verde suave) — o lado montessoriano da prateleira.
        preset: 'soft',
        palette: 'menta',
        banner: fotoModa('1587654780291-39c9404d746b', 900, 1200),
        catalogo: [
          [
            'Madeira & encaixe',
            [
              ['Encaixa Formas de Madeira', 8990, 'Cubo em madeira maciça com 12 blocos geométricos — formas e coordenação a partir de 1 ano'],
              ['Torre Empilha 10 Aros', 6490, 'Aros lixados à mão e pintados com tinta atóxica à base de água'],
              ['Trilho de Trem 32 peças', 15990, 'Trilhos, locomotiva e estação em madeira certificada — 3+ anos'],
              ['Tabuleiro Alfabeto Móvel', 7490, '26 letras em madeira com pino de pega fácil e base gravada'],
              ['Blocos de Construção 120 peças', 12990, 'Peças coloridas compatíveis entre si, em balde com tampa organizadora'],
            ],
          ],
          [
            'Ciência & descoberta',
            [
              ['Kit de Ciências Laboratório', 18990, '30 experimentos com tubos, pipetas, lupa e manual ilustrado — 8+ anos'],
              ['Kit de Astronomia Iniciante', 22990, 'Luneta 30x, mapa celeste girável e caderno de observação'],
              ['Kit Vulcão e Cristais', 9990, 'Reagentes seguros para erupção efervescente e cultivo de cristais em 7 dias'],
              ['Microscópio Júnior 400x', 26990, 'Três objetivas, lâminas prontas e iluminação LED'],
            ],
          ],
          [
            'Arte & criação',
            [
              ['Kit de Pintura Aquarela 24 cores', 8490, 'Pastilhas aquareláveis, dois pincéis e bloco 300g com 20 folhas'],
              ['Cavalete Dupla Face Infantil', 24990, 'Lousa de giz de um lado, quadro branco do outro, com bandeja e rolo de papel'],
              ['Massinha Natural 8 potes', 5490, 'Feita com farinha e corantes de beterraba, açafrão e espinafre'],
              ['Kit Costura em Feltro', 6990, 'Moldes pré-furados de bichos, agulha sem ponta e linhas coloridas'],
            ],
          ],
        ],
      },
      {
        nome: 'Confete & Cia Festas',
        slug: 'confete-e-cia',
        descricao: 'Festa montada em 24 horas — balões, mesa temática e lembrancinha pra levar.',
        taxa: 690,
        tempo: 40,
        categoriaSlug: 'festas',
        // Loja de festa é barulho colorido: playful na paleta chiclete
        // (magenta) — a pele mais festiva do arquétipo.
        preset: 'playful',
        palette: 'chiclete',
        banner: fotoModa('1530103862676-de8c9debad1d', 900, 1200),
        catalogo: [
          [
            'Balões & painéis',
            [
              ['Balão Metalizado Número 90cm', 2490, 'Alumínio dourado ou prateado, infla com ar ou hélio, com peso de mesa'],
              ['Kit Arco Desconstruído 100 balões', 8990, 'Látex em três tons combinados, fita de montagem e cola pontual'],
              ['Balão Bubble Transparente 60cm', 3490, 'Enchido com confete e nome recortado em vinil adesivo'],
              ['Balão Metalizado Coração 45cm', 1290, 'Vermelho, rosa ou rosé — vem inflado e com peso'],
              ['Painel Cilindro 1,80m', 15990, 'Aluguel de 24h: estrutura, capa em tecido e montagem no local'],
            ],
          ],
          [
            'Mesa & descartáveis',
            [
              ['Kit Mesa Temática 8 convidados', 7990, 'Toalha, pratos, copos, guardanapos e talheres do mesmo tema'],
              ['Forminhas de Doce 100un', 1990, 'Papel rígido plissado em 12 cores, montagem rápida'],
              ['Topo de Bolo Personalizado', 4590, 'Acrílico espelhado com nome e idade cortados a laser'],
              ['Saia de Mesa Metalizada 1,20m', 2290, 'Franjas metalizadas para a mesa do bolo, com fita autocolante'],
            ],
          ],
          [
            'Lembrancinhas',
            [
              ['Caixinha Personalizada 20un', 3990, 'Cartonagem com tag impressa e fita de cetim — recheio à sua escolha'],
              ['Saquinho Surpresa Montado 10un', 4990, 'Cinco brinquedinhos e dois doces em cada saquinho'],
              ['Mini Vela Aromática 12un', 6990, 'Cera de soja com essência de baunilha em pote de vidro'],
              ['Kit Colorir de Bolso 20un', 2990, 'Bloquinho, giz de cera e cartela de adesivos por criança'],
            ],
          ],
        ],
      },
      {
        nome: 'Caixa de Mimos',
        slug: 'caixa-de-mimos',
        descricao: 'Presente com nome, data e recado — personalizamos e entregamos em até 48h.',
        taxa: 590,
        tempo: 50,
        categoriaSlug: 'presentes',
        // Mesmo arquétipo da festa, pele diferente: playful na paleta sol
        // (âmbar) — presente embrulhado tem calor, não neon.
        preset: 'playful',
        palette: 'sol',
        banner: fotoModa('1513885535751-8b9238bd345a', 900, 1200),
        catalogo: [
          [
            'Personalizados',
            [
              ['Caneca Personalizada 325ml', 4490, 'Porcelana branca com foto ou frase em sublimação, resiste à lava-louças'],
              ['Caneca Mágica Térmica', 5990, 'A arte só aparece quando o café quente entra'],
              ['Chaveiro de Acrílico com Foto', 1990, 'Corte a laser de 5cm, com argola e correntinha'],
              ['Almofada com Estampa Autoral', 7990, 'Capa 40x40 em suede com enchimento antialérgico incluso'],
              ['Quadro Azulejo 15x15', 3490, 'Cerâmica esmaltada com suporte de madeira para bancada'],
              ['Camiseta Estampada Sob Medida', 8990, 'Algodão penteado fio 30.1, arte em DTF, do P ao GG'],
            ],
          ],
          [
            'Caixas surpresa',
            [
              ['Caixa Surpresa Aniversário', 12990, 'Caneca personalizada, barra de chocolate, vela e cartão escrito à mão'],
              ['Caixa Surpresa Amigo Secreto', 6990, 'Três mimos sorteados dentro da faixa de valor, já embalados'],
              ['Caixa Surpresa do Mês', 9990, 'Curadoria mensal: papelaria, doce e um objeto autoral de Divinópolis'],
            ],
          ],
          [
            'Datas especiais',
            [
              ['Cartão Pop-up Artesanal', 2490, 'Papel 240g cortado a laser, abre em cena tridimensional'],
              ['Buquê de Chocolates 12un', 8990, 'Bombons em haste com papel seda e laço de cetim'],
              ['Kit Spa da Mamãe', 14990, 'Sabonete artesanal, esponja vegetal, sais de banho e vela de lavanda'],
            ],
          ],
        ],
      },
      {
        nome: 'Dado Crítico',
        slug: 'dado-critico',
        descricao: 'Mesa aberta pra jogar antes de levar — tabuleiros, cartas e miniaturas.',
        taxa: 890,
        tempo: 60,
        categoriaSlug: 'colecionaveis',
        // Sem paleta: o playful original (violeta sobre branco) já é a cara de
        // loja de tabuleiro — colorido sem virar festa infantil.
        preset: 'playful',
        banner: fotoModa('1610890716171-6b1bb98ffd09', 900, 1200),
        catalogo: [
          [
            'Jogos de tabuleiro',
            [
              ['Rota das Minas', 24990, 'Estratégia de rotas para 2 a 5 jogadores, partida de 60 minutos'],
              ['Ilha Submersa', 18990, 'Cooperativo: todos contra o tabuleiro, 30 minutos, 8+ anos'],
              ['Feira de Divinópolis', 12990, 'Compra de cartas para 2 a 4 jogadores, 40 minutos'],
              ['Fortaleza — duelo', 15990, 'Tático para exatamente 2 jogadores, caixa de bolso, 20 minutos'],
              ['Detetives do Interior', 21990, 'Campanha de 6 casos com pistas e mapas descartáveis inclusos'],
            ],
          ],
          [
            'Quebra-cabeças',
            [
              ['Quebra-cabeça 1000 peças Mapa-múndi', 8990, 'Papelão prensado 2mm, pôster de referência em tamanho real'],
              ['Quebra-cabeça 1000 peças Noite Estrelada', 9490, 'Reprodução em alta definição com acabamento fosco antirreflexo'],
              ['Quebra-cabeça 500 peças Serra da Canastra', 6490, 'Foto autoral do parque, peças graúdas de encaixe firme'],
              ['Quebra-cabeça 3D Catedral', 11990, '216 peças em EVA laminado, monta sem cola em cerca de 3 horas'],
            ],
          ],
          [
            'Colecionáveis & mesa',
            [
              ['Miniatura Articulada 15cm', 14990, 'Resina pintada à mão, base de exposição e dois pares de mãos'],
              ['Pack de Cartas Colecionáveis', 3490, '15 cartas aleatórias com uma raridade garantida por pacote'],
              ['Set de Dados em Metal 7 peças', 9990, 'Liga de zinco com numeração esmaltada, em estojo de veludo'],
              ['Sleeves Protetores 100un', 2490, 'Padrão 66x91mm, verso fosco que não escorrega na mesa'],
              ['Playmat de Neoprene 60x35', 7990, 'Base antiderrapante e arte exclusiva da casa'],
            ],
          ],
        ],
      },
      {
        nome: 'Cesta & Afeto',
        slug: 'cesta-e-afeto',
        descricao: 'Café da manhã entregue na porta, com flor e cartão escrito à mão.',
        taxa: 990,
        tempo: 90,
        categoriaSlug: 'cestas',
        // Cesteria é gesto afetivo: soft na paleta lavanda (roxo suave) —
        // mesma família da loja de brinquedos, tom diferente pra não repetir
        // a pele no mesmo piso.
        preset: 'soft',
        palette: 'lavanda',
        banner: fotoModa('1504754524776-8f4f37790ca0', 900, 1200),
        catalogo: [
          [
            'Cafés da manhã',
            [
              ['Cesta Bom Dia Clássica', 12990, 'Pão de queijo, café coado 300ml, suco, iogurte, frutas e bolo caseiro'],
              ['Cesta Manhã Especial', 18990, 'A clássica mais geleia artesanal, queijo canastra e croissant amanteigado'],
              ['Cesta para Dois', 24990, 'Porções dobradas, duas canecas de brinde e mimosa sem álcool'],
              ['Cesta Vegana da Roça', 16990, 'Bolo de banana sem leite, pasta de castanha, frutas e suco verde 500ml'],
              ['Cesta Mini Carinho', 7990, 'Café, pão de queijo e um bilhete — cabe na mesa do escritório'],
            ],
          ],
          [
            'Cestas temáticas',
            [
              ['Cesta Chá da Tarde', 15990, 'Chás em sachê, biscoito amanteigado, bolo inglês e mel de flor silvestre'],
              ['Cesta Chocolate Total', 13990, 'Barra 70%, bombons recheados, brownie e achocolatado cremoso'],
              ['Cesta Bem-Estar', 19990, 'Granola, castanhas, frutas secas, chá calmante e vela de lavanda'],
              ['Cesta Boas-Vindas Bebê', 21990, 'Body, par de meias, mordedor de madeira e o café da manhã dos pais'],
            ],
          ],
          [
            'Para completar',
            [
              ['Buquê de Flores do Campo', 6990, 'Doze hastes da estação embaladas em papel kraft'],
              ['Balão Metalizado com Recado', 1490, 'Frase escrita à mão no balão, inflado com hélio'],
              ['Cartão Escrito à Mão', 990, 'Sua mensagem em caligrafia, em papel algodão com envelope'],
              ['Taça de Vidro Gravada', 3990, 'Nome gravado a jato de areia, vendida por unidade'],
            ],
          ],
        ],
      },
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
  flores: { slug: 'floricultura-plantas', nome: 'Floricultura' },
  petshop: { slug: 'pet-shop', nome: 'Pet Shop' },
  papelaria: { slug: 'papelaria-livraria', nome: 'Papelaria' },
  livraria: { slug: 'papelaria-livraria', nome: 'Livraria' },
  departamento: { slug: 'outros', nome: 'Departamento' },
  // Piso Saúde — várias chaves para o mesmo `saude-bem-estar`: o slug canônico
  // manda no template (services → PDP de agendamento), o rótulo muda o chip.
  fisioterapia: { slug: 'saude-bem-estar', nome: 'Fisioterapia' },
  nutricao: { slug: 'saude-bem-estar', nome: 'Nutrição' },
  laboratorio: { slug: 'saude-bem-estar', nome: 'Laboratório' },
  veterinaria: { slug: 'veterinaria', nome: 'Veterinária' },
  pilates: { slug: 'saude-bem-estar', nome: 'Pilates' },
  // Piso Beleza — todas em `saloes-estetica` (template services).
  salao: { slug: 'saloes-estetica', nome: 'Salão de Beleza' },
  barbearia: { slug: 'saloes-estetica', nome: 'Barbearia' },
  esmalteria: { slug: 'saloes-estetica', nome: 'Esmalteria' },
  estetica: { slug: 'saloes-estetica', nome: 'Estética' },
  tatuagem: { slug: 'saloes-estetica', nome: 'Estúdio de Tatuagem' },
  // Piso Pet — `petshop` já existe acima e continua servindo o Mundo Pet.
  racoes: { slug: 'pet-shop', nome: 'Casa de Ração' },
  petboutique: { slug: 'pet-shop', nome: 'Boutique Pet' },
  aquarismo: { slug: 'pet-shop', nome: 'Aquarismo' },
  aves: { slug: 'pet-shop', nome: 'Aves & Pequenos' },
  // Piso Serviços — `servicos` já existe acima (iFix). As novas separam
  // oficina/manutenção/assistência de aulas-cursos.
  oficina: { slug: 'oficinas-manutencao', nome: 'Oficina Mecânica' },
  manutencao: { slug: 'oficinas-manutencao', nome: 'Elétrica & Hidráulica' },
  eletrodomesticos: { slug: 'oficinas-manutencao', nome: 'Assistência Técnica' },
  chaveiro: { slug: 'oficinas-manutencao', nome: 'Chaveiro' },
  idiomas: { slug: 'aulas-cursos', nome: 'Idiomas' },
  musica: { slug: 'aulas-cursos', nome: 'Música' },
  // Piso Presentes & Diversão — todas em `brinquedos-presentes`.
  brinquedos: { slug: 'brinquedos-presentes', nome: 'Brinquedos' },
  festas: { slug: 'brinquedos-presentes', nome: 'Festas & Lembrancinhas' },
  presentes: { slug: 'brinquedos-presentes', nome: 'Presentes' },
  colecionaveis: { slug: 'brinquedos-presentes', nome: 'Jogos & Colecionáveis' },
  cestas: { slug: 'brinquedos-presentes', nome: 'Cestas' },
  // Casa & Vida — obra e garagem.
  construcao: { slug: 'construcao-ferramentas', nome: 'Material de Construção' },
  ferramentas: { slug: 'construcao-ferramentas', nome: 'Ferramentas' },
  tintas: { slug: 'construcao-ferramentas', nome: 'Tintas' },
  autopecas: { slug: 'automotivo', nome: 'Autopeças' },
  automotivo: { slug: 'automotivo', nome: 'Som & Acessórios' },
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

    // Pele da loja: preset fixo da loja-demo, senão cicla entre os arquétipos
    // oferecidos para a categoria → demo com variedade coerente por nicho.
    const oferecidos = getArquetiposOferecidos(cat.slug).map((a) => a.codigo)
    const preset =
      loja.preset ?? oferecidos[lojaIdx % oferecidos.length] ?? 'editorial'

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
      theme: loja.palette
        ? { v: 2, preset, palette: loja.palette }
        : { v: 2, preset },
    })

    const catalogo = loja.catalogo ?? piso.catalogo
    catalogo.forEach(([catNome, itens], catIdx) => {
      const categoryId = `${storeId}-cat-${catIdx + 1}`
      itens.forEach(([nome, preco, descricao, fotoUrl, especificacoes, exigeReceita], prodIdx) => {
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
        // Serviço (template `services`): o PDP de agendamento monta a grade de
        // horários a partir de metadata.duracao_min. As lojas de serviço trazem
        // a duração como PRIMEIRA especificação ('Duração'/'Duracao', '50 min')
        // — só converte quando o valor está em minutos ('1h30' fica de fora).
        const rotuloDuracao = especificacoes?.find(
          ([rotulo]) => rotulo === 'Duração' || rotulo === 'Duracao'
        )?.[1]
        const minutos = rotuloDuracao?.match(/(\d+)\s*min/)
        const duracaoMin = minutos ? Number(minutos[1]) : null
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
          metadata:
            galeria || especificacoes || exigeReceita || duracaoMin
              ? {
                  ...(galeria ? { galeria } : {}),
                  ...(especificacoes ? { especificacoes } : {}),
                  ...(exigeReceita ? { exige_receita: true } : {}),
                  ...(duracaoMin ? { duracao_min: duracaoMin } : {}),
                }
              : null,
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

// Sempre por slug, nunca por índice: qualquer loja nova nos pisos acima
// desloca stores[] e o pedido passaria a apontar para outra casa.
const lojaAtiva = stores.find((s) => s.slug === 'burger-house')! // Burger House DV
const itensAtivo = products.filter((p) => p.store_id === lojaAtiva.id).slice(0, 2)
const subtotalAtivo = itensAtivo.reduce(
  (s, p) => s + (p.preco_promocional ?? p.preco) * 1,
  0
)

const lojaHist1 = stores.find((s) => s.slug === 'sabor-mineiro')! // Sabor Mineiro
const itensHist1 = products.filter((p) => p.store_id === lojaHist1.id).slice(0, 3)
const subHist1 = itensHist1.reduce(
  (s, p) => s + (p.preco_promocional ?? p.preco),
  0
)

const lojaHist2 = stores.find((s) => s.slug === 'vitrine-fashion')! // Vitrine Fashion
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
  /** Feed curatorial do Explorar (./feed) — só leitura, nunca mutado. */
  public_explore_feed: ExploreFeedRow[]
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
    public_explore_feed: EXPLORE_FEED,
  }
}
