import type { CSSProperties, MouseEvent, ReactNode } from 'react'

import type { ProdutoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'

/**
 * Vocabulário gráfico da vitrine raw (arquétipo `raw`, streetwear brutalista)
 * — port DOM/CSS dos gestos de apps/mobile-consumer/components/loja/LojaRaw.tsx.
 *
 * A referência (Rawline) constrói tudo com borda e cor: cantos RETOS, nada de
 * vidro nem sombra; MONO de máquina de escrever nas legendas, tags e preços;
 * display condensada em caps; e o flourish de contraste dos títulos (a
 * primeira palavra em serif itálico minúsculo, o resto em caps no accent).
 *
 * As cores continuam vindo da pele (`--accent`, `--ink`, `--line`…). O que é
 * DNA fixo do layout é a TIPOGRAFIA de apoio: mono e serif de SISTEMA — na RN
 * é `Platform.select` (Menlo/Georgia); aqui, pilhas de sistema sem carregar
 * fonte nenhuma. Muda a voz de máquina para máquina, nunca o layout.
 */

/** Mono de sistema — o "typewriter" da referência, sem dep nova. */
export const MONO: CSSProperties = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
}

/** Serif itálico de sistema para o flourish dos títulos de seção. */
export const SERIF_ITALICO: CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontStyle: 'italic',
}

/**
 * Véu do hero em DUAS bandas — o GRADIENTE_HERO da RN em CSS puro: escurece
 * no topo (onde vivem os ícones do chrome) e no pé (onde vive o texto), e
 * deixa a foto respirar no meio.
 */
export const VEU_HERO =
  'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.52) 74%, rgba(0,0,0,0.9) 100%)'

/** Desconto inteiro em % (0 quando não há promoção válida). */
export function descontoPct(p: ProdutoCatalogo): number {
  if (!p.preco_promocional || p.preco_promocional >= p.preco) return 0
  return Math.round((1 - p.preco_promocional / p.preco) * 100)
}

const ICONES = {
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
} as const

export type IconeRaw = keyof typeof ICONES

/** Ícone de traço, na família do ConsumerIcon (24×24, round). */
export function IconeTraco({
  nome,
  tamanho = 22,
  cor = 'currentColor',
  espessura = 2,
  className,
}: {
  nome: IconeRaw
  tamanho?: number
  cor?: string
  espessura?: number
  className?: string
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {ICONES[nome]}
    </svg>
  )
}

/**
 * Ação do topo: ícone na tinta da pele SEM fundo — legível sobre a foto e
 * sobre o header escuro sem trocar de estado. Contador em QUADRADO no accent
 * (canto reto, mono). `children` substitui o ícone (a logo da casa no lugar
 * do "voltar", que não existe no web).
 */
export function AcaoRaw({
  icone,
  contador = 0,
  rotulo,
  aoTocar,
  href,
  children,
}: {
  icone?: IconeRaw
  contador?: number
  /** Nome acessível (o botão é só ícone). */
  rotulo: string
  aoTocar?: (e: MouseEvent<HTMLElement>) => void
  /** Vira `<a>` — a logo da casa que leva ao topo da loja. */
  href?: string
  children?: ReactNode
}) {
  const classe =
    'relative flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-opacity hover:opacity-70 active:opacity-60'
  const miolo = (
    <>
      {children ?? (icone ? <IconeTraco nome={icone} /> : null)}
      {contador > 0 && (
        <span
          className="absolute right-0 top-[3px] flex h-4 min-w-[16px] items-center justify-center bg-accent px-1 text-[9px] font-bold leading-none text-accent-ink"
          style={MONO}
          aria-hidden
        >
          {contador}
        </span>
      )}
    </>
  )
  if (href) {
    return (
      <a href={href} aria-label={rotulo} className={classe} onClick={aoTocar}>
        {miolo}
      </a>
    )
  }
  return (
    <button type="button" aria-label={rotulo} className={classe} onClick={aoTocar}>
      {miolo}
    </button>
  )
}

/** Tag de desconto: quadrado no accent, canto reto, mono — no canto direito da foto. */
export function TagDesconto({ pct }: { pct: number }) {
  return (
    <span
      className="absolute right-[10px] top-[10px] bg-accent px-2 py-[3px] text-[10px] font-bold tracking-[0.6px] text-accent-ink"
      style={MONO}
    >
      {pct}% OFF
    </span>
  )
}

/** Preço raw: final em mono na tinta, original riscado ao lado. */
export function PrecoRaw({ produto, tamanho }: { produto: ProdutoCatalogo; tamanho: number }) {
  const promo = descontoPct(produto) > 0
  return (
    <span className="flex items-baseline gap-2" style={MONO}>
      <span className="font-bold text-ink" style={{ fontSize: tamanho }}>
        {formatarReais(produto.preco_promocional ?? produto.preco)}
      </span>
      {promo && (
        <span className="text-ink-muted line-through" style={{ fontSize: tamanho - 2 }}>
          {formatarReais(produto.preco)}
        </span>
      )}
    </span>
  )
}

/**
 * Foto quadrada do cartão: a imagem em `object-cover` ou, sem foto, o bloco
 * chapado da pele (a RN mostra o `surfaceMuted` vazio — sem ícone, sem
 * "sem foto": a referência não pede desculpa).
 */
export function FotoQuadrada({ src, carregamento = 'lazy' }: { src: string | null; carregamento?: 'lazy' | 'eager' }) {
  if (!src) return <span className="block aspect-square w-full bg-surfaceMuted" aria-hidden />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={carregamento}
      decoding="async"
      draggable={false}
      className="block aspect-square w-full bg-surfaceMuted object-cover"
    />
  )
}

/**
 * Título de seção — o flourish de contraste da referência ("black friday
 * SALE"): primeira palavra em serif itálico minúsculo na tinta, o resto em
 * caps na display do tema, no accent. Título de uma palavra fica só no serif.
 */
export function TituloRaw({ titulo, as: Tag = 'h2' }: { titulo: string; as?: 'h2' | 'p' }) {
  const [primeira, ...resto] = titulo.trim().split(/\s+/)
  return (
    <Tag className="flex min-w-0 shrink items-baseline gap-2">
      <span
        className="lowercase text-ink"
        style={{ ...SERIF_ITALICO, fontSize: 'calc(26px * var(--type-factor, 1))', lineHeight: 1.1 }}
      >
        {primeira}
      </span>
      {resto.length > 0 && (
        <span
          className="min-w-0 truncate font-display font-extrabold uppercase tracking-[1px] text-accent"
          style={{ fontSize: 'calc(22px * var(--type-factor, 1))', lineHeight: 1.1 }}
        >
          {resto.join(' ')}
        </span>
      )}
    </Tag>
  )
}

/**
 * Marcadores do hero: QUADRADOS, não pontos — o ativo é 8×8 no accent, os
 * outros 4×4 em branco apagado. Botões: quem prefere menos movimento troca de
 * slide por aqui.
 */
export function MarcadoresQuadrados({
  total,
  ativo,
  rotulos,
  irPara,
}: {
  total: number
  ativo: number
  rotulos: string[]
  irPara: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-[6px]" role="tablist" aria-label="Cenas do hero">
      {Array.from({ length: total }, (_, i) => {
        const emFoco = i === ativo
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={emFoco}
            aria-label={`${i + 1} de ${total}: ${rotulos[i] ?? ''}`}
            onClick={() => irPara(i)}
            className="flex h-4 w-4 items-center justify-center"
          >
            <span
              className="block transition-[width,height,background-color] duration-200 motion-reduce:transition-none"
              style={{
                width: emFoco ? 8 : 4,
                height: emFoco ? 8 : 4,
                backgroundColor: emFoco ? 'var(--accent, #E0FF4F)' : 'rgba(255,255,255,0.55)',
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
