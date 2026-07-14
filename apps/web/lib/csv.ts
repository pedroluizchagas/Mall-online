/**
 * Utilidades CSV do dashboard — export (server actions) e import (client).
 *
 * Convenções (as mesmas de relatorios/actions.ts):
 * - delimitador vírgula; aspas duplas quando necessário ("" escapa aspas);
 * - preços em REAIS com ponto decimal ("12.90") — sem conflito com o
 *   delimitador e round-trip perfeito entre export e import.
 */

/** BOM UTF-8 — Excel só reconhece acentos com ele no início do arquivo. */
const BOM = '﻿'

export function escaparCsv(valor: unknown): string {
  const s = valor === null || valor === undefined ? '' : String(valor)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Gera o texto CSV com BOM (Excel reconhece UTF-8 com acentos). */
export function gerarCsv(cabecalho: readonly string[], linhas: readonly unknown[][]): string {
  const corpo = linhas.map((l) => l.map(escaparCsv).join(',')).join('\n')
  return `${BOM}${cabecalho.join(',')}${corpo ? `\n${corpo}` : ''}`
}

/**
 * Parser de CSV (client-side, import de produtos). Suporta:
 * - campos entre aspas com vírgulas/quebras de linha internas e "" escapado;
 * - delimitador `,` ou `;` (detectado na primeira linha — Excel pt-BR usa ;);
 * - \r\n e \n; BOM inicial.
 */
export function parseCsv(texto: string): string[][] {
  const src = texto.startsWith(BOM) ? texto.slice(1) : texto

  // Detecta o delimitador contando ocorrências fora de aspas na 1ª linha.
  const fimPrimeira = src.indexOf('\n')
  const primeiraLinha = src.slice(0, fimPrimeira === -1 ? undefined : fimPrimeira)
  let virgulas = 0
  let pontoEVirgulas = 0
  let emAspas = false
  for (const ch of primeiraLinha) {
    if (ch === '"') emAspas = !emAspas
    else if (!emAspas && ch === ',') virgulas++
    else if (!emAspas && ch === ';') pontoEVirgulas++
  }
  const delim = pontoEVirgulas > virgulas ? ';' : ','

  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (aspas) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          aspas = false
        }
      } else {
        campo += ch
      }
    } else if (ch === '"') {
      aspas = true
    } else if (ch === delim) {
      linha.push(campo)
      campo = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      linha.push(campo)
      campo = ''
      linhas.push(linha)
      linha = []
    } else {
      campo += ch
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo)
    linhas.push(linha)
  }

  // Descarta linhas totalmente vazias (comum no fim de arquivos do Excel).
  return linhas.filter((l) => l.some((c) => c.trim() !== ''))
}

/**
 * Converte um preço digitado/importado em CENTAVOS.
 * Aceita: "12.90" · "12,90" · "R$ 1.290,50" · "1290" (reais inteiros).
 * Inválido/≤0 → null.
 */
export function precoParaCentavos(valor: string): number | null {
  const bruto = valor.replace(/[R$\s]/gi, '').trim()
  if (!bruto) return null

  // Último separador [.,] seguido de 1–2 dígitos no fim = separador decimal.
  const m = bruto.match(/^(.*?)[.,](\d{1,2})$/)
  let reais: number
  if (m) {
    const inteiro = m[1].replace(/[.,]/g, '')
    if (!/^\d*$/.test(inteiro)) return null
    reais = Number(`${inteiro || '0'}.${m[2].padEnd(2, '0')}`)
  } else {
    const inteiro = bruto.replace(/[.,]/g, '')
    if (!/^\d+$/.test(inteiro)) return null
    reais = Number(inteiro)
  }

  const centavos = Math.round(reais * 100)
  return Number.isFinite(centavos) && centavos > 0 ? centavos : null
}

/** Centavos → "12.90" (formato canônico do CSV). */
export function centavosParaPreco(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return ''
  return (centavos / 100).toFixed(2)
}
