/**
 * Feed da aba Explorar no modo demonstração.
 *
 * Espelha o contrato da view `public_explore_feed` (docs/partner-app/02 §6),
 * que é o que app/(tabs)/explorar.tsx lê: fotos e vídeos das lojas no mesmo
 * feed, ordenado por `publicado_em` decrescente com paginação keyset
 * (`.lt('publicado_em', ...)`).
 *
 * Regras deste arquivo:
 * - `publicado_em` são datas ISO LITERAIS, já em ordem decrescente. Nada de
 *   `Date.now()`/`new Date()` — o feed precisa ser determinístico entre boots.
 * - `produto.preco` em CENTAVOS (mesma unidade de `products.preco`).
 * - `loja_slug` sempre aponta para uma loja existente no dataset, porque a
 *   tela navega para `/loja/<slug>` no toque do avatar, do nome e do carrinho.
 * - `loja_nome` é o nome EXATO da loja no dataset (a view real faz join com
 *   `stores.nome`): abreviar aqui faria o feed anunciar um nome e a página da
 *   loja abrir com outro.
 * - `loja_inicial` é a primeira letra de `loja_nome`.
 * - São 24 posts com PAGINA = 20 na tela: a segunda página (4 itens) só
 *   aparece se o `lt` do MockQuery estiver funcionando — serve de teste vivo
 *   da paginação.
 */

export interface ExploreFeedRow {
  id: string
  tipo: 'video' | 'foto'
  loja_slug: string
  loja_nome: string
  loja_inicial: string
  media_url: string
  thumb_url: string | null
  descricao: string
  tags: string[]
  curtidas: number
  comentarios: number
  /** Só em `tipo: 'video'`; nas fotos é null. */
  duracao_seg: number | null
  publicado_em: string
  produto: { id: string; nome: string; preco: number } | null
}

export const EXPLORE_FEED: ExploreFeedRow[] = [
  {
    id: 'post-burger-house-01',
    tipo: 'video',
    loja_slug: 'burger-house',
    loja_nome: 'Burger House DV',
    loja_inicial: 'B',
    media_url:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Dois blends de 90g esmagados na chapa quente, cheddar derretendo por cima e bacon crocante. Sai em 18 minutos pra Divinópolis inteira.',
    tags: ['#smashburger', '#divinopolis', '#hamburgueria'],
    curtidas: 1842,
    comentarios: 137,
    duracao_seg: 28,
    publicado_em: '2026-08-10T21:10:00.000Z',
    produto: {
      id: 'prod-smash-duplo-bacon',
      nome: 'Smash Duplo Bacon',
      preco: 3290,
    },
  },
  {
    id: 'post-barbearia-fio-nobre-01',
    tipo: 'video',
    loja_slug: 'barbearia-fio-nobre',
    loja_nome: 'Barbearia Fio Nobre',
    loja_inicial: 'B',
    media_url:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Degradê na máquina zero, acabamento na navalha e toalha quente no fim. Agenda de sábado abre na segunda às 8h — corre que voa.',
    tags: ['#barbearia', '#degrade', '#navalha'],
    curtidas: 964,
    comentarios: 88,
    duracao_seg: 22,
    publicado_em: '2026-08-10T18:35:00.000Z',
    produto: null,
  },
  {
    id: 'post-atelie-camelia-01',
    tipo: 'foto',
    loja_slug: 'atelie-camelia',
    loja_nome: 'Ateliê Camélia',
    loja_inicial: 'A',
    media_url:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'O buquê do mês saiu do balde às 6h: lisianthus branco, eucalipto baby e três camélias abertas. Embrulho em papel kraft e fita de algodão.',
    tags: ['#floricultura', '#buque', '#feitoamao'],
    curtidas: 517,
    comentarios: 42,
    duracao_seg: null,
    publicado_em: '2026-08-10T14:20:00.000Z',
    produto: {
      id: 'prod-buque-camelia-mes',
      nome: 'Buquê Camélia do Mês',
      preco: 12900,
    },
  },
  {
    id: 'post-movimento-fisioterapia-01',
    tipo: 'video',
    loja_slug: 'movimento-fisioterapia',
    loja_nome: 'Movimento Fisioterapia',
    loja_inicial: 'M',
    media_url:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Três exercícios pra quem passa o dia sentado e sente a lombar travar no fim da tarde. Faça devagar, 10 repetições cada, sem forçar a dor.',
    tags: ['#fisioterapia', '#lombar', '#postura'],
    curtidas: 731,
    comentarios: 64,
    duracao_seg: 34,
    publicado_em: '2026-08-10T11:05:00.000Z',
    produto: null,
  },
  {
    id: 'post-cafe-aroma-01',
    tipo: 'foto',
    loja_slug: 'cafe-aroma',
    loja_nome: 'Café Aroma',
    loja_inicial: 'C',
    media_url:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Lote novo chegou do Cerrado Mineiro: torra média, notas de chocolate ao leite e castanha. Moemos na hora, do coado ao espresso.',
    tags: ['#cafe', '#cerradomineiro', '#torraartesanal'],
    curtidas: 623,
    comentarios: 51,
    duracao_seg: null,
    publicado_em: '2026-08-09T22:40:00.000Z',
    produto: {
      id: 'prod-cafe-coado-300',
      nome: 'Café Coado da Casa 300ml',
      preco: 990,
    },
  },
  {
    id: 'post-vira-lata-chique-01',
    tipo: 'video',
    loja_slug: 'vira-lata-chique',
    loja_nome: 'Vira-Lata Chique',
    loja_inicial: 'V',
    media_url:
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'O Tobias entrou parecendo um capacho e saiu galã. Banho com shampoo hipoalergênico, tosa higiênica e perfuminho de baunilha.',
    tags: ['#banhoetosa', '#petshop', '#viralatachique'],
    curtidas: 2314,
    comentarios: 196,
    duracao_seg: 19,
    publicado_em: '2026-08-09T19:15:00.000Z',
    produto: null,
  },
  {
    id: 'post-urban-wear-01',
    tipo: 'foto',
    loja_slug: 'urban-wear',
    loja_nome: 'Urban Wear',
    loja_inicial: 'U',
    media_url: 'https://picsum.photos/seed/post-urban-wear-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-urban-wear-01/300/400',
    descricao:
      'Moletom oversized em moletinho peluciado 320g, capuz duplo e punho canelado. Chegou nas cores cinza mescla, chumbo e off-white.',
    tags: ['#streetwear', '#moletom', '#oversized'],
    curtidas: 1156,
    comentarios: 74,
    duracao_seg: null,
    publicado_em: '2026-08-09T15:50:00.000Z',
    produto: {
      id: 'prod-moletom-oversized-cinza',
      nome: 'Moletom Oversized Cinza',
      preco: 18990,
    },
  },
  {
    id: 'post-dado-critico-01',
    tipo: 'foto',
    loja_slug: 'dado-critico',
    loja_nome: 'Dado Crítico',
    loja_inicial: 'D',
    media_url: 'https://picsum.photos/seed/post-dado-critico-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-dado-critico-01/300/400',
    descricao:
      'Mesa aberta toda quinta às 19h, sem custo e sem precisar levar nada. Essa semana: um dungeon crawler pra quatro jogadores, partida de 90 minutos.',
    tags: ['#jogosdetabuleiro', '#rpg', '#mesaaberta'],
    curtidas: 389,
    comentarios: 57,
    duracao_seg: null,
    publicado_em: '2026-08-09T12:30:00.000Z',
    produto: null,
  },
  {
    id: 'post-mecanica-beira-rio-01',
    tipo: 'video',
    loja_slug: 'mecanica-beira-rio',
    loja_nome: 'Mecânica Beira-Rio',
    loja_inicial: 'M',
    media_url: 'https://picsum.photos/seed/post-mecanica-beira-rio-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-mecanica-beira-rio-01/300/400',
    descricao:
      'Barulho de pastilha gasta tem som próprio — ouça aqui e compare com o seu. Revisão de freio com troca de pastilha sai no mesmo dia.',
    tags: ['#mecanica', '#freio', '#revisao'],
    curtidas: 276,
    comentarios: 39,
    duracao_seg: 41,
    publicado_em: '2026-08-08T20:05:00.000Z',
    produto: null,
  },
  {
    id: 'post-bella-cosmeticos-01',
    tipo: 'foto',
    loja_slug: 'bella-cosmeticos',
    loja_nome: 'Bella Cosméticos',
    loja_inicial: 'B',
    media_url:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Rotina da manhã em três passos: gel de limpeza, sérum de vitamina C a 10% e protetor com cor. Leva dois minutos e faz diferença em um mês.',
    tags: ['#skincare', '#vitaminac', '#rotinadamanha'],
    curtidas: 1478,
    comentarios: 121,
    duracao_seg: null,
    publicado_em: '2026-08-08T17:25:00.000Z',
    produto: {
      id: 'prod-serum-vitamina-c-30',
      nome: 'Sérum Vitamina C 30ml',
      preco: 8990,
    },
  },
  {
    id: 'post-nucleo-pilates-01',
    tipo: 'video',
    loja_slug: 'nucleo-pilates',
    loja_nome: 'Núcleo Pilates & Performance',
    loja_inicial: 'N',
    media_url:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Série de reformer pra fortalecer o core sem impacto no joelho. Turmas de no máximo quatro alunos, com avaliação postural antes da primeira aula.',
    tags: ['#pilates', '#reformer', '#core'],
    curtidas: 842,
    comentarios: 69,
    duracao_seg: 26,
    publicado_em: '2026-08-08T13:10:00.000Z',
    produto: null,
  },
  {
    id: 'post-sushi-yamato-01',
    tipo: 'foto',
    loja_slug: 'sushi-yamato',
    loja_nome: 'Sushi Yamato',
    loja_inicial: 'S',
    media_url:
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Combinado de 24 peças montado na hora: niguiri de salmão maçaricado, hossomaki de pepino e uramaki Filadélfia. Vem com gengibre e wasabi à parte.',
    tags: ['#sushi', '#combinado', '#japonesa'],
    curtidas: 1093,
    comentarios: 83,
    duracao_seg: null,
    publicado_em: '2026-08-07T23:45:00.000Z',
    produto: {
      id: 'prod-combinado-yamato-24',
      nome: 'Combinado Yamato 24 peças',
      preco: 12900,
    },
  },
  {
    id: 'post-tintas-aurora-01',
    tipo: 'foto',
    loja_slug: 'tintas-aurora',
    loja_nome: 'Tintas Aurora',
    loja_inicial: 'T',
    media_url: 'https://picsum.photos/seed/post-tintas-aurora-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-tintas-aurora-01/300/400',
    descricao:
      'Máquina de tingimento nova na loja: você traz a foto da parede e a gente fecha a cor na hora, em acrílico fosco ou acetinado.',
    tags: ['#tintas', '#reforma', '#coresobmedida'],
    curtidas: 214,
    comentarios: 26,
    duracao_seg: null,
    publicado_em: '2026-08-07T18:00:00.000Z',
    produto: {
      id: 'prod-tinta-acrilica-fosca-18l',
      nome: 'Tinta Acrílica Fosca 18L',
      preco: 32900,
    },
  },
  {
    id: 'post-esmalteria-lilas-01',
    tipo: 'video',
    loja_slug: 'esmalteria-lilas',
    loja_nome: 'Esmalteria Lilás',
    loja_inicial: 'E',
    media_url: 'https://picsum.photos/seed/post-esmalteria-lilas-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-esmalteria-lilas-01/300/400',
    descricao:
      'Francesinha invertida em tom lilás leitoso, feita em gel e com duração de três semanas. Cabine esterilizada e alicate individual por cliente.',
    tags: ['#nailart', '#unhasemgel', '#esmalteria'],
    curtidas: 1687,
    comentarios: 142,
    duracao_seg: 17,
    publicado_em: '2026-08-07T14:35:00.000Z',
    produto: null,
  },
  {
    id: 'post-mercado-central-01',
    tipo: 'foto',
    loja_slug: 'mercado-central',
    loja_nome: 'Mercado Central DV',
    loja_inicial: 'M',
    media_url:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Caminhão do hortifruti descarregou às 5h: tomate italiano, couve manteiga, banana-prata e manga palmer. Preço de quarta vale até sexta.',
    tags: ['#hortifruti', '#mercado', '#feiradasemana'],
    curtidas: 468,
    comentarios: 33,
    duracao_seg: null,
    publicado_em: '2026-08-06T21:20:00.000Z',
    produto: null,
  },
  {
    id: 'post-ponte-idiomas-01',
    tipo: 'foto',
    loja_slug: 'ponte-idiomas',
    loja_nome: 'Ponte Idiomas',
    loja_inicial: 'P',
    media_url:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Turma de conversação em inglês abriu duas vagas pro horário das 19h. Aula de 50 minutos, seis alunos no máximo e nivelamento gratuito.',
    tags: ['#ingles', '#conversacao', '#aulas'],
    curtidas: 341,
    comentarios: 47,
    duracao_seg: null,
    publicado_em: '2026-08-06T16:40:00.000Z',
    produto: null,
  },
  {
    id: 'post-amigo-fiel-pet-01',
    tipo: 'foto',
    loja_slug: 'amigo-fiel-pet',
    loja_nome: 'Amigo Fiel Pet & Banho',
    loja_inicial: 'A',
    media_url:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Chegou o lote novo de ração super premium com 32% de proteína e sem corante. Levamos até a sua porta no mesmo dia, sem taxa acima de 15kg.',
    tags: ['#racao', '#petshop', '#superpremium'],
    curtidas: 592,
    comentarios: 44,
    duracao_seg: null,
    publicado_em: '2026-08-06T12:15:00.000Z',
    produto: {
      id: 'prod-racao-premium-caes-15kg',
      nome: 'Ração Premium Cães Adultos 15kg',
      preco: 21990,
    },
  },
  {
    id: 'post-cesta-e-afeto-01',
    tipo: 'video',
    loja_slug: 'cesta-e-afeto',
    loja_nome: 'Cesta & Afeto',
    loja_inicial: 'C',
    media_url:
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Montagem da cesta de café da manhã: pão de queijo quentinho, geleia de amora artesanal, café da serra, queijo canastra e um cartão escrito à mão.',
    tags: ['#cestadecafe', '#presente', '#feitocomcarinho'],
    curtidas: 1265,
    comentarios: 108,
    duracao_seg: 24,
    publicado_em: '2026-08-05T20:50:00.000Z',
    produto: {
      id: 'prod-cesta-cafe-especial',
      nome: 'Cesta Café da Manhã Especial',
      preco: 15900,
    },
  },
  {
    id: 'post-casa-conforto-01',
    tipo: 'foto',
    loja_slug: 'casa-conforto',
    loja_nome: 'Casa & Conforto',
    loja_inicial: 'C',
    media_url:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Poltrona nórdica com estrutura em madeira maciça e revestimento em linho cru. Assento de 52cm, confortável até pra maratonar série.',
    tags: ['#decoracao', '#poltrona', '#salaaconchegante'],
    curtidas: 803,
    comentarios: 61,
    duracao_seg: null,
    publicado_em: '2026-08-05T15:30:00.000Z',
    produto: {
      id: 'prod-poltrona-nordica-linho',
      nome: 'Poltrona Nórdica Linho',
      preco: 89900,
    },
  },
  {
    id: 'post-divinolab-01',
    tipo: 'foto',
    loja_slug: 'divinolab',
    loja_nome: 'Divinolab Análises Clínicas',
    loja_inicial: 'D',
    media_url: 'https://picsum.photos/seed/post-divinolab-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-divinolab-01/300/400',
    descricao:
      'Check-up completo com hemograma, glicemia, colesterol e TSH. Coleta das 6h30 às 10h, sem agendamento, e resultado no app em 24 horas.',
    tags: ['#exames', '#checkup', '#saude'],
    curtidas: 257,
    comentarios: 31,
    duracao_seg: null,
    publicado_em: '2026-08-04T19:05:00.000Z',
    produto: null,
  },
  {
    id: 'post-garagem-37-01',
    tipo: 'video',
    loja_slug: 'garagem-37',
    loja_nome: 'Garagem 37',
    loja_inicial: 'G',
    media_url: 'https://picsum.photos/seed/post-garagem-37-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-garagem-37-01/300/400',
    descricao:
      'Polimento em três etapas num prata que tinha 12 anos de sol. Corte, refino e lustro, mais vitrificação de cerâmica que segura seis meses.',
    tags: ['#esteticaautomotiva', '#polimento', '#vitrificacao'],
    curtidas: 1974,
    comentarios: 153,
    duracao_seg: 37,
    publicado_em: '2026-08-04T13:45:00.000Z',
    produto: null,
  },
  {
    id: 'post-clave-nove-01',
    tipo: 'foto',
    loja_slug: 'clave-nove',
    loja_nome: 'Clave Nove Estúdio',
    loja_inicial: 'C',
    media_url: 'https://picsum.photos/seed/post-clave-nove-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-clave-nove-01/300/400',
    descricao:
      'Em quatro aulas você tira os quatro acordes que tocam metade do sertanejo. Violão emprestado durante a aula, é só chegar.',
    tags: ['#violao', '#aulademusica', '#clavenove'],
    curtidas: 436,
    comentarios: 52,
    duracao_seg: null,
    publicado_em: '2026-08-03T18:20:00.000Z',
    produto: null,
  },
  {
    id: 'post-passo-certo-calcados-01',
    tipo: 'foto',
    loja_slug: 'passo-certo-calcados',
    loja_nome: 'Passo Certo Calçados',
    loja_inicial: 'P',
    media_url:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&h=1600&q=80&auto=format&fit=crop',
    thumb_url:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=400&q=80&auto=format&fit=crop',
    descricao:
      'Tênis de corrida em malha 3D respirável, entressola em EVA de dupla densidade e apenas 248g no pé. Do 37 ao 44, em três cores.',
    tags: ['#tenis', '#corrida', '#calcados'],
    curtidas: 1321,
    comentarios: 96,
    duracao_seg: null,
    publicado_em: '2026-08-02T21:00:00.000Z',
    produto: {
      id: 'prod-tenis-runner-malha-3d',
      nome: 'Tênis Runner Malha 3D',
      preco: 27990,
    },
  },
  {
    id: 'post-confete-e-cia-01',
    tipo: 'video',
    loja_slug: 'confete-e-cia',
    loja_nome: 'Confete & Cia Festas',
    loja_inicial: 'C',
    media_url: 'https://picsum.photos/seed/post-confete-e-cia-01/900/1600',
    thumb_url: 'https://picsum.photos/seed/post-confete-e-cia-01/300/400',
    descricao:
      'Kit de festa pronto em 40 segundos: painel de balão desconstruído, 30 itens de mesa e topo de bolo personalizado com o nome do aniversariante.',
    tags: ['#festa', '#baloes', '#aniversario'],
    curtidas: 2087,
    comentarios: 174,
    duracao_seg: 15,
    publicado_em: '2026-08-01T16:10:00.000Z',
    produto: {
      id: 'prod-kit-festa-confete-30',
      nome: 'Kit Festa Confete 30 itens',
      preco: 7490,
    },
  },
]
