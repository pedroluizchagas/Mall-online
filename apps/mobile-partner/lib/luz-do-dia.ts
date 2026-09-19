import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { partnerDesign } from '@/lib/partner-design'

/**
 * Luz do dia — a folha clara das telas acompanha o sol.
 *
 * A marquise é a fachada do shopping à noite, sempre acesa; a folha é o
 * salão, e o salão recebe a luz de fora: azul-frio de madrugada, âmbar ao
 * amanhecer, branco limpo pela manhã, neutro ao meio-dia, dourado à tarde,
 * cobre no entardecer, azul-profundo à noite. Este módulo só CALCULA a luz
 * (cor, intensidade e onde o sol está); quem pinta é o VidroFosco da folha (components/marquise/VidroFosco.tsx),
 * como véu de alpha baixo sobre o canvas — o token de fundo não muda.
 *
 * Nascer, meio-dia solar e pôr são calculados de verdade (algoritmo NOAA
 * simplificado) para a latitude/longitude de Divinópolis, sem pedir
 * localização: o entardecer cai às 17h30 em junho e às 18h50 em dezembro.
 * As fases são ancoradas nesses eventos e interpoladas continuamente —
 * nada de cortes a cada hora.
 *
 * Spec: docs/system-design/partner/00-sistema.md §4 (folha → luz do dia)
 */

const { luz } = partnerDesign

/** Divinópolis, MG. Fixo: o shopping é da cidade. */
const LATITUDE = -20.1386
const LONGITUDE = -44.8839

export type FaseDoDia =
  | 'madrugada'
  | 'amanhecer'
  | 'manha'
  | 'meio-dia'
  | 'tarde'
  | 'entardecer'
  | 'noite'

export interface LuzDoDia {
  fase: FaseDoDia
  /** Cor da tinta (hex), já interpolada entre as fases vizinhas. */
  cor: string
  /** 0–1: quanto a tinta pesa. 1 = nascer/pôr (a luz mais colorida). */
  intensidade: number
  /** 0–1: posição horizontal do sol na folha (0 = leste/esquerda). */
  solX: number
  /** 0–1: força do sol (0 à noite — o brilho some, fica só o véu). */
  solForca: number
}

interface EventosSolares {
  /** Minutos do dia LOCAL (0–1440). */
  nascer: number
  meioDia: number
  por: number
}

// ─────────────────────────────────────────────────────────
// Sol
// ─────────────────────────────────────────────────────────

const RAD = Math.PI / 180

/**
 * Nascer, meio-dia solar e pôr para a data, em minutos do dia local.
 * NOAA "sunrise/sunset" simplificado — erro < 2 min, mais que suficiente
 * para luz ambiente.
 */
export function eventosSolares(data: Date): EventosSolares {
  const inicioAno = Date.UTC(data.getFullYear(), 0, 1)
  const diaDoAno =
    Math.floor(
      (Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) - inicioAno) /
        86400000,
    ) + 1
  const gama = ((2 * Math.PI) / 365) * (diaDoAno - 1 + (12 - 12) / 24)

  const eqTempo =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gama) -
      0.032077 * Math.sin(gama) -
      0.014615 * Math.cos(2 * gama) -
      0.040849 * Math.sin(2 * gama))
  const declinacao =
    0.006918 -
    0.399912 * Math.cos(gama) +
    0.070257 * Math.sin(gama) -
    0.006758 * Math.cos(2 * gama) +
    0.000907 * Math.sin(2 * gama) -
    0.002697 * Math.cos(3 * gama) +
    0.00148 * Math.sin(3 * gama)

  const lat = LATITUDE * RAD
  const cosHa =
    Math.cos(90.833 * RAD) / (Math.cos(lat) * Math.cos(declinacao)) -
    Math.tan(lat) * Math.tan(declinacao)
  // Fora de |1| só em latitudes polares — Divinópolis nunca chega lá.
  const ha = Math.acos(Math.max(-1, Math.min(1, cosHa))) / RAD

  const nascerUtc = 720 - 4 * (LONGITUDE + ha) - eqTempo
  const porUtc = 720 - 4 * (LONGITUDE - ha) - eqTempo
  const meioDiaUtc = 720 - 4 * LONGITUDE - eqTempo

  // Fuso do aparelho: minutos UTC → minutos locais do mesmo dia.
  const fuso = -data.getTimezoneOffset()
  const local = (m: number) => ((m + fuso) % 1440 + 1440) % 1440
  return { nascer: local(nascerUtc), meioDia: local(meioDiaUtc), por: local(porUtc) }
}

// ─────────────────────────────────────────────────────────
// Fases
// ─────────────────────────────────────────────────────────

interface Quadro {
  fase: FaseDoDia
  /** Minuto do dia em que esta luz está "pura". */
  minuto: number
  cor: string
  intensidade: number
  solX: number
  solForca: number
}

/**
 * Quadros-chave ancorados nos eventos solares. Entre dois quadros a luz
 * interpola linearmente; a lista é cíclica (noite → madrugada atravessa a
 * meia-noite sem salto: as duas são azuis).
 */
function quadros(ev: EventosSolares): Quadro[] {
  return [
    { fase: 'madrugada', minuto: ev.nascer - 100, cor: luz.madrugada, intensidade: 0.5, solX: 0.08, solForca: 0 },
    { fase: 'amanhecer', minuto: ev.nascer + 5, cor: luz.amanhecer, intensidade: 1, solX: 0.12, solForca: 1 },
    { fase: 'manha', minuto: ev.nascer + 110, cor: luz.manha, intensidade: 0.55, solX: 0.3, solForca: 0.7 },
    { fase: 'meio-dia', minuto: ev.meioDia, cor: luz.meioDia, intensidade: 0.35, solX: 0.5, solForca: 0.45 },
    { fase: 'tarde', minuto: ev.por - 130, cor: luz.tarde, intensidade: 0.6, solX: 0.72, solForca: 0.7 },
    { fase: 'entardecer', minuto: ev.por + 5, cor: luz.entardecer, intensidade: 1, solX: 0.9, solForca: 1 },
    { fase: 'noite', minuto: ev.por + 100, cor: luz.noite, intensidade: 0.6, solX: 0.92, solForca: 0 },
  ]
}

/** A luz neste instante. */
export function luzDoDia(agora: Date = new Date()): LuzDoDia {
  const lista = quadros(eventosSolares(agora))
  const minuto = agora.getHours() * 60 + agora.getMinutes() + agora.getSeconds() / 60

  // Vizinhos cíclicos: o último quadro (noite) leva ao primeiro (madrugada)
  // do dia seguinte, +1440.
  let i = lista.findIndex((q) => q.minuto > minuto) - 1
  let a: Quadro, b: Quadro, m = minuto
  if (i === -2) {
    // depois do último quadro: noite → madrugada de amanhã
    a = lista[lista.length - 1]
    b = { ...lista[0], minuto: lista[0].minuto + 1440 }
  } else if (i === -1) {
    // antes do primeiro quadro: noite de ontem → madrugada
    a = { ...lista[lista.length - 1], minuto: lista[lista.length - 1].minuto - 1440 }
    b = lista[0]
  } else {
    a = lista[i]
    b = lista[i + 1]
  }

  const t = Math.max(0, Math.min(1, (m - a.minuto) / (b.minuto - a.minuto)))
  return {
    fase: t < 0.5 ? a.fase : b.fase,
    cor: misturar(a.cor, b.cor, t),
    intensidade: a.intensidade + (b.intensidade - a.intensidade) * t,
    solX: a.solX + (b.solX - a.solX) * t,
    solForca: a.solForca + (b.solForca - a.solForca) * t,
  }
}

/** Interpola dois hex sólidos em RGB. */
function misturar(de: string, ate: string, t: number): string {
  const a = parseInt(de.slice(1), 16)
  const b = parseInt(ate.slice(1), 16)
  const canal = (desl: number) => {
    const va = (a >> desl) & 0xff
    const vb = (b >> desl) & 0xff
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(16)}${canal(8)}${canal(0)}`
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

/** Recalcula a luz a cada minuto — a mudança por minuto é imperceptível. */
const PASSO_MS = 60_000

/**
 * A luz do dia agora, atualizada a cada minuto e ao voltar ao app (quem
 * deixou o aparelho na mesa às 17h não pode abrir às 19h ainda na tarde).
 * `ativa: false` (preferência do usuário) devolve null — folha neutra.
 */
export function useLuzDoDia(ativa: boolean): LuzDoDia | null {
  const [luzAtual, setLuzAtual] = useState<LuzDoDia | null>(() =>
    ativa ? luzDoDia() : null,
  )

  useEffect(() => {
    if (!ativa) {
      setLuzAtual(null)
      return
    }
    const atualizar = () => setLuzAtual(luzDoDia())
    atualizar()
    const relogio = setInterval(atualizar, PASSO_MS)
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') atualizar()
    })
    return () => {
      clearInterval(relogio)
      assinatura.remove()
    }
  }, [ativa])

  return luzAtual
}
