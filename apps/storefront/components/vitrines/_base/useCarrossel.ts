'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'

import { useReduzirMovimento } from './movimento'

/** Curva compartilhada dos glides das vitrines (RN: `Easing.bezier(0.4, 0, 0.2, 1)`). */
export const CURVA_CARROSSEL = 'cubic-bezier(0.4, 0, 0.2, 1)'

/** Deslocamento mínimo do dedo para virar cena. */
const LIMIAR_SWIPE = 40

export interface OpcoesCarrossel {
  /** Número de cenas reais (sem a cópia de loop). */
  total: number
  /** O hero está à vista — o autoplay só roda com ele em cena. */
  emCena: boolean
  /** Tempo de cada cena. */
  dwellMs: number
  /** Duração do glide entre cenas. */
  glideMs: number
}

/**
 * Motor do hero-carrossel das vitrines: o `deslizarPara` + `Animated` da RN
 * reduzido a estado. `pos` percorre 0..n: a posição n é a CÓPIA da primeira
 * cena no fim do trilho (o truque da RN para o loop parecer contínuo) —
 * chegando nela, o trilho salta sem glide para 0. Pausa com o ponteiro
 * pousado, com a aba escondida e com "reduzir movimento"; swipe horizontal
 * por pointer events.
 *
 * Quem usa renderiza `slidesRender` (cenas + cópia quando n > 1) num trilho
 * `flex` com `transform: translateX(-pos·100%)` e a `transicao` devolvida.
 */
export function useCarrossel({ total: n, emCena, dwellMs, glideMs }: OpcoesCarrossel) {
  const [pos, setPos] = useState(0)
  const [semGlide, setSemGlide] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [escondido, setEscondido] = useState(false)
  const reduzir = useReduzirMovimento()
  const toqueX = useRef<number | null>(null)

  useEffect(() => {
    const aoVisibilidade = () => setEscondido(document.hidden)
    document.addEventListener('visibilitychange', aoVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoVisibilidade)
  }, [])

  // Dwell: só com o hero à vista, a aba visível e sem o visitante pousado.
  useEffect(() => {
    if (n <= 1 || pausado || escondido || !emCena || reduzir || pos >= n) return
    const t = setTimeout(() => setPos((p) => Math.min(p + 1, n)), dwellMs)
    return () => clearTimeout(t)
  }, [pos, pausado, escondido, emCena, reduzir, n, dwellMs])

  // Na cópia da primeira cena: espera o glide terminar e salta para 0 sem
  // transição; no quadro seguinte o glide volta a valer.
  useEffect(() => {
    if (pos < n || n <= 1) return
    const t = setTimeout(
      () => {
        setSemGlide(true)
        setPos(0)
      },
      reduzir ? 0 : glideMs + 30,
    )
    return () => clearTimeout(t)
  }, [pos, n, reduzir, glideMs])

  useEffect(() => {
    if (!semGlide) return
    const id = requestAnimationFrame(() => setSemGlide(false))
    return () => cancelAnimationFrame(id)
  }, [semGlide])

  const aoPointerDown = (e: PointerEvent<HTMLElement>) => {
    toqueX.current = e.clientX
  }
  const aoPointerUp = (e: PointerEvent<HTMLElement>) => {
    const inicio = toqueX.current
    toqueX.current = null
    if (inicio === null || n <= 1) return
    const dx = e.clientX - inicio
    if (Math.abs(dx) < LIMIAR_SWIPE) return
    setPos((p) => {
      if (p >= n) return p
      return dx < 0 ? p + 1 : Math.max(0, p - 1)
    })
  }

  // A lista de cenas pode encolher (dados novos): nunca aponta pra fora dela.
  const indice = n > 0 ? Math.min(pos, n) % n : 0
  const semTransicao = semGlide || reduzir

  return {
    pos,
    indice,
    reduzir,
    semTransicao,
    transicao: semTransicao ? 'none' : `transform ${glideMs}ms ${CURVA_CARROSSEL}`,
    irPara: (i: number) => setPos(i),
    /** Espalhar na `<section>` do hero. */
    handlers: {
      onPointerEnter: () => setPausado(true),
      onPointerLeave: () => setPausado(false),
      onPointerDown: aoPointerDown,
      onPointerUp: aoPointerUp,
      onPointerCancel: () => {
        toqueX.current = null
      },
    },
  }
}

/** Cenas + cópia da primeira no fim (loop contínuo), quando há mais de uma. */
export function comCopiaDeLoop<T>(slides: T[]): T[] {
  return slides.length > 1 ? [...slides, slides[0]] : slides
}

/**
 * Observa o hero: `emCena` enquanto ≥30% dele está visível — o limiar de
 * `scrollY` da RN que pausa o autoplay e vira o header.
 */
export function useHeroEmCena<T extends HTMLElement>() {
  const heroRef = useRef<T>(null)
  const [emCena, setEmCena] = useState(true)
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entrada]) => setEmCena(entrada.isIntersecting && entrada.intersectionRatio >= 0.3),
      { threshold: [0, 0.3, 0.31] },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { heroRef, emCena }
}
