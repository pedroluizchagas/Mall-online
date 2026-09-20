/**
 * Vitrines — o LAYOUT próprio que um arquétipo ganha em certas categorias.
 *
 * Pele (tokens) e vitrine (layout) são eixos distintos: `resolveTheme` veste
 * qualquer loja com qualquer um dos 21 arquétipos; `resolveVitrine` decide se,
 * além da pele, a loja ganha uma fachada desenhada sob medida (docs/store-theme/05
 * §5.6). O gate é `preset × categoria_slug` — nunca por slug de loja.
 *
 * Esta tabela é a ÚNICA fonte da decisão: consumer (RN), storefront (Next) e o
 * editor do lojista leem daqui. Vitrine nova = entrada nova aqui + componentes
 * nas superfícies; o teste em `__tests__/vitrines.test.ts` cobra a paridade.
 */
import type { ArquetipoCodigo } from './types'
import type { CategoriaSlug } from '../templates/mapping'
import { ARQUETIPOS } from './presets'

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
  /** Categorias em que este arquétipo ganha a vitrine (fora delas: só pele). */
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
 * Decide a vitrine de uma loja. `null` = só pele + layout padrão.
 * Defensivo: aceita `preset`/`categoria` nulos (loja sem tema, categoria nova).
 */
export function resolveVitrine(
  preset: ArquetipoCodigo | string | null | undefined,
  categoriaSlug: string | null | undefined,
): VitrineCodigo | null {
  if (!preset || !categoriaSlug) return null
  const hit = LISTA.find(
    (v) =>
      v.arquetipo === preset &&
      (v.categorias as readonly string[]).includes(categoriaSlug),
  )
  return (hit?.codigo as VitrineCodigo | undefined) ?? null
}

/**
 * A vitrine que um arquétipo PODE ativar (independente da categoria) — para o
 * editor dizer "este estilo tem a vitrine Forno em Alimentos & Bebidas" ou
 * "este estilo usa o layout padrão".
 */
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
