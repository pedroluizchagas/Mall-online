'use client'

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { formatarHorario, horarioDeHoje, normalizarHorarios, relogioDaLoja, type DiaSemana } from '@mallevo/lib'

import {
  Sacola,
  StatusAberto,
  precoFinalDe,
  prefereMenosMovimento,
  useHeroEmCena,
  useReduzirMovimento,
  useRelogioDaLoja,
} from '@/components/vitrines/_base'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import type { Store } from '@/lib/tenant'
import { EtiquetaTipo, IconeTraco, PrecoArtesa, tipoDe } from './artesa-ui'
import { MIN_BANDAS, type BandaArtesa, type DadosArtesa } from './artesa-dados'

/**
 * Vitrine artesã no COMPUTADOR (≥768px) — a página de portfólio que o porte
 * do app só podia insinuar em largura de celular, composta contra o desktop
 * da referência de estúdio de interiores (intrstudio): tipo gigante e leve,
 * muito ar, fotos assimétricas, rótulos entre parênteses, faixa escura de
 * serviços que acende a foto no hover, banda de chamada e rodapé completo.
 *
 * Mesmos dados do celular (`useDadosArtesa`), outra composição:
 * - hero de TELA CHEIA com o nome centralizado e a PÍLULA de vidro no pé
 *   (índice · "Ver peças" + seta · sacola), a dica "Role" e o relógio vivo;
 * - barra ESPRESSO (accent) que desce quando o hero sai de cena — o mesmo
 *   gesto do header do celular — com coleções, índice e sacola;
 * - "(O ateliê)": statement em dois tons + fotos assimétricas + números
 *   REAIS da loja (prazo, peças, taxa) — nunca "anos de experiência";
 * - "(Peças em destaque)": a galeria assimétrica (3:2 + quadrada, par
 *   centrado) com os destaques do lojista ou uma peça de cada coleção;
 * - "(O que fazemos)": as bandas do celular viram LINHAS numa faixa escura;
 * - "(Coleções)": tabuleiro foto/ficha que leva a cada seção do catálogo;
 * - catálogo: a 1ª seção em TRILHO de cartões retrato com setas finas e
 *   contador (o carrossel do celular), as demais em grade;
 * - "(Como pedir)", fotos da casa, banda de chamada com o "hoje" da loja e
 *   rodapé escuro com o nome gigante, as coleções e a semana de horários.
 *
 * Âncoras com prefixo `artesa-` (o celular usa `atelie`/`secao-*`): as duas
 * composições estão no DOM, uma delas em `display: none`.
 *
 * A sacola é UMA `Sacola` em volta da página inteira: o `CartDrawer` precisa
 * nascer FORA da barra (que anda com `transform`) e da pílula (vidro com
 * `backdrop-filter`) — os dois viram bloco de contenção de `position: fixed`.
 */

const CONTEINER = 'mx-auto w-full max-w-[1600px] px-[clamp(24px,3.2vw,48px)]'
/** Respiro entre seções — o ar da referência. */
const RESPIRO = 'pt-[clamp(96px,11vw,176px)]'
/** Âncora para abaixo da barra espresso. */
const SCROLL_MT = 'scroll-mt-[calc(var(--inset-top,0px)+88px)]'
const ALTURA_BARRA = 68

const ANCORA = {
  topo: 'artesa-topo',
  atelie: 'artesa-atelie',
  destaques: 'artesa-destaques',
  criacoes: 'artesa-criacoes',
  colecoes: 'artesa-colecoes',
  comoPedir: 'artesa-como-pedir',
  casa: 'artesa-casa',
  contato: 'artesa-contato',
} as const

const ancoraDaSecao = (chave: string) => `artesa-secao-${chave}`

/** O carrossel da 1ª coleção só vira trilho com peças para rolar (≈4 cabem na tela). */
const MIN_TRILHO = 5

/** Curva de ENTRADA do sistema (bezier 0.16, 1, 0.3, 1). */
const ENTRADA = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** Véu do hero: escurece por igual (o nome é centralizado) e adensa no pé, onde mora a pílula. */
const VEU_HERO =
  'linear-gradient(to bottom, rgba(20,16,10,0.34) 0%, rgba(20,16,10,0.24) 38%, rgba(20,16,10,0.30) 68%, rgba(20,16,10,0.62) 100%)'
/** Véu da banda de chamada: lê da esquerda (texto) e deixa a foto respirar à direita. */
const VEU_CHAMADA =
  'linear-gradient(90deg, rgba(20,16,10,0.70) 0%, rgba(20,16,10,0.36) 58%, rgba(20,16,10,0.20) 100%), linear-gradient(to top, rgba(20,16,10,0.50), rgba(20,16,10,0) 55%)'
/** Linha acesa de "O que fazemos": a foto entra por trás do texto claro. */
const VEU_LINHA = 'linear-gradient(90deg, rgba(20,16,10,0.76) 0%, rgba(20,16,10,0.40) 100%)'

interface EstadoSacola {
  abrir: () => void
  totalItens: number
  total: number
}

interface ItemIndice {
  id: string
  rotulo: string
}

// ─────────────────────────────────────────────────────────────
// Leituras puras
// ─────────────────────────────────────────────────────────────

function rolarAte(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefereMenosMovimento() ? 'auto' : 'smooth', block: 'start' })
}

/** Link interno que rola com a curva do sistema (e respeita "reduzir movimento"). */
function aoClicarAncora(id: string, ir: (id: string) => void) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    ir(id)
  }
}

const dois = (n: number) => String(n).padStart(2, '0')
const contarPecas = (n: number) => `${n} ${n === 1 ? 'peça' : 'peças'}`
const contarColecoes = (n: number) => `${n} ${n === 1 ? 'coleção' : 'coleções'}`
const rotuloSacola = (n: number) => (n > 0 ? `Sacola, ${n} ${n === 1 ? 'item' : 'itens'}` : 'Sacola vazia')

/** "R$ 12" quando é inteiro — número de vitrine, não de recibo. */
function reaisCurtos(centavos: number): string {
  return centavos % 100 === 0 ? `R$ ${centavos / 100}` : formatarReais(centavos)
}

/** "37999142677" → "(37) 99914-2677"; o que não for número BR de 10/11 dígitos passa como veio. */
function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
}

/** O nome é o hero: quanto mais longo, menor — sem nunca virar parágrafo. */
function tamanhoDoNome(nome: string): string {
  const n = nome.trim().length
  const vw = n <= 10 ? 11.5 : n <= 16 ? 8.4 : n <= 24 ? 6.4 : 5
  return `clamp(56px, min(${vw}vw, 19vh), 184px)`
}

function tamanhoDoNomeRodape(nome: string): string {
  const n = nome.trim().length
  const vw = n <= 10 ? 7.4 : n <= 18 ? 5.2 : 3.8
  return `clamp(44px, ${vw}vw, 124px)`
}

/**
 * Peças da galeria assimétrica: os destaques do lojista (com foto) na ordem
 * dele; sem escolha, uma peça de cada coleção — a vitrine mostra a amplitude
 * da casa em vez de repetir a primeira seção, que já vem logo abaixo.
 */
function escolherDestaques(ids: string[] | undefined, todos: ProdutoCatalogo[], secoes: SecaoCatalogo[]): ProdutoCatalogo[] {
  const comFoto = (p: ProdutoCatalogo) => !!p.foto_url
  const doLojista = (ids ?? [])
    .map((id) => todos.find((p) => p.id === id))
    .filter((p): p is ProdutoCatalogo => !!p && comFoto(p))
  if (doLojista.length > 0) return doLojista.slice(0, 4)

  const out: ProdutoCatalogo[] = []
  for (const s of secoes) {
    const p = s.produtos.find(comFoto)
    if (p) out.push(p)
    if (out.length === 4) return out
  }
  for (const p of todos) {
    if (out.length === 4) break
    if (comFoto(p) && !out.includes(p)) out.push(p)
  }
  return out
}

/**
 * Fotos de cena (ateliê, faixa escura, chamada): a galeria da casa primeiro;
 * depois fotos de peças que NÃO estão nos destaques, do fim do catálogo para
 * o começo — para repetir o mínimo numa loja de poucas fotos.
 */
function fotosDeCena(galeria: string[], todos: ProdutoCatalogo[], destaques: ProdutoCatalogo[]): string[] {
  const nosDestaques = new Set(destaques.map((p) => p.foto_url))
  const fotos = todos.map((p) => p.foto_url).filter((u): u is string => !!u)
  const foraDosDestaques = [...fotos].reverse().filter((u) => !nosDestaques.has(u))
  return [...new Set([...galeria, ...foraDosDestaques, ...fotos])]
}

/** Os números do ateliê — só o que a loja de fato informa. */
function numerosDaLoja(store: Store, totalPecas: number, totalColecoes: number): { valor: string; rotulo: string }[] {
  const out: { valor: string; rotulo: string }[] = []
  if (store.tempo_entrega != null) out.push({ valor: `${store.tempo_entrega} min`, rotulo: 'Tempo de entrega' })
  if (totalPecas > 0) out.push({ valor: String(totalPecas), rotulo: totalPecas === 1 ? 'Peça na vitrine' : 'Peças na vitrine' })
  if (store.taxa_entrega != null) {
    out.push({ valor: store.taxa_entrega === 0 ? 'Grátis' : reaisCurtos(store.taxa_entrega), rotulo: 'Taxa de entrega' })
  } else if (totalColecoes > 1) {
    out.push({ valor: String(totalColecoes), rotulo: 'Coleções' })
  }
  return out.slice(0, 3)
}

/** Como pedir, com o que a loja aceita e cobra de verdade (storefront é só online). */
function passosDoPedido(store: Store): { titulo: string; texto: string }[] {
  const formas = [store.aceita_pix ? 'Pix' : null, store.aceita_cartao_online ? 'cartão de crédito' : null].filter(
    (f): f is string => !!f,
  )
  const pagar =
    formas.length === 2
      ? 'Pix ou cartão de crédito, direto aqui no site.'
      : formas.length === 1
        ? `${formas[0].charAt(0).toUpperCase()}${formas[0].slice(1)}, direto aqui no site.`
        : 'As formas de pagamento aparecem ao finalizar o pedido.'
  const entrega = [
    store.tempo_entrega != null ? `em cerca de ${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'com entrega grátis' : store.taxa_entrega != null ? `com taxa de ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((t): t is string => !!t)
  return [
    { titulo: 'Escolha a peça', texto: 'Abra cada peça para ver os detalhes e coloque na sacola o que quiser levar.' },
    { titulo: 'Pague online', texto: pagar },
    {
      titulo: 'Receba em casa',
      texto: entrega.length > 0 ? `Entrega no seu endereço ${entrega.join(', ')}.` : 'Entrega no endereço que você escolher.',
    },
  ]
}

const SEMANA: { dia: DiaSemana; abrev: string }[] = [
  { dia: 'seg', abrev: 'Seg' },
  { dia: 'ter', abrev: 'Ter' },
  { dia: 'qua', abrev: 'Qua' },
  { dia: 'qui', abrev: 'Qui' },
  { dia: 'sex', abrev: 'Sex' },
  { dia: 'sab', abrev: 'Sáb' },
  { dia: 'dom', abrev: 'Dom' },
]

/** A semana em faixas: "Seg – Sex 08:00–18:00", "Sáb 08:00–12:00", "Dom Fechado". */
function semanaDaLoja(raw: unknown): { dias: string; horario: string }[] | null {
  const horarios = normalizarHorarios(raw)
  if (!horarios) return null
  const faixas: { de: string; ate: string; horario: string }[] = []
  for (const { dia, abrev } of SEMANA) {
    const h = horarios[dia]
    const horario = h ? formatarHorario(h) : 'Fechado'
    const ultima = faixas[faixas.length - 1]
    if (ultima && ultima.horario === horario) ultima.ate = abrev
    else faixas.push({ de: abrev, ate: abrev, horario })
  }
  return faixas.map((f) => ({ dias: f.de === f.ate ? f.de : `${f.de} – ${f.ate}`, horario: f.horario }))
}

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────

export function ArtesaDesktop({
  store,
  dados,
  aoAbrirProduto,
}: {
  store: Store
  dados: DadosArtesa
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const { conteudo, campanha, secoesComItens, todos, slides, galeriaCasa, bandas } = dados
  const { heroRef, emCena: heroEmCena } = useHeroEmCena<HTMLElement>()
  const [indiceAberto, setIndiceAberto] = useState(false)

  const destaques = useMemo(
    () => escolherDestaques(conteudo.destaques, todos, secoesComItens),
    [conteudo.destaques, todos, secoesComItens],
  )
  const fotos = useMemo(() => fotosDeCena(galeriaCasa, todos, destaques), [galeriaCasa, todos, destaques])

  const heroImagem = store.banner_url ?? destaques[0]?.foto_url ?? fotos[0] ?? null
  // Sob o nome: a voz da campanha; sem ela, a descrição quando o statement
  // já usa o manifesto (nunca o mesmo texto duas vezes seguidas).
  const apoio =
    campanha?.subtitulo ??
    campanha?.eyebrow ??
    (conteudo.manifesto && store.descricao && store.descricao.trim() !== conteudo.manifesto.trim() ? store.descricao : null) ??
    slides[0]?.apoio ??
    null
  // Faixa escura: a descrição, quando o statement do ateliê é o manifesto.
  const textoEscuro =
    conteudo.manifesto && store.descricao && store.descricao.trim() !== conteudo.manifesto.trim() && apoio !== store.descricao
      ? store.descricao
      : null

  const primeiraSecao = secoesComItens[0] ? ancoraDaSecao(secoesComItens[0].chave) : ANCORA.atelie
  const alvoPecas = destaques.length > 0 ? ANCORA.destaques : primeiraSecao

  const irPara = useCallback((id: string) => rolarAte(id), [])
  const verPecas = useCallback(() => rolarAte(alvoPecas), [alvoPecas])
  const abrirIndice = useCallback(() => setIndiceAberto(true), [])
  const fecharIndice = useCallback(() => setIndiceAberto(false), [])
  const irPeloIndice = useCallback((id: string) => {
    setIndiceAberto(false)
    requestAnimationFrame(() => rolarAte(id))
  }, [])

  const temCatalogo = todos.length > 0
  const itensDaLoja: ItemIndice[] = [
    { id: ANCORA.atelie, rotulo: 'O ateliê' },
    ...(temCatalogo && destaques.length > 0 ? [{ id: ANCORA.destaques, rotulo: 'Peças em destaque' }] : []),
    ...(temCatalogo && bandas.length >= MIN_BANDAS ? [{ id: ANCORA.criacoes, rotulo: 'O que fazemos' }] : []),
    ...(temCatalogo && secoesComItens.length > 1 ? [{ id: ANCORA.colecoes, rotulo: 'Coleções' }] : []),
    ...(temCatalogo ? [{ id: ANCORA.comoPedir, rotulo: 'Como pedir' }] : []),
    ...(galeriaCasa.length > 0 ? [{ id: ANCORA.casa, rotulo: 'A casa' }] : []),
    { id: ANCORA.contato, rotulo: 'Contato' },
  ]

  return (
    <Sacola>
      {(sacola) => (
        <>
          <BarraEspresso
            store={store}
            visivel={!heroEmCena}
            secoes={secoesComItens}
            sacola={sacola}
            aoIrPara={irPara}
            aoAbrirIndice={abrirIndice}
          />

          <HeroDesktop
            ref={heroRef}
            store={store}
            titulo={campanha?.titulo ?? store.nome}
            apoio={apoio}
            cta={campanha?.cta ?? 'Ver peças'}
            imagem={heroImagem}
            sacola={sacola}
            aoVerPecas={verPecas}
            aoAbrirIndice={abrirIndice}
            aoRolar={() => irPara(ANCORA.atelie)}
          />

          <AtelieDesktop store={store} dados={dados} fotos={[fotos[0], fotos[1]]} aoVerPecas={verPecas} />

          {temCatalogo ? (
            <>
              <DestaquesDesktop pecas={destaques} aoAbrirProduto={aoAbrirProduto} aoVerTodas={() => irPara(primeiraSecao)} />
              <CriacoesDesktop bandas={bandas} texto={textoEscuro} foto={fotos[2] ?? null} aoAbrirProduto={aoAbrirProduto} />
              <ColecoesDesktop secoes={secoesComItens} aoIrPara={irPara} />
              {secoesComItens.map((secao, i) => (
                <SecaoCatalogoDesktop
                  key={secao.chave}
                  secao={secao}
                  numero={i + 1}
                  trilho={i === 0 && secao.produtos.length >= MIN_TRILHO}
                  aoAbrirProduto={aoAbrirProduto}
                />
              ))}
              <ComoPedirDesktop store={store} />
            </>
          ) : (
            <VazioDesktop nome={store.nome} />
          )}

          <CasaDesktop fotos={galeriaCasa} nome={store.nome} />

          {temCatalogo && <ChamadaDesktop store={store} imagem={fotos[3] ?? store.banner_url ?? fotos[0] ?? null} aoVerPecas={verPecas} />}

          <RodapeDesktop store={store} secoes={secoesComItens} itens={itensDaLoja} aoIrPara={irPara} />

          {indiceAberto && (
            <IndiceDesktop store={store} secoes={secoesComItens} itens={itensDaLoja} aoIr={irPeloIndice} aoFechar={fecharIndice} />
          )}
        </>
      )}
    </Sacola>
  )
}

// ─────────────────────────────────────────────────────────────
// Peças pequenas
// ─────────────────────────────────────────────────────────────

/** Rótulo de seção entre parênteses — "(Peças em destaque)", como na referência. */
function Rotulo({ children, claro = false, como: Tag = 'h2' }: { children: ReactNode; claro?: boolean; como?: 'h2' | 'p' }) {
  return (
    <Tag className={`font-display text-[17px] font-bold tracking-[-0.01em] ${claro ? 'text-canvas' : 'text-ink'}`}>({children})</Tag>
  )
}

/** CTA em duas peças — pill + círculo com seta que gira no hover. */
function CtaDuplo({
  rotulo,
  tom,
  aoTocar,
  className = '',
}: {
  rotulo: string
  tom: 'escuro' | 'claro'
  aoTocar: () => void
  className?: string
}) {
  const pele = tom === 'claro' ? 'bg-white text-ink group-hover:bg-white/90' : 'bg-ink text-canvas group-hover:bg-ink/90'
  return (
    <button type="button" onClick={aoTocar} className={`group inline-flex items-center gap-1 ${className}`}>
      <span className={`flex h-12 items-center rounded-pill px-7 font-body text-[15px] font-medium transition-colors ${pele}`}>{rotulo}</span>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${pele}`} aria-hidden>
        <IconeTraco nome="arrow-up-right" tamanho={18} espessura={1.7} className="transition-transform duration-300 group-hover:rotate-45" />
      </span>
    </button>
  )
}

function LogoDaCasa({ nome, logoUrl, tamanho }: { nome: string; logoUrl: string | null; tamanho: number }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: tamanho, height: tamanho, boxShadow: '0 0 0 1px rgba(255,255,255,0.55)' }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-current font-display font-semibold"
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.42) }}
      aria-hidden
    >
      {nome.trim().charAt(0).toUpperCase() || '·'}
    </span>
  )
}

/** "Ver peça" que sobe no canto da foto ao passar o mouse (ou com foco de teclado). */
function ChipVerPeca() {
  return (
    <span
      className="pointer-events-none absolute bottom-4 left-4 flex translate-y-1.5 items-center gap-1.5 rounded-pill bg-surface/95 px-4 py-2 font-body text-[13px] font-medium text-ink opacity-0 shadow-soft transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
      aria-hidden
    >
      Ver peça
      <IconeTraco nome="arrow-up-right" tamanho={14} espessura={1.8} />
    </span>
  )
}

/** Foto de peça com o zoom lento da referência; sem foto, o TIPO escrito no papel. */
function FotoPeca({ produto, prioridade = false }: { produto: ProdutoCatalogo; prioridade?: boolean }) {
  if (!produto.foto_url) {
    return (
      <span
        className="absolute inset-0 flex items-center justify-center p-6 text-center font-display text-[clamp(24px,2.4vw,38px)] font-medium tracking-[-0.02em] text-ink/15"
        aria-hidden
      >
        {tipoDe(produto.nome)}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={produto.foto_url}
      alt=""
      loading={prioridade ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className="h-full w-full object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Barra espresso — desce quando o hero sai de cena
// ─────────────────────────────────────────────────────────────

function BarraEspresso({
  store,
  visivel,
  secoes,
  sacola,
  aoIrPara,
  aoAbrirIndice,
}: {
  store: Store
  visivel: boolean
  secoes: SecaoCatalogo[]
  sacola: EstadoSacola
  aoIrPara: (id: string) => void
  aoAbrirIndice: () => void
}) {
  const reduzir = useReduzirMovimento()
  return (
    <header
      className="fixed inset-x-0 top-[var(--inset-top,0px)] z-30 bg-accent text-accent-ink shadow-[0_1px_0_rgba(0,0,0,0.08)]"
      style={{
        transform: visivel ? 'none' : 'translateY(-100%)',
        visibility: visivel ? 'visible' : 'hidden',
        // Some depois do deslize; aparece na hora.
        transition: reduzir ? 'none' : `transform 500ms ${ENTRADA}, visibility 0s linear ${visivel ? '0s' : '500ms'}`,
      }}
    >
      <div className={`${CONTEINER} flex items-center gap-8`} style={{ height: ALTURA_BARRA }}>
        <a href={`#${ANCORA.topo}`} onClick={aoClicarAncora(ANCORA.topo, aoIrPara)} className="flex min-w-0 shrink items-center gap-3">
          <LogoDaCasa nome={store.nome} logoUrl={store.logo_url} tamanho={34} />
          <span className="truncate font-display text-[19px] font-semibold tracking-[-0.01em]">{store.nome}</span>
        </a>

        {secoes.length > 1 && (
          <nav aria-label="Coleções" className="ml-auto hidden min-w-0 items-center gap-7 lg:flex">
            {secoes.slice(0, 4).map((s) => (
              <a
                key={s.chave}
                href={`#${ancoraDaSecao(s.chave)}`}
                onClick={aoClicarAncora(ancoraDaSecao(s.chave), aoIrPara)}
                className="max-w-[15ch] truncate font-body text-[14px] font-medium text-accent-ink/75 transition-colors hover:text-accent-ink"
              >
                {s.titulo}
              </a>
            ))}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-3">
          <button
            type="button"
            onClick={aoAbrirIndice}
            aria-haspopup="dialog"
            className="flex h-10 items-center gap-2 rounded-pill px-4 font-body text-[14px] font-medium transition-colors hover:bg-accent-ink/10"
          >
            <IconeTraco nome="menu" tamanho={20} espessura={1.6} />
            Índice
          </button>
          <button
            type="button"
            onClick={sacola.abrir}
            aria-label={rotuloSacola(sacola.totalItens)}
            className="flex h-10 items-center gap-2.5 rounded-pill border border-accent-ink/35 pl-3.5 pr-4 font-body text-[14px] font-medium transition-colors hover:bg-accent-ink/10"
          >
            <IconeTraco nome="bag" tamanho={19} espessura={1.7} />
            {sacola.totalItens > 0 ? (
              <span className="tabular-nums">
                {sacola.totalItens} · {formatarReais(sacola.total)}
              </span>
            ) : (
              'Sacola'
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero — tela cheia, nome centralizado, pílula no pé
// ─────────────────────────────────────────────────────────────

const HeroDesktop = forwardRef<
  HTMLElement,
  {
    store: Store
    titulo: string
    apoio: string | null
    cta: string
    imagem: string | null
    sacola: EstadoSacola
    aoVerPecas: () => void
    aoAbrirIndice: () => void
    aoRolar: () => void
  }
>(function HeroDesktop({ store, titulo, apoio, cta, imagem, sacola, aoVerPecas, aoAbrirIndice, aoRolar }, ref) {
  return (
    <section
      ref={ref}
      id={ANCORA.topo}
      aria-label={store.nome}
      className="relative flex h-screen max-h-[1100px] min-h-[560px] flex-col overflow-hidden bg-ink text-white supports-[height:100svh]:h-[100svh]"
    >
      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagem}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0" style={{ backgroundImage: VEU_HERO }} aria-hidden />

      <div className="relative flex flex-1 flex-col items-center justify-center px-[6vw] pt-10 text-center">
        <h1
          className="max-w-[14ch] font-display font-medium leading-[0.94] tracking-[-0.035em] [text-wrap:balance]"
          style={{ fontSize: tamanhoDoNome(titulo) }}
        >
          {titulo}
        </h1>
        {apoio && (
          <p className="mt-[clamp(16px,2.6vh,30px)] max-w-[52ch] font-body text-[clamp(15px,1.15vw,18px)] leading-[1.55] text-white/85 [text-wrap:balance]">
            {apoio}
          </p>
        )}
      </div>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-end gap-6 px-[clamp(24px,3.2vw,48px)] pb-[clamp(24px,4.5vh,44px)]">
        <DicaRolar aoTocar={aoRolar} />
        <PilulaHero nome={store.nome} cta={cta} sacola={sacola} aoVerPecas={aoVerPecas} aoAbrirIndice={aoAbrirIndice} />
        <div className="flex flex-col items-end gap-1.5 justify-self-end text-right">
          <StatusAberto horarios={store.horarios} className="font-body text-[13px] font-medium text-white/90" />
          {store.tempo_entrega != null && (
            <span className="hidden font-body text-[13px] text-white/70 lg:block">Entrega em cerca de {store.tempo_entrega} min</span>
          )}
        </div>
      </div>
    </section>
  )
})

/** A pílula de vidro da referência: índice · CTA em duas peças · sacola. */
function PilulaHero({
  nome,
  cta,
  sacola,
  aoVerPecas,
  aoAbrirIndice,
}: {
  nome: string
  cta: string
  sacola: EstadoSacola
  aoVerPecas: () => void
  aoAbrirIndice: () => void
}) {
  return (
    <div className="flex items-center gap-5">
      <span className="hidden max-w-[16ch] truncate font-display text-[22px] font-semibold tracking-[-0.02em] lg:block">{nome}</span>
      <div className="flex items-center rounded-pill border border-white/20 bg-white/[0.12] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <button
          type="button"
          onClick={aoAbrirIndice}
          aria-haspopup="dialog"
          aria-label="Abrir o índice da loja"
          className="flex h-11 w-14 items-center justify-center rounded-pill text-white transition-colors hover:bg-white/10"
        >
          <IconeTraco nome="menu" tamanho={22} espessura={1.6} />
        </button>
        <span className="w-[clamp(20px,6vw,120px)]" aria-hidden />
        <button type="button" onClick={aoVerPecas} className="group flex items-center gap-1">
          <span className="flex h-11 items-center rounded-pill bg-white px-6 font-body text-[15px] font-medium text-ink transition-colors group-hover:bg-white/90">
            {cta}
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink transition-colors group-hover:bg-white/90" aria-hidden>
            <IconeTraco nome="arrow-up-right" tamanho={17} espessura={1.8} className="transition-transform duration-300 group-hover:rotate-45" />
          </span>
        </button>
        <button
          type="button"
          onClick={sacola.abrir}
          aria-label={rotuloSacola(sacola.totalItens)}
          className="relative ml-1.5 flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <IconeTraco nome="bag" tamanho={21} espessura={1.7} />
          {sacola.totalItens > 0 && (
            <span
              className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 font-body text-[10px] font-bold tabular-nums text-ink"
              aria-hidden
            >
              {sacola.totalItens}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

/** "Role": o mouse de contorno com o ponto descendo (parado com "reduzir movimento"). */
function DicaRolar({ aoTocar }: { aoTocar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label="Rolar para conhecer a loja"
      className="flex w-fit flex-col items-center gap-2 justify-self-start text-white/80 transition-colors hover:text-white"
    >
      <span className="flex h-[44px] w-[28px] justify-center rounded-pill border border-current pt-[9px]" aria-hidden>
        <span className="block h-[7px] w-[3px] rounded-full bg-current motion-safe:animate-dica-rolar" />
      </span>
      <span className="font-body text-[12px] leading-[1.25] tracking-[0.02em]" aria-hidden>
        Role
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Índice — a pílula e a barra abrem o mapa da loja
// ─────────────────────────────────────────────────────────────

function IndiceDesktop({
  store,
  secoes,
  itens,
  aoIr,
  aoFechar,
}: {
  store: Store
  secoes: SecaoCatalogo[]
  itens: ItemIndice[]
  aoIr: (id: string) => void
  aoFechar: () => void
}) {
  const fecharRef = useRef<HTMLButtonElement>(null)
  const agora = useRelogioDaLoja()
  const temHorarios = normalizarHorarios(store.horarios) !== null
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())

  useEffect(() => {
    const overflowAntes = document.body.style.overflow
    const focoAntes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    fecharRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = overflowAntes
      document.removeEventListener('keydown', aoTeclar)
      // Sem `preventScroll`, devolver o foco à pílula rolaria de volta ao hero.
      focoAntes?.focus({ preventScroll: true })
    }
  }, [aoFechar])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Índice de ${store.nome}`}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink text-canvas motion-safe:animate-surgir"
    >
      <div className={`${CONTEINER} flex shrink-0 items-center justify-between gap-6`} style={{ height: 88 }}>
        <span className="truncate font-display text-[22px] font-semibold tracking-[-0.02em]">{store.nome}</span>
        <button
          ref={fecharRef}
          type="button"
          onClick={aoFechar}
          className="flex h-11 shrink-0 items-center gap-2.5 rounded-pill border border-canvas/25 pl-5 pr-4 font-body text-[14px] font-medium transition-colors hover:border-canvas/60"
        >
          Fechar
          <IconeTraco nome="close" tamanho={18} espessura={1.6} />
        </button>
      </div>

      <div className={`${CONTEINER} grid flex-1 grid-cols-12 gap-x-8 gap-y-14 pb-16 pt-[clamp(24px,6vh,72px)]`}>
        <nav aria-label="Coleções" className="col-span-12 lg:col-span-7">
          <Rotulo claro>Coleções</Rotulo>
          {secoes.length > 0 ? (
            <ol className="mt-6 border-t border-canvas/10">
              {secoes.map((s, i) => (
                <li key={s.chave} className="border-b border-canvas/10">
                  <a
                    href={`#${ancoraDaSecao(s.chave)}`}
                    onClick={aoClicarAncora(ancoraDaSecao(s.chave), aoIr)}
                    className="group flex items-baseline gap-6 py-[clamp(12px,1.7vh,20px)]"
                  >
                    <span className="w-8 shrink-0 font-body text-[13px] tabular-nums text-canvas/45">{dois(i + 1)}</span>
                    <span className="min-w-0 flex-1 truncate font-display text-[clamp(30px,3.4vw,52px)] font-medium leading-[1.08] tracking-[-0.025em] text-canvas/70 transition-colors group-hover:text-canvas">
                      {s.titulo}
                    </span>
                    <span className="shrink-0 font-body text-[13px] text-canvas/45">{contarPecas(s.produtos.length)}</span>
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 font-body text-[15px] text-canvas/60">As peças chegam em breve.</p>
          )}
        </nav>

        <div className="col-span-12 flex flex-col gap-12 lg:col-span-4 lg:col-start-9">
          <nav aria-label="A loja">
            <Rotulo claro>A loja</Rotulo>
            <ul className="mt-6 flex flex-col gap-3.5">
              {itens.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={aoClicarAncora(item.id, aoIr)}
                    className="font-body text-[17px] text-canvas/75 transition-colors hover:text-canvas"
                  >
                    {item.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {(temHorarios || store.telefone) && (
            <div>
              <Rotulo claro>Hoje</Rotulo>
              <div className="mt-6 flex flex-col gap-2 font-body text-[15px] text-canvas/75">
                {temHorarios && <span suppressHydrationWarning>{hoje ? formatarHorario(hoje) : 'Fechado hoje'}</span>}
                <StatusAberto horarios={store.horarios} className="font-body text-[15px] text-canvas/75" />
                {store.telefone && (
                  <a href={`tel:${store.telefone}`} className="w-fit underline-offset-4 transition-colors hover:text-canvas hover:underline">
                    {formatarTelefone(store.telefone)}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// (O ateliê) — statement, fotos assimétricas e os números da casa
// ─────────────────────────────────────────────────────────────

function AtelieDesktop({
  store,
  dados,
  fotos,
  aoVerPecas,
}: {
  store: Store
  dados: DadosArtesa
  fotos: [string | undefined, string | undefined]
  aoVerPecas: () => void
}) {
  const { fraseUm, fraseDois, meta, todos, secoesComItens } = dados
  const numeros = numerosDaLoja(store, todos.length, secoesComItens.length)
  const [grande, pequena] = fotos
  const temStatement = fraseUm.length > 0 || fraseDois.length > 0

  return (
    <section id={ANCORA.atelie} aria-label="O ateliê" className={`${CONTEINER} ${SCROLL_MT} ${RESPIRO}`}>
      <div className="revelar grid grid-cols-12 items-end gap-x-[clamp(16px,2vw,32px)] gap-y-10">
        <div className="col-span-12 lg:col-span-8">
          <Rotulo como="p">O ateliê</Rotulo>
          {temStatement && (
            <h2
              className="mt-[clamp(24px,3vw,44px)] font-display font-medium tracking-[-0.025em] [text-wrap:pretty]"
              style={{ fontSize: 'clamp(30px, 3.5vw, 58px)', lineHeight: 1.1 }}
            >
              <span className="text-ink">{fraseUm}</span>
              {fraseDois.length > 0 && <span className="text-accent"> {fraseDois}</span>}
            </h2>
          )}
        </div>
        <div className="col-span-12 flex flex-col items-start gap-7 lg:col-span-4 lg:items-end lg:text-right">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-body text-[14px] font-medium text-ink-muted lg:justify-end">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
            <StatusAberto horarios={store.horarios} className="font-body text-[14px] font-medium text-ink-muted" />
          </p>
          {todos.length > 0 && <CtaDuplo rotulo="Ver peças" tom="escuro" aoTocar={aoVerPecas} />}
        </div>
      </div>

      {(grande || numeros.length >= 2) && (
        <div className="mt-[clamp(64px,8vw,128px)] grid grid-cols-12 gap-x-[clamp(16px,2vw,32px)] gap-y-12">
          {grande && pequena && (
            <figure className="revelar col-span-5 -ml-[clamp(24px,3.2vw,48px)] self-end lg:col-span-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pequena} alt="" loading="lazy" decoding="async" draggable={false} className="aspect-[4/5] w-full object-cover" />
            </figure>
          )}
          <div className={`revelar ${grande && pequena ? 'col-span-7 lg:col-start-6' : 'col-span-12 lg:col-span-8 lg:col-start-5'}`}>
            {grande && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={grande} alt="" loading="lazy" decoding="async" draggable={false} className="aspect-[3/2] w-full object-cover" />
            )}
            {numeros.length >= 2 && (
              <dl
                className={`grid gap-6 ${grande ? 'mt-10' : ''}`}
                style={{ gridTemplateColumns: `repeat(${numeros.length}, minmax(0, 1fr))` }}
              >
                {numeros.map((n) => (
                  <div key={n.rotulo} className="flex flex-col-reverse gap-3">
                    <dt className="font-body text-[14px] text-ink-muted">{n.rotulo}</dt>
                    <dd
                      className="font-display font-semibold leading-none tracking-[-0.03em] text-ink"
                      style={{ fontSize: 'clamp(34px, 3.6vw, 58px)' }}
                    >
                      {n.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// (Peças em destaque) — a galeria assimétrica
// ─────────────────────────────────────────────────────────────

function DestaquesDesktop({
  pecas,
  aoAbrirProduto,
  aoVerTodas,
}: {
  pecas: ProdutoCatalogo[]
  aoAbrirProduto: (p: ProdutoCatalogo) => void
  aoVerTodas: () => void
}) {
  if (pecas.length === 0) return null
  const [a, b, c, d] = pecas

  return (
    <section id={ANCORA.destaques} aria-label="Peças em destaque" className={`${CONTEINER} ${SCROLL_MT} ${RESPIRO}`}>
      <div className="revelar flex items-baseline justify-between gap-6">
        <Rotulo>Peças em destaque</Rotulo>
        <button
          type="button"
          onClick={aoVerTodas}
          className="group flex items-center gap-2 font-body text-[14px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Todas as peças
          <IconeTraco nome="arrow-down" tamanho={16} espessura={1.7} className="transition-transform duration-300 group-hover:translate-y-0.5" />
        </button>
      </div>
      {/* Linha 1: 3:2 grande + quadrada menor, alinhadas pelo pé; linha 2: par centrado. */}
      <div className="mt-[clamp(40px,5vw,80px)] grid grid-cols-12 items-end gap-x-[clamp(12px,1.2vw,20px)] gap-y-[clamp(48px,6vw,96px)]">
        {a && (
          <CartazPeca produto={a} proporcao="3 / 2" className={b ? 'col-span-8' : 'col-span-12 lg:col-span-10 lg:col-start-2'} aoAbrir={aoAbrirProduto} />
        )}
        {b && <CartazPeca produto={b} proporcao="1 / 1" className="col-span-4" aoAbrir={aoAbrirProduto} />}
        {c && (
          <CartazPeca
            produto={c}
            proporcao="1 / 1"
            className={d ? 'col-span-5 col-start-2 lg:col-span-4 lg:col-start-3' : 'col-span-6 col-start-4 lg:col-span-4 lg:col-start-5'}
            aoAbrir={aoAbrirProduto}
          />
        )}
        {d && <CartazPeca produto={d} proporcao="1 / 1" className="col-span-5 lg:col-span-4" aoAbrir={aoAbrirProduto} />}
      </div>
    </section>
  )
}

function CartazPeca({
  produto,
  proporcao,
  className,
  aoAbrir,
}: {
  produto: ProdutoCatalogo
  proporcao: string
  className: string
  aoAbrir: (p: ProdutoCatalogo) => void
}) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(produto)}
      aria-label={`${produto.nome}, ${formatarReais(precoFinalDe(produto))}`}
      className={`revelar group block min-w-0 text-left ${className}`}
    >
      <span className="relative block overflow-hidden rounded-lg bg-canvasAlt" style={{ aspectRatio: proporcao }}>
        <FotoPeca produto={produto} />
        <ChipVerPeca />
      </span>
      <span className="mt-4 flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-6">
        <span className="min-w-0 truncate font-display text-[clamp(17px,1.35vw,21px)] font-medium tracking-[-0.01em] text-ink">
          {produto.nome}
        </span>
        <span className="shrink-0">
          <PrecoArtesa produto={produto} tamanho={15} />
        </span>
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// (O que fazemos) — faixa escura, linhas que acendem a foto
// ─────────────────────────────────────────────────────────────

function CriacoesDesktop({
  bandas,
  texto,
  foto,
  aoAbrirProduto,
}: {
  bandas: BandaArtesa[]
  texto: string | null
  foto: string | null
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  if (bandas.length < MIN_BANDAS) return null

  return (
    <section id={ANCORA.criacoes} aria-label="O que fazemos" className={`${SCROLL_MT} mt-[clamp(96px,11vw,176px)] bg-ink text-canvas`}>
      <div className={`${CONTEINER} py-[clamp(80px,9vw,144px)]`}>
        {/* Com texto do lojista, a abertura da referência (foto + parágrafo);
            sem ele, só o rótulo — foto sozinha num canto deixa o resto vazio. */}
        {texto ? (
          <div className="revelar grid grid-cols-12 gap-x-[clamp(16px,2vw,32px)] gap-y-10">
            <div className="col-span-12 lg:col-span-4">
              <Rotulo claro>O que fazemos</Rotulo>
              {foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="mt-8 aspect-[16/10] w-full max-w-[340px] object-cover"
                />
              )}
            </div>
            <p
              className="col-span-12 font-display font-medium leading-[1.3] tracking-[-0.01em] text-canvas lg:col-span-7 lg:col-start-6"
              style={{ fontSize: 'clamp(20px, 1.9vw, 30px)' }}
            >
              {texto}
            </p>
          </div>
        ) : (
          <div className="revelar flex items-baseline justify-between gap-6">
            <Rotulo claro>O que fazemos</Rotulo>
            <span className="font-body text-[14px] text-canvas/55">
              {bandas.length} {bandas.length === 1 ? 'tipo de peça' : 'tipos de peça'}
            </span>
          </div>
        )}

        <ul className={`${texto ? 'mt-[clamp(56px,7vw,112px)]' : 'mt-[clamp(32px,4vw,56px)]'} border-t border-canvas/10`}>
          {bandas.map((banda) => (
            <LinhaCriacao key={banda.produto.id} banda={banda} aoAbrir={() => aoAbrirProduto(banda.produto)} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function LinhaCriacao({ banda, aoAbrir }: { banda: BandaArtesa; aoAbrir: () => void }) {
  const { palavra, produto } = banda
  return (
    <li className="border-b border-canvas/10">
      <button
        type="button"
        onClick={aoAbrir}
        className="group relative flex w-full items-center gap-[clamp(16px,2vw,32px)] overflow-hidden py-[clamp(26px,3vw,44px)] text-left transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:px-[clamp(20px,2.4vw,36px)] focus-visible:px-[clamp(20px,2.4vw,36px)] motion-reduce:transition-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={produto.foto_url!}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.06] object-cover opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          style={{ backgroundImage: VEU_LINHA }}
          aria-hidden
        />
        <span
          className="relative shrink-0 font-display font-medium tracking-[-0.02em] text-canvas/70 transition-colors duration-300 group-hover:text-canvas group-focus-visible:text-canvas"
          style={{ fontSize: 'clamp(26px, 2.5vw, 40px)' }}
        >
          {palavra}
        </span>
        <span className="relative hidden min-w-0 flex-1 truncate font-body text-[14px] text-canvas/55 transition-colors duration-300 group-hover:text-canvas/85 lg:block">
          {produto.descricao ?? produto.nome}
        </span>
        <span
          className="relative ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-canvas/60 text-canvas transition-colors duration-300 group-hover:border-canvas group-hover:bg-canvas group-hover:text-ink group-focus-visible:border-canvas group-focus-visible:bg-canvas group-focus-visible:text-ink"
          aria-hidden
        >
          <IconeTraco nome="arrow-up-right" tamanho={18} espessura={1.6} />
        </span>
      </button>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────
// (Coleções) — tabuleiro foto/ficha
// ─────────────────────────────────────────────────────────────

function ColecoesDesktop({ secoes, aoIrPara }: { secoes: SecaoCatalogo[]; aoIrPara: (id: string) => void }) {
  if (secoes.length < 2) return null

  return (
    <section id={ANCORA.colecoes} aria-label="Coleções" className={`${CONTEINER} ${SCROLL_MT} ${RESPIRO}`}>
      <div className="revelar flex items-baseline justify-between gap-6">
        <Rotulo>Coleções</Rotulo>
        <span className="font-body text-[14px] text-ink-muted">{contarColecoes(secoes.length)}</span>
      </div>
      <ul className="mt-[clamp(40px,5vw,80px)] grid grid-cols-2">
        {secoes.map((s, i) => {
          const comFoto = s.produtos.find((p) => p.foto_url)
          // Duas coleções por linha; a linha seguinte troca foto e ficha de lado.
          const inverter = Math.floor(i / 2) % 2 === 1
          const menor = Math.min(...s.produtos.map(precoFinalDe))
          const alvo = ancoraDaSecao(s.chave)
          return (
            <li key={s.chave} className="revelar">
              <a href={`#${alvo}`} onClick={aoClicarAncora(alvo, aoIrPara)} className="group grid grid-cols-2">
                <span className={`relative block aspect-square overflow-hidden bg-canvasAlt ${inverter ? 'order-2' : 'order-1'}`}>
                  {comFoto ? <FotoPeca produto={comFoto} /> : null}
                </span>
                <span
                  className={`flex aspect-square flex-col justify-between bg-canvasAlt p-[clamp(14px,1.5vw,24px)] text-ink transition-colors duration-500 group-hover:bg-accent group-hover:text-accent-ink ${inverter ? 'order-1' : 'order-2'}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-display text-[clamp(18px,1.6vw,26px)] font-medium leading-[1.15] tracking-[-0.015em] [overflow-wrap:anywhere]">
                      {s.titulo}
                    </span>
                    <span className="shrink-0 font-display text-[clamp(18px,1.6vw,26px)] font-medium tabular-nums">{dois(i + 1)}</span>
                  </span>
                  <span className="flex flex-col gap-1 font-body text-[13px] leading-[1.45] text-ink-muted transition-colors duration-500 group-hover:text-accent-ink/80">
                    <span>{contarPecas(s.produtos.length)}</span>
                    <span>a partir de {formatarReais(menor)}</span>
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Catálogo — 1ª seção em trilho, as demais em grade
// ─────────────────────────────────────────────────────────────

function SecaoCatalogoDesktop({
  secao,
  numero,
  trilho,
  aoAbrirProduto,
}: {
  secao: SecaoCatalogo
  numero: number
  trilho: boolean
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  return (
    <section
      id={ancoraDaSecao(secao.chave)}
      aria-label={secao.titulo}
      className={`${CONTEINER} ${SCROLL_MT} pt-[clamp(80px,9vw,144px)]`}
    >
      <header className="revelar flex items-end justify-between gap-8 border-t border-line pt-6">
        <div className="flex min-w-0 items-baseline gap-[clamp(14px,1.6vw,24px)]">
          <span className="font-display text-[clamp(15px,1.2vw,19px)] font-semibold tabular-nums text-accent">{dois(numero)}</span>
          <h2
            className="min-w-0 truncate font-display font-medium leading-[1.04] tracking-[-0.03em] text-ink"
            style={{ fontSize: 'clamp(30px, 3.3vw, 54px)' }}
          >
            {secao.titulo}
          </h2>
        </div>
        <span className="shrink-0 pb-1.5 font-body text-[14px] text-ink-muted">{contarPecas(secao.produtos.length)}</span>
      </header>

      {trilho ? (
        <TrilhoPecas produtos={secao.produtos} titulo={secao.titulo} aoAbrirProduto={aoAbrirProduto} />
      ) : (
        <div
          className={`mt-[clamp(28px,3vw,44px)] grid grid-cols-3 gap-x-[clamp(12px,1.4vw,24px)] gap-y-[clamp(40px,4vw,64px)] ${
            secao.produtos.length > 3 ? 'xl:grid-cols-4' : ''
          }`}
        >
          {secao.produtos.map((p) => (
            <CardPeca key={p.id} produto={p} aoAbrir={aoAbrirProduto} />
          ))}
        </div>
      )}
    </section>
  )
}

/** O carrossel do celular no computador: cartões retrato, setas finas e contador. */
function TrilhoPecas({
  produtos,
  titulo,
  aoAbrirProduto,
}: {
  produtos: ProdutoCatalogo[]
  titulo: string
  aoAbrirProduto: (p: ProdutoCatalogo) => void
}) {
  const trilhoRef = useRef<HTMLUListElement>(null)
  const [posicao, setPosicao] = useState({ primeiro: 0, inicio: true, fim: true })
  const total = produtos.length

  const passoDoTrilho = (el: HTMLUListElement) => {
    const item = el.firstElementChild as HTMLElement | null
    const vao = parseFloat(getComputedStyle(el).columnGap) || 0
    return item ? item.offsetWidth + vao : el.clientWidth
  }

  const medir = useCallback(() => {
    const el = trilhoRef.current
    if (!el) return
    const primeiro = Math.round(el.scrollLeft / passoDoTrilho(el))
    setPosicao({
      primeiro: Math.max(0, Math.min(total - 1, primeiro)),
      inicio: el.scrollLeft <= 2,
      fim: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    })
  }, [total])

  useEffect(() => {
    medir()
    const el = trilhoRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [medir])

  const passar = (direcao: 1 | -1) => {
    const el = trilhoRef.current
    if (!el) return
    el.scrollBy({ left: direcao * passoDoTrilho(el), behavior: prefereMenosMovimento() ? 'auto' : 'smooth' })
  }

  const cabeTudo = posicao.inicio && posicao.fim

  return (
    <div className="mt-[clamp(28px,3vw,44px)]">
      <ul
        ref={trilhoRef}
        onScroll={medir}
        aria-label={`Peças de ${titulo}`}
        className="flex snap-x snap-mandatory gap-[clamp(12px,1.4vw,24px)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {produtos.map((p, i) => (
          <li key={p.id} className="w-[42%] shrink-0 snap-start lg:w-[29%] xl:w-[22.6%]">
            <CardPeca produto={p} aoAbrir={aoAbrirProduto} proporcao="2 / 3" prioridade={i < 2} />
          </li>
        ))}
      </ul>

      {!cabeTudo && (
        <div className="mt-8 flex items-center justify-between gap-6">
          <span className="font-body text-[13px] font-medium tabular-nums text-ink-muted" aria-live="polite">
            {dois(posicao.primeiro + 1)} / {dois(total)}
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => passar(-1)}
              disabled={posicao.inicio}
              aria-label="Peças anteriores"
              className="flex h-10 w-10 items-center justify-center text-accent transition-opacity hover:opacity-70 disabled:text-line disabled:hover:opacity-100"
            >
              <IconeTraco nome="arrow-left" tamanho={30} espessura={1.4} />
            </button>
            <button
              type="button"
              onClick={() => passar(1)}
              disabled={posicao.fim}
              aria-label="Próximas peças"
              className="flex h-10 w-10 items-center justify-center text-accent transition-opacity hover:opacity-70 disabled:text-line disabled:hover:opacity-100"
            >
              <IconeTraco nome="arrow-right" tamanho={30} espessura={1.4} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CardPeca({
  produto,
  aoAbrir,
  proporcao = '4 / 5',
  prioridade = false,
}: {
  produto: ProdutoCatalogo
  aoAbrir: (p: ProdutoCatalogo) => void
  proporcao?: string
  prioridade?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(produto)}
      aria-label={`${produto.nome}, ${formatarReais(precoFinalDe(produto))}`}
      className="group block w-full min-w-0 text-left"
    >
      <span className="relative block overflow-hidden rounded-lg bg-canvasAlt" style={{ aspectRatio: proporcao }}>
        <FotoPeca produto={produto} prioridade={prioridade} />
        <EtiquetaTipo nome={produto.nome} />
        <ChipVerPeca />
      </span>
      <span className="mt-4 flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4">
        <span className="min-w-0 truncate font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{produto.nome}</span>
        <span className="shrink-0">
          <PrecoArtesa produto={produto} tamanho={15} />
        </span>
      </span>
      {produto.descricao && (
        <span className="mt-1.5 line-clamp-2 block font-body text-[13px] leading-[1.55] text-ink-muted">{produto.descricao}</span>
      )}
    </button>
  )
}

function VazioDesktop({ nome }: { nome: string }) {
  return (
    <section aria-label="As peças" className={`${CONTEINER} ${RESPIRO}`}>
      <div className="bg-canvasAlt px-8 py-[clamp(64px,8vw,120px)] text-center">
        <p className="font-display font-medium tracking-[-0.02em] text-ink" style={{ fontSize: 'clamp(26px, 2.6vw, 40px)' }}>
          O ateliê ainda está arrumando a vitrine
        </p>
        <p className="mx-auto mt-4 max-w-[44ch] font-body text-[15px] leading-[1.6] text-ink-muted">
          {nome} ainda não colocou peças na vitrine. Volte em breve.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// (Como pedir) e (A casa)
// ─────────────────────────────────────────────────────────────

function ComoPedirDesktop({ store }: { store: Store }) {
  const passos = passosDoPedido(store)
  return (
    <section id={ANCORA.comoPedir} aria-label="Como pedir" className={`${CONTEINER} ${SCROLL_MT} ${RESPIRO}`}>
      <Rotulo>Como pedir</Rotulo>
      <ol className="mt-[clamp(40px,5vw,80px)] grid grid-cols-3 gap-x-[clamp(16px,2vw,32px)]">
        {passos.map((passo, i) => (
          <li key={passo.titulo} className="revelar border-t border-line pt-6">
            <span className="font-display font-medium tabular-nums text-ink" style={{ fontSize: 'clamp(30px, 2.7vw, 44px)' }}>
              {dois(i + 1)}
            </span>
            <h3
              className="mt-[clamp(28px,3.4vw,56px)] font-display font-medium tracking-[-0.02em] text-ink"
              style={{ fontSize: 'clamp(21px, 1.9vw, 30px)' }}
            >
              {passo.titulo}
            </h3>
            <p className="mt-3 max-w-[38ch] font-body text-[14px] leading-[1.6] text-ink-muted">{passo.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function CasaDesktop({ fotos, nome }: { fotos: string[]; nome: string }) {
  if (fotos.length === 0) return null
  // Mosaico em colunas: aceita foto de qualquer proporção sem buraco na grade.
  const colunas = fotos.length === 1 ? 'columns-1' : fotos.length === 2 ? 'columns-2' : 'columns-3'
  return (
    <section id={ANCORA.casa} aria-label="A casa" className={`${CONTEINER} ${SCROLL_MT} ${RESPIRO}`}>
      <Rotulo>A casa</Rotulo>
      <ul aria-label={`Fotos de ${nome}`} className={`mt-[clamp(40px,5vw,80px)] gap-[clamp(8px,1vw,16px)] ${colunas}`}>
        {fotos.map((foto, i) => (
          <li key={`${foto}-${i}`} className="revelar mb-[clamp(8px,1vw,16px)] break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="" loading="lazy" decoding="async" draggable={false} className="block w-full object-cover" />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Banda de chamada — a frase, o CTA e o "hoje" da loja em vidro
// ─────────────────────────────────────────────────────────────

function ChamadaDesktop({ store, imagem, aoVerPecas }: { store: Store; imagem: string | null; aoVerPecas: () => void }) {
  const agora = useRelogioDaLoja()
  const temHorarios = normalizarHorarios(store.horarios) !== null
  const hoje = horarioDeHoje(store.horarios, agora ?? relogioDaLoja())
  const linhas: [string, string][] = []
  if (store.tempo_entrega != null) linhas.push(['Entrega', `cerca de ${store.tempo_entrega} min`])
  if (store.taxa_entrega != null) linhas.push(['Taxa', store.taxa_entrega === 0 ? 'Grátis' : formatarReais(store.taxa_entrega)])
  const temCartao = temHorarios || linhas.length > 0 || !!store.telefone

  return (
    <section aria-label="Peça agora" className="relative mt-[clamp(96px,11vw,176px)] overflow-hidden bg-ink text-white">
      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagem} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ backgroundImage: VEU_CHAMADA }} aria-hidden />

      <div className={`${CONTEINER} relative grid min-h-[clamp(460px,64vh,720px)] grid-cols-12 gap-x-8 gap-y-12 py-[clamp(40px,5vw,80px)]`}>
        <div className="revelar col-span-12 self-end lg:col-span-7">
          <p className="font-display font-medium tracking-[-0.025em]" style={{ fontSize: 'clamp(34px, 3.4vw, 56px)', lineHeight: 1.08 }}>
            <span className="block">Encontrou a sua peça?</span>
            <span className="block text-white/70">A gente leva até você.</span>
          </p>
          <CtaDuplo rotulo="Ver peças" tom="claro" aoTocar={aoVerPecas} className="mt-[clamp(24px,2.6vw,40px)]" />
        </div>

        {temCartao && (
          <aside
            aria-label="Hoje na loja"
            className="revelar col-span-12 self-start rounded-xl border border-white/20 bg-white/10 p-[clamp(20px,2vw,32px)] backdrop-blur-xl md:col-span-7 lg:col-span-4 lg:col-start-9"
          >
            <p className="font-display text-[16px] font-bold">(Hoje)</p>
            {temHorarios && (
              <p
                className="mt-5 font-display font-medium tracking-[-0.02em]"
                style={{ fontSize: 'clamp(28px, 2.4vw, 40px)' }}
                suppressHydrationWarning
              >
                {hoje ? formatarHorario(hoje) : 'Fechado hoje'}
              </p>
            )}
            <StatusAberto horarios={store.horarios} className="mt-2 font-body text-[14px] text-white/85" />
            {(linhas.length > 0 || store.telefone) && (
              <dl className="mt-6 flex flex-col gap-3 border-t border-white/15 pt-5 font-body text-[14px]">
                {linhas.map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-6">
                    <dt className="text-white/65">{rotulo}</dt>
                    <dd className="font-medium">{valor}</dd>
                  </div>
                ))}
                {store.telefone && (
                  <div className="flex justify-between gap-6">
                    <dt className="text-white/65">Telefone</dt>
                    <dd>
                      <a href={`tel:${store.telefone}`} className="font-medium underline-offset-4 hover:underline">
                        {formatarTelefone(store.telefone)}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Rodapé — o nome gigante, os caminhos da casa e a semana
// ─────────────────────────────────────────────────────────────

function RodapeDesktop({
  store,
  secoes,
  itens,
  aoIrPara,
}: {
  store: Store
  secoes: SecaoCatalogo[]
  itens: ItemIndice[]
  aoIrPara: (id: string) => void
}) {
  const semana = semanaDaLoja(store.horarios)
  const ano = new Date().getFullYear()
  const caminhos = itens.filter((i) => i.id !== ANCORA.contato)

  return (
    <footer id={ANCORA.contato} className={`${SCROLL_MT} bg-ink text-canvas`}>
      <div className={`${CONTEINER} pb-10 pt-[clamp(80px,8vw,128px)]`}>
        <div className="grid grid-cols-12 gap-x-8 gap-y-14">
          <div className="col-span-12 lg:col-span-5">
            <p
              className="font-display font-medium leading-[0.92] tracking-[-0.04em] [overflow-wrap:anywhere]"
              style={{ fontSize: tamanhoDoNomeRodape(store.nome) }}
            >
              {store.nome}
            </p>
            {store.descricao && <p className="mt-7 max-w-[44ch] font-body text-[14px] leading-[1.65] text-canvas/60">{store.descricao}</p>}
          </div>

          <ColunaRodape titulo="A loja" className="col-span-4 lg:col-span-2 lg:col-start-7">
            {caminhos.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={aoClicarAncora(item.id, aoIrPara)} className="transition-colors hover:text-canvas">
                  {item.rotulo}
                </a>
              </li>
            ))}
          </ColunaRodape>

          {secoes.length > 0 && (
            <ColunaRodape titulo="Coleções" className="col-span-4 lg:col-span-2">
              {secoes.map((s) => (
                <li key={s.chave}>
                  <a
                    href={`#${ancoraDaSecao(s.chave)}`}
                    onClick={aoClicarAncora(ancoraDaSecao(s.chave), aoIrPara)}
                    className="transition-colors hover:text-canvas"
                  >
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ColunaRodape>
          )}

          <div className="col-span-4 lg:col-span-2">
            <p className="font-display text-[15px] font-bold text-canvas">Contato</p>
            <div className="mt-5 flex flex-col gap-4 font-body text-[14px] text-canvas/65">
              {store.telefone && (
                <a href={`tel:${store.telefone}`} className="w-fit transition-colors hover:text-canvas">
                  {formatarTelefone(store.telefone)}
                </a>
              )}
              <StatusAberto horarios={store.horarios} className="font-body text-[14px] text-canvas/65" />
              {semana && (
                <dl className="flex flex-col gap-1.5">
                  {semana.map((faixa) => (
                    <div key={faixa.dias} className="flex justify-between gap-4">
                      <dt>{faixa.dias}</dt>
                      <dd className="tabular-nums text-canvas/85">{faixa.horario}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>

        <div className="mt-[clamp(56px,7vw,112px)] flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-canvas/15 pt-6 font-body text-[13px] text-canvas/55">
          <a href="https://mallevo.com.br" className="transition-colors hover:text-canvas">
            Uma loja do Mallevo · Divinópolis
          </a>
          <span suppressHydrationWarning>
            © {ano} {store.nome}
          </span>
          <span className="flex gap-6">
            <a href="/termos" className="transition-colors hover:text-canvas">
              Termos
            </a>
            <a href="/privacidade" className="transition-colors hover:text-canvas">
              Privacidade
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}

function ColunaRodape({ titulo, className, children }: { titulo: string; className: string; children: ReactNode }) {
  return (
    <nav aria-label={titulo} className={className}>
      <p className="font-display text-[15px] font-bold text-canvas">{titulo}</p>
      <ul className="mt-5 flex flex-col gap-3 font-body text-[14px] text-canvas/65">{children}</ul>
    </nav>
  )
}
