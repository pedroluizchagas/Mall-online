'use client'

import { useMemo } from 'react'
import { normalizeStoreConteudo } from '@mallevo/lib'

import { precoFinalDe } from '@/components/vitrines/_base'
import type { ProdutoCatalogo, SecaoCatalogo } from '@/lib/catalog'
import { formatarReais } from '@/lib/format'
import type { Store } from '@/lib/tenant'
import { tipoDe } from './artesa-ui'

/**
 * O que a vitrine artesã lê da loja e do catálogo, uma vez só — o celular e
 * o computador são duas composições dos MESMOS dados (a derivação veio da
 * RN, `LojaArtesa.tsx`).
 */

/** Bandas: mínimo para a seção valer (RN: 3), teto 6. */
export const MIN_BANDAS = 3
const MAX_BANDAS = 6

export interface SlideArtesa {
  imagem: string | null
  titulo: string
  apoio: string
  cta: string
  produto: ProdutoCatalogo | null
}

export interface BandaArtesa {
  palavra: string
  produto: ProdutoCatalogo
}

/** Statement em dois tons: 1ª frase em ink, o resto em accent. */
function repartirEmDoisTons(texto: string | null | undefined): [string, string] {
  const d = (texto ?? '').trim()
  if (!d) return ['', '']
  const ponto = d.indexOf('.')
  if (ponto < 0 || ponto === d.length - 1) return [d, '']
  return [d.slice(0, ponto + 1), d.slice(ponto + 1).trim()]
}

export function useDadosArtesa(store: Store, secoes: SecaoCatalogo[]) {
  const conteudo = useMemo(() => normalizeStoreConteudo(store.conteudo), [store.conteudo])
  const campanha = conteudo.campanha

  const secoesComItens = useMemo(() => secoes.filter((s) => s.produtos.length > 0), [secoes])
  const todos = useMemo(() => secoesComItens.flatMap((s) => s.produtos), [secoesComItens])

  // Cenas do hero: o nome da casa (ou a campanha) e até três peças com foto —
  // `destaques` na frente; sem eles, a primeira seção (a derivação da RN).
  const slides = useMemo<SlideArtesa[]>(() => {
    const abertura: SlideArtesa = {
      imagem: store.banner_url ?? null,
      titulo: campanha?.titulo ?? store.nome,
      apoio: campanha?.subtitulo ?? (campanha?.eyebrow ?? 'Conheça nosso trabalho'),
      cta: campanha?.cta ?? 'Ver peças',
      produto: null,
    }
    const escolhidos = (conteudo.destaques ?? [])
      .map((id) => todos.find((p) => p.id === id))
      .filter((p): p is ProdutoCatalogo => !!p && !!p.foto_url)
    const fonte = escolhidos.length > 0 ? escolhidos : (secoesComItens[0]?.produtos ?? []).filter((p) => p.foto_url)
    const pecas = fonte.slice(0, 3).map(
      (p): SlideArtesa => ({
        imagem: p.foto_url,
        titulo: p.nome,
        apoio: formatarReais(precoFinalDe(p)),
        cta: 'Ver peça',
        produto: p,
      }),
    )
    return [abertura, ...pecas]
  }, [store.banner_url, store.nome, campanha, conteudo.destaques, todos, secoesComItens])

  // Statement: o manifesto do lojista na frente; sem ele, a descrição.
  const [fraseUm, fraseDois] = useMemo(
    () => repartirEmDoisTons(conteudo.manifesto ?? store.descricao),
    [conteudo.manifesto, store.descricao],
  )

  const meta = [
    store.tempo_entrega != null ? `${store.tempo_entrega} min` : null,
    store.taxa_entrega === 0 ? 'Entrega grátis' : store.taxa_entrega != null ? `Entrega ${formatarReais(store.taxa_entrega)}` : null,
  ].filter((m): m is string => !!m)

  const galeriaCasa = conteudo.galeria_casa ?? []

  // "O que fazemos": uma banda por TIPO de peça (1ª palavra do nome), com a
  // foto e a linha de apoio vindas da própria peça. Calculado aqui (e não na
  // seção) para a numeração seguir a ordem da página.
  const bandas = useMemo(() => {
    const vistos = new Set<string>()
    const out: BandaArtesa[] = []
    for (const p of todos) {
      if (!p.foto_url) continue
      const palavra = tipoDe(p.nome)
      const chave = palavra.toLowerCase()
      if (vistos.has(chave)) continue
      vistos.add(chave)
      out.push({ palavra, produto: p })
      if (out.length >= MAX_BANDAS) break
    }
    return out
  }, [todos])

  return { conteudo, campanha, secoesComItens, todos, slides, fraseUm, fraseDois, meta, galeriaCasa, bandas }
}

export type DadosArtesa = ReturnType<typeof useDadosArtesa>
