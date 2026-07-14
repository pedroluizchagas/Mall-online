/**
 * Extração de cores dominantes de uma imagem (logo) para sugerir o `accent`
 * do StoreTheme — docs/store-theme/06 §6.3.
 *
 * Este módulo é a parte PURA do pipeline (recebe pixels RGBA, devolve hex):
 * plataforma-agnóstico e testável. A leitura de pixels fica no consumidor
 * (web: canvas em apps/web/lib/cor-da-logo.ts; RN teria caminho próprio).
 *
 * Comportamento (espelha a spec): cores neutras (baixa saturação, quase
 * branco/preto) NÃO são sugeridas — logo neutra → lista vazia → o caller
 * mantém a paleta default do arquétipo.
 */

interface Bucket {
  count: number
  r: number
  g: number
  b: number
}

/** Saturação e luminosidade (HSL, 0–1) de um RGB 0–255. */
function satLum(r: number, g: number, b: number): { s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  return { s, l }
}

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

/** Distância euclidiana RGB — usada para deduplicar candidatas próximas. */
function distancia(a: Bucket, b: Bucket): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Cores dominantes "de marca" de um buffer RGBA (4 bytes/pixel).
 *
 * Pipeline: histograma quantizado (4 bits/canal → 4096 buckets, média real
 * por bucket) → filtra neutras (saturação < 0.25, muito claras/escuras) →
 * ranqueia por presença × saturação → deduplica próximas → top `max` em hex.
 *
 * Retorna [] quando a logo é neutra/monocromática — o caller mantém o
 * default do arquétipo (nada é imposto).
 */
export function coresDominantes(
  rgba: Uint8ClampedArray | Uint8Array | number[],
  max = 3,
): string[] {
  const buckets = new Map<number, Bucket>()

  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const a = rgba[i + 3]
    if (a < 125) continue // transparente — fundo de PNG/SVG não conta
    const r = rgba[i]
    const g = rgba[i + 1]
    const b = rgba[i + 2]
    const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const atual = buckets.get(chave)
    if (atual) {
      atual.count++
      atual.r += (r - atual.r) / atual.count
      atual.g += (g - atual.g) / atual.count
      atual.b += (b - atual.b) / atual.count
    } else {
      buckets.set(chave, { count: 1, r, g, b })
    }
  }

  const candidatas = [...buckets.values()]
    .map((bk) => {
      const { s, l } = satLum(bk.r, bk.g, bk.b)
      return { ...bk, s, l }
    })
    // Neutras fora: pouco saturadas, quase brancas ou quase pretas.
    .filter((c) => c.s >= 0.25 && c.l >= 0.12 && c.l <= 0.85)
    // Presença pondera mais que saturação, mas cor viva desempata.
    .sort((a, b) => b.count * (0.25 + b.s) - a.count * (0.25 + a.s))

  const escolhidas: Bucket[] = []
  for (const c of candidatas) {
    if (escolhidas.length >= max) break
    if (escolhidas.some((e) => distancia(e, c) < 60)) continue
    escolhidas.push(c)
  }

  return escolhidas.map((c) => toHex(c.r, c.g, c.b))
}
