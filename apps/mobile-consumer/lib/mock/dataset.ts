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
import {
  LOGO_ACAI,
  LOGO_ARENA_FIT,
  LOGO_LOJAO,
  LOGO_BELLA,
  LOGO_BROTO,
  LOGO_BURGER_HOUSE,
  LOGO_CAFE_AROMA,
  LOGO_CANTINA,
  LOGO_CASA_CONFORTO,
  LOGO_FARMACIA,
  LOGO_FORNO_REAL,
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
   * contrato lido pelo ModalProduto).
   */
  metadata: {
    galeria?: string[]
    especificacoes?: [string, string][]
    exige_receita?: boolean
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
// Pisos do shopping — a ordem casa com SECOES em (tabs)/index.tsx
// ─────────────────────────────────────────────────────────────

// Pisos sem duplicidade: Térreo = essenciais (conveniência na entrada);
// Piso 4 = praça de alimentação no topo, à moda dos shoppings brasileiros.
const PISOS: PisoSpec[] = [
  {
    piso: 'Piso 4',
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
      {
        nome: 'Broto & Grão',
        slug: 'broto-e-grao',
        descricao:
          'Comida de verdade não precisa ser sem graça — colhida perto, montada na hora, sem atalhos.',
        taxa: 490,
        tempo: 30,
        categoriaSlug: 'saudavel',
        // Loja-demo da vitrine horta (Sonder & Sprout): creme + verde-floresta,
        // pastéis rosa/caramelo, selos recortados e fotos-adesivo. O "&" do
        // nome vira o selo carimbado entre as duas linhas do wordmark.
        preset: 'garden',
        logo: LOGO_BROTO,
        banner: fotoModa('1490645935967-10de6ba17061', 900, 1200),
        catalogo: [
          [
            // O rótulo casa com o regex que elege a seção do carrossel de
            // favoritos (LojaHorta.tsx) — sem ele a vitrine cai nos primeiros
            // itens com foto.
            'Favoritos da casa',
            [
              ['Toast de Abacate & Ovo', 2490, 'Pão de fermentação · abacate · ovo caipira · flor de sal', fotoModa('1525351484163-7529414344d8')],
              ['Bowl Berry Muesli', 2290, 'Morango · blueberry · muesli · aveia · creme de coco', fotoModa('1494597564530-871f2b93ac55')],
              ['Sanduíche da Horta', 2690, 'Grãos na crosta · tomate · pesto da casa · folhas da estação', fotoModa('1528735602780-2552fd46c7af')],
              ['Toast Cogumelo & Espinafre', 2590, 'Ricota temperada · cogumelos salteados · espinafre fresco', fotoModa('1482049016688-2d3e1b311543')],
            ],
          ],
          [
            'Bowls & saladas',
            [
              ['Bowl Colheita', 2890, 'Grãos · legumes assados · homus · tahine de limão', fotoModa('1512621776951-a57141f2eefd')],
              ['Salada Verde Completa', 2390, 'Folhas orgânicas · abacate · sementes tostadas · vinagrete de mel', fotoModa('1540189549336-e6e99c3679fe')],
              ['Bowl Proteico', 3190, 'Frango grelhado · quinoa · brócolis · molho de iogurte', fotoModa('1546069901-ba9599a7e63c')],
              ['Panqueca de Aveia & Frutas', 2190, 'Aveia · banana · frutas vermelhas · mel de flor', fotoModa('1567620905732-2d1ec7ab7445')],
            ],
          ],
          [
            'Sucos & smoothies',
            [
              ['Suco Verde da Manhã 500ml', 1290, 'Couve · abacaxi · gengibre · limão-siciliano', fotoModa('1610970881699-44a5587cabec')],
              ['Smoothie de Frutas Vermelhas', 1590, 'Morango · amora · banana · leite de amêndoas', fotoModa('1505252585461-04db1eb84625')],
              ['Salada de Frutas da Estação', 1190, 'Frutas do dia · calda cítrica · hortelã', fotoModa('1490474418585-ba9bad8fd0ea')],
            ],
          ],
          [
            'Doces naturais',
            [
              ['Rabanada Integral de Frutas', 1690, 'Pão integral · frutas vermelhas · iogurte natural', fotoModa('1484723091739-30a097e8f929')],
              ['Bowl Zero Açúcar', 2190, 'Adoçado com tâmara · granola sem glúten · frutas vermelhas', fotoModa('1596591606975-97ee5cef3a1e')],
            ],
          ],
        ],
      },
      {
        nome: 'Forno Real',
        slug: 'forno-real',
        descricao:
          'Uma experiência de pizza inesquecível — massa de fermentação longa, forno a lenha e coroa na borda.',
        taxa: 590,
        tempo: 40,
        categoriaSlug: 'pizzaria',
        // Loja-demo da vitrine forno (Restaurin / "Pizza Lounge"): creme
        // fatiado em blocos preto/ouro/vermelho, pizzas em recorte redondo e
        // coroa real. As fotos são TOP-DOWN de propósito — o disco redondo da
        // vitrine recorta a foto em círculo.
        preset: 'slice',
        logo: LOGO_FORNO_REAL,
        banner: fotoModa('1593560708920-61dd98c46a4e', 900, 900),
        catalogo: [
          [
            // O rótulo casa com o regex que elege a seção do cardápio-pôster
            // (LojaForno.tsx) — sem ele a vitrine cai nos primeiros itens com
            // foto.
            'Pizzas da casa',
            [
              ['Margherita Reale', 5490, 'San Marzano · fior di latte · manjericão fresco · azeite', fotoModa('1595854341625-f33ee10dbf94')],
              ['Pepperoni Coroada', 6290, 'Pepperoni artesanal · muçarela · orégano da serra', fotoModa('1604382354936-07c5d9983bd3')],
              ['Quatro Queijos do Reino', 6490, 'Muçarela · gorgonzola · parmesão · provolone defumado', fotoModa('1574071318508-1cdbab80d002')],
              ['Capricciosa', 6190, 'Presunto cotto · cogumelos · alcachofra · azeitona preta', fotoModa('1590947132387-155cc02f3212')],
            ],
          ],
          [
            'Clássicas',
            [
              ['Calabresa da Corte', 5290, 'Calabresa fatiada · cebola roxa · azeitonas', fotoModa('1565299624946-b28f40a0ae38')],
              ['Portuguesa', 5690, 'Presunto · ovo caipira · ervilha · cebola', fotoModa('1571407970349-bc81e7e96d47')],
              ['Napolitana', 5490, 'Tomate em rodelas · muçarela · parmesão · manjericão', fotoModa('1598023696416-0193a0bcd302')],
            ],
          ],
          [
            'Massas da casa',
            [
              ['Fusilli ao Pomodoro Rústico', 4290, 'Pomodoro da casa · manjericão · azeite extravirgem', fotoModa('1608897013039-887f21d8c804')],
              ['Penne à Bolonhesa', 4590, 'Ragu de carne cozido lento · parmesão ralado na hora', fotoModa('1621996346565-e3dbc646d9a9')],
            ],
          ],
          [
            'Bebidas & doces',
            [
              ['Limonada Siciliana 500ml', 1290, 'Limão-siciliano · hortelã · gelo de água de coco', fotoModa('1621263764928-df1444c5e859')],
              ['Tiramisù da Casa', 2490, 'Mascarpone · café coado · cacau amargo', fotoModa('1571877227200-a0d98ea607e9')],
            ],
          ],
        ],
      },
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
      { nome: 'Mercado Central DV', slug: 'mercado-central', descricao: 'Hortifruti, mercearia e açougue. Tudo num lugar só.', taxa: 0, tempo: 40, categoriaSlug: 'mercado', preset: 'market' },
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
      { nome: 'Hortifruti Viçoso', slug: 'hortifruti-vicoso', descricao: 'Frutas, legumes e verduras fresquinhos todo dia.', taxa: 390, tempo: 30, categoriaSlug: 'mercado', preset: 'market' },
      { nome: 'Padaria Pão Quente', slug: 'padaria-pao-quente', descricao: 'Pães, bolos e salgados saindo do forno a toda hora.', taxa: 0, tempo: 20, categoriaSlug: 'padaria', preset: 'heritage' },
      { nome: 'Empório Natural', slug: 'emporio-natural', descricao: 'Produtos naturais, granéis e orgânicos.', taxa: 590, tempo: 35, categoriaSlug: 'mercado', preset: 'artisan' },
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
      { nome: 'TechPoint', slug: 'techpoint', descricao: 'Smartphones, tablets e gadgets com garantia oficial.', taxa: 0, tempo: 55, categoriaSlug: 'eletronicos', preset: 'tech' },
      { nome: 'GameZone', slug: 'gamezone', descricao: 'Consoles, jogos e periféricos gamer.', taxa: 690, tempo: 50, categoriaSlug: 'games', preset: 'raw' },
      { nome: 'InfoStore DV', slug: 'infostore-dv', descricao: 'Notebooks, PCs e componentes de informática.', taxa: 0, tempo: 60, categoriaSlug: 'informatica', preset: 'tech' },
      { nome: 'Som & Imagem', slug: 'som-imagem', descricao: 'TVs, soundbars e áudio de alta fidelidade.', taxa: 990, tempo: 70, categoriaSlug: 'eletronicos', preset: 'noir' },
      { nome: 'iFix Assistência', slug: 'ifix-assistencia', descricao: 'Conserto de celulares e venda de peças originais.', taxa: 0, tempo: 45, categoriaSlug: 'servicos', preset: 'utility' },
      { nome: 'Mobile Acessórios', slug: 'mobile-acessorios', descricao: 'Capas, películas e carregadores para todo modelo.', taxa: 390, tempo: 35, categoriaSlug: 'acessorios', preset: 'tech' },
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
      { nome: 'Mundo Pet', slug: 'mundo-pet', descricao: 'Ração, acessórios e petiscos para cães e gatos.', taxa: 0, tempo: 40, categoriaSlug: 'petshop', preset: 'soft' },
      { nome: 'Papelaria Criativa', slug: 'papelaria-criativa', descricao: 'Material escolar, escritório e papelaria fina.', taxa: 490, tempo: 35, categoriaSlug: 'papelaria', preset: 'playful' },
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
      { nome: 'Utilidades Lar', slug: 'utilidades-lar', descricao: 'Tudo para a cozinha e organização da casa.', taxa: 390, tempo: 45, categoriaSlug: 'casa', preset: 'editorial' },
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
  saudavel: { slug: 'alimentos-bebidas', nome: 'Saudável' },
  pizzaria: { slug: 'alimentos-bebidas', nome: 'Pizzaria' },
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
            galeria || especificacoes || exigeReceita
              ? {
                  ...(galeria ? { galeria } : {}),
                  ...(especificacoes ? { especificacoes } : {}),
                  ...(exigeReceita ? { exige_receita: true } : {}),
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

// Por slug, não por índice: qualquer loja nova nos pisos acima desloca stores[].
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
