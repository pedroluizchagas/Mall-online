/**
 * Vitrines — o LAYOUT próprio de um arquétipo.
 *
 * Pele (tokens) e vitrine (layout) são eixos distintos: `resolveTheme` veste
 * qualquer loja com qualquer um dos 21 arquétipos; `resolveVitrine` diz se,
 * além da pele, a loja ganha uma fachada desenhada sob medida (docs/store-theme/05
 * §5.6). A vitrine SEGUE O ESTILO escolhido, em qualquer ramo (decisão do
 * produto em 2026-10-17: o lojista via só algumas vitrines no preview e o resto
 * caía no layout padrão). As `categorias` de cada vitrine são os ramos para os
 * quais ela foi desenhada — viram sugestão no editor, não restrição.
 *
 * Esta tabela é a ÚNICA fonte da decisão: consumer (RN), storefront (Next) e o
 * editor do lojista leem daqui. Vitrine nova = entrada nova aqui + componentes
 * nas superfícies; o teste em `__tests__/vitrines.test.ts` cobra a paridade.
 */
import type { ArquetipoCodigo } from './types'
import type { CategoriaSlug } from '../templates/mapping'
import { ARQUETIPOS } from './presets'
import { CATEGORIA_SLUG_TO_ARQUETIPO, getArquetipoSugestao } from './mapping'

/**
 * Molde da barra de navegação inferior que a vitrine desenha (regra do
 * produto: toda loja mostra a régua do shell). `fixa` = colada na base com
 * fio; `pilula` = flutuante, quando a página troca de cor por seção.
 */
export type MoldeBarra = 'fixa' | 'pilula'

export interface Vitrine {
  readonly codigo: string
  /** Nome de exibição para o lojista ("Vitrine ativada: Forno"). */
  readonly nome: string
  readonly arquetipo: ArquetipoCodigo
  /** Ramos para os quais a vitrine foi desenhada — sugestão no editor; vale em qualquer ramo. */
  readonly categorias: readonly CategoriaSlug[]
  readonly barra: MoldeBarra
  /** Nomes dos componentes no consumer (`components/loja/`), para a guarda. */
  readonly componentes: { readonly vitrine: string; readonly pdp: string }
  readonly descricao: string
}

export const VITRINES = {
  editorial: {
    codigo: 'editorial',
    nome: 'Editorial',
    arquetipo: 'editorial',
    categorias: ['vestuario-calcados', 'beleza-cosmeticos', 'acessorios-joias'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaEditorial', pdp: 'ProdutoEditorial' },
    descricao: 'Hero full-bleed com carrossel, rail 3:4 e seções compactas.',
  },
  raw: {
    codigo: 'raw',
    nome: 'Raw',
    arquetipo: 'raw',
    categorias: ['vestuario-calcados'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaRaw', pdp: 'ProdutoRaw' },
    descricao: 'Brutalista: faixa CTA no accent, molduras grossas, mono caps.',
  },
  serena: {
    codigo: 'serena',
    nome: 'Serena',
    arquetipo: 'serene',
    categorias: ['beleza-cosmeticos', 'acessorios-joias', 'saloes-estetica'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaSerena', pdp: 'ProdutoSereno' },
    descricao: 'Delicada: header claro, abas, cards no cinza-névoa.',
  },
  artesa: {
    codigo: 'artesa',
    nome: 'Artesã',
    arquetipo: 'artisan',
    categorias: ['casa-decoracao', 'floricultura-plantas'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaArtesa', pdp: 'ProdutoArtesao' },
    descricao: 'Portfólio de ateliê: seções numeradas, bandas de foto, ficha técnica.',
  },
  noir: {
    codigo: 'noir',
    nome: 'Noir',
    arquetipo: 'noir',
    categorias: ['alimentos-bebidas'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaNoir', pdp: 'ProdutoNoir' },
    descricao: 'Fine dining: cardápio-livro em serifa, preto, marfim e dourado.',
  },
  volt: {
    codigo: 'volt',
    nome: 'Volt',
    arquetipo: 'volt',
    categorias: ['vestuario-calcados', 'saude-bem-estar'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaVolt', pdp: 'ProdutoVolt' },
    descricao: 'Fitness: faixa-anúncio, ticker marquee, caps pesadas.',
  },
  clinica: {
    codigo: 'clinica',
    nome: 'Clínica',
    arquetipo: 'clinic',
    categorias: ['farmacia-medicamentos', 'saude-bem-estar', 'veterinaria'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaClinica', pdp: 'ProdutoClinico' },
    descricao: 'Utilidade: busca flutuante, abas, adição rápida, selo de receita.',
  },
  torra: {
    codigo: 'torra',
    nome: 'Torra',
    arquetipo: 'roast',
    categorias: ['alimentos-bebidas'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaTorra', pdp: 'ProdutoTorra' },
    descricao: 'Pôster retrô: palavra repetida em âmbar, produto flutuando.',
  },
  smash: {
    codigo: 'smash',
    nome: 'Smash',
    arquetipo: 'smash',
    categorias: ['alimentos-bebidas'],
    barra: 'pilula',
    componentes: { vitrine: 'LojaSmash', pdp: 'ProdutoSmash' },
    descricao: 'Hamburgueria: manchete de apetite, molduras coloridas, combos.',
  },
  ritual: {
    codigo: 'ritual',
    nome: 'Ritual',
    arquetipo: 'ritual',
    categorias: ['alimentos-bebidas'],
    barra: 'pilula',
    componentes: { vitrine: 'LojaRitual', pdp: 'ProdutoRitual' },
    descricao: 'Açaíteria lifestyle: cartões flutuando no rosa, ESPECIAIS gigante.',
  },
  magazine: {
    codigo: 'magazine',
    nome: 'Magazine',
    arquetipo: 'magazine',
    categorias: ['outros'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaMagazine', pdp: 'ProdutoMagazine' },
    descricao: 'Varejo clássico: wordmark serifado, tiles por categoria, ofertas.',
  },
  horta: {
    codigo: 'horta',
    nome: 'Horta',
    arquetipo: 'garden',
    categorias: ['alimentos-bebidas', 'saude-bem-estar'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaHorta', pdp: 'ProdutoHorta' },
    descricao: 'Comida saudável: creme e verde-floresta, selos recortados, fotos-adesivo.',
  },
  forno: {
    codigo: 'forno',
    nome: 'Forno',
    arquetipo: 'slice',
    categorias: ['alimentos-bebidas'],
    barra: 'pilula',
    componentes: { vitrine: 'LojaForno', pdp: 'ProdutoForno' },
    descricao: 'Pizzaria: blocos preto/ouro/vermelho, disco gigante, cardápio-pôster.',
  },
  passarela: {
    codigo: 'passarela',
    nome: 'Passarela',
    arquetipo: 'mono',
    categorias: ['vestuario-calcados'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaPassarela', pdp: 'ProdutoPassarela' },
    descricao: 'Moda monocromática: fotografia P&B, compra na própria grade.',
  },
  mesa: {
    codigo: 'mesa',
    nome: 'Mesa',
    arquetipo: 'heritage',
    categorias: ['alimentos-bebidas'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaMesa', pdp: 'ProdutoMesa' },
    descricao: 'Casa de tradição: serifa, creme, foto full-bleed, selo e cardápio-livro.',
  },
  gondola: {
    codigo: 'gondola',
    nome: 'Gôndola',
    arquetipo: 'market',
    categorias: ['mercado-conveniencia', 'construcao-ferramentas', 'oficinas-manutencao'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaGondola', pdp: 'ProdutoGondola' },
    descricao: 'Mercado: busca e chips grudados, grade densa com preço grande e adição rápida.',
  },
  cuidado: {
    codigo: 'cuidado',
    nome: 'Cuidado',
    arquetipo: 'soft',
    categorias: ['saloes-estetica', 'pet-shop', 'veterinaria'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaCuidado', pdp: 'ProdutoCuidado' },
    descricao: 'Acolhedora: cartão de boas-vindas, stats, pacotes com checklist e lista arredondada.',
  },
  feira: {
    codigo: 'feira',
    nome: 'Feira',
    arquetipo: 'fresh',
    categorias: ['mercado-conveniencia', 'alimentos-bebidas'],
    barra: 'fixa',
    componentes: { vitrine: 'LojaFeira', pdp: 'ProdutoFeira' },
    descricao: 'Hortifruti: hero-cartão verde, chips de foto, ofertas com cronômetro.',
  },
} as const satisfies Record<string, Vitrine>

export type VitrineCodigo = keyof typeof VITRINES

const LISTA: readonly Vitrine[] = Object.values(VITRINES)

/**
 * A vitrine que a loja veste: a do estilo escolhido, em qualquer ramo.
 * `null` = estilo sem vitrine (tech, utility, playful) ou loja sem estilo —
 * só pele + layout padrão. Defensivo: aceita `preset` nulo ou desconhecido.
 */
export function resolveVitrine(preset: ArquetipoCodigo | string | null | undefined): VitrineCodigo | null {
  if (!preset) return null
  const hit = LISTA.find((v) => v.arquetipo === preset)
  return (hit?.codigo as VitrineCodigo | undefined) ?? null
}

/** A vitrine de um arquétipo como objeto (nome, descrição, ramos), ou `null`. */
export function getVitrineDoArquetipo(
  preset: ArquetipoCodigo | string | null | undefined,
): Vitrine | null {
  if (!preset) return null
  return LISTA.find((v) => v.arquetipo === preset) ?? null
}

/** Arquétipos que hoje só têm pele (candidatos a vitrine nova). */
export const ARQUETIPOS_SEM_VITRINE: readonly ArquetipoCodigo[] = (
  Object.keys(ARQUETIPOS) as ArquetipoCodigo[]
).filter((codigo) => !LISTA.some((v) => v.arquetipo === codigo))

/**
 * Como o editor apresenta as opções para uma categoria — pelo que o lojista
 * ganha, não como 21 peles indistintas:
 *  - `sugeridas`: vitrines desenhadas para este ramo, na ordem da sugestão da
 *    categoria (o default antes das alternativas);
 *  - `outras`: as demais vitrines — valem aqui também (a vitrine segue o
 *    estilo), agrupadas pelo ramo para o qual foram desenhadas;
 *  - `soPele`: estilos sem vitrine nenhuma — cores, tipografia e forma sobre
 *    o layout padrão —, os sugeridos para a categoria primeiro;
 *  - `recomendado`: o que o editor destaca e o onboarding pré-seleciona — a
 *    primeira vitrine sugerida, para a loja já nascer com layout próprio (em
 *    joias, construção e oficinas o default de pele não é vitrine do ramo);
 *    sem nenhuma, o default de sempre.
 * Categoria nula ou desconhecida → nada sugerido nem recomendado; todas as
 * vitrines continuam disponíveis.
 */
export interface OpcoesDeVitrine {
  sugeridas: readonly Vitrine[]
  outras: readonly Vitrine[]
  soPele: readonly ArquetipoCodigo[]
  recomendado: ArquetipoCodigo | null
}

/** Ordem canônica dos ramos — agrupa as `outras` vitrines por família. */
const ORDEM_DOS_RAMOS: readonly string[] = Object.keys(CATEGORIA_SLUG_TO_ARQUETIPO)

export function getOpcoesDeVitrine(categoriaSlug: string | null | undefined): OpcoesDeVitrine {
  const conhecida = !!categoriaSlug && categoriaSlug in CATEGORIA_SLUG_TO_ARQUETIPO
  const { default: padrao, alternativas } = getArquetipoSugestao(categoriaSlug)
  const sugeridos: ArquetipoCodigo[] = conhecida ? [padrao, ...alternativas] : []
  const posicao = (a: ArquetipoCodigo) => {
    const i = sugeridos.indexOf(a)
    return i === -1 ? sugeridos.length : i
  }
  const sugeridas = LISTA.filter(
    (v) => !!categoriaSlug && (v.categorias as readonly string[]).includes(categoriaSlug),
  ).sort((a, b) => posicao(a.arquetipo) - posicao(b.arquetipo))
  const ramo = (v: Vitrine) => ORDEM_DOS_RAMOS.indexOf(v.categorias[0])
  const outras = LISTA.filter((v) => !sugeridas.includes(v)).sort((a, b) => ramo(a) - ramo(b))
  const soPele = [...ARQUETIPOS_SEM_VITRINE].sort((a, b) => posicao(a) - posicao(b))
  return {
    sugeridas,
    outras,
    soPele,
    recomendado: conhecida ? (sugeridas[0]?.arquetipo ?? padrao) : null,
  }
}
