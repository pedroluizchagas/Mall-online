import { useEffect, useMemo, useState } from 'react'
import type { TextStyle } from 'react-native'
import * as Font from 'expo-font'
import type { FontSpec, ThemeTokens } from '@mallevo/lib'

import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces'
import {
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond'
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito'
import {
  Spectral_400Regular,
  Spectral_500Medium,
  Spectral_600SemiBold,
} from '@expo-google-fonts/spectral'
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import {
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from '@expo-google-fonts/baloo-2'
import { Anton_400Regular } from '@expo-google-fonts/anton'

/**
 * Fontes dos 17 arquétipos (StoreTheme) para o mobile-consumer.
 *
 * RN não herda fontFamily nem sintetiza pesos: cada peso é um arquivo próprio
 * com nome `Familia_600SemiBold`. Este módulo mapeia as famílias/pesos
 * declarados em `ARQUETIPOS` (@mallevo/lib presets) para os assets dos
 * pacotes @expo-google-fonts e expõe:
 *
 * - `useThemeFonts(tokens)`: carrega (via expo-font) SÓ as famílias da loja
 *   atual, ao entrar nela. Enquanto carrega (ou se falhar), os componentes
 *   caem no peso do sistema — sem flash bloqueante.
 * - `fontStyle(spec, weight)`: estilo de Text pronto — `fontFamily` do peso
 *   disponível mais próximo quando o spec está carregado, senão `fontWeight`
 *   de sistema.
 *
 * Só entram aqui as famílias que são TOKEN de arquétipo. Fonte que é DNA de uma
 * vitrine só (o mono/serif da raw, o Shrikhand do wordmark da ritual) fica de
 * fora e é carregada localmente pelo componente que a desenha.
 *
 * Fora de loja (home/abas) nada disso roda — tipografia Mallevo intacta.
 */

/** Sufixo do nome de export por peso (convenção @expo-google-fonts). */
const PESO_SUFIXO: Record<number, string> = {
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
}

/** família (nome nos presets) → peso → asset. Cobre os pesos dos ARQUETIPOS. */
const FONTES: Record<string, Record<number, Font.FontSource>> = {
  Fraunces: {
    400: Fraunces_400Regular,
    600: Fraunces_600SemiBold,
    700: Fraunces_700Bold,
  },
  Archivo: {
    600: Archivo_600SemiBold,
    700: Archivo_700Bold,
    800: Archivo_800ExtraBold,
  },
  Inter: {
    400: Inter_400Regular,
    500: Inter_500Medium,
    600: Inter_600SemiBold,
    700: Inter_700Bold,
    800: Inter_800ExtraBold,
  },
  'Cormorant Garamond': {
    500: CormorantGaramond_500Medium,
    600: CormorantGaramond_600SemiBold,
    700: CormorantGaramond_700Bold,
  },
  Nunito: {
    400: Nunito_400Regular,
    500: Nunito_500Medium,
    600: Nunito_600SemiBold,
    700: Nunito_700Bold,
    800: Nunito_800ExtraBold,
  },
  Spectral: {
    400: Spectral_400Regular,
    500: Spectral_500Medium,
    600: Spectral_600SemiBold,
  },
  'Space Grotesk': {
    500: SpaceGrotesk_500Medium,
    600: SpaceGrotesk_600SemiBold,
    700: SpaceGrotesk_700Bold,
  },
  'Baloo 2': {
    500: Baloo2_500Medium,
    600: Baloo2_600SemiBold,
    700: Baloo2_700Bold,
  },
  // Peso único de fábrica — as caps condensadas da ritual já nascem pesadas.
  // `pesoMaisProximo` derruba qualquer `fontStyle(display, 800)` neste 400.
  Anton: {
    400: Anton_400Regular,
  },
}

/** Nome RN do asset: 'Cormorant Garamond' + 600 → 'CormorantGaramond_600SemiBold'. */
function nomeFonte(family: string, weight: number): string {
  return `${family.replace(/ /g, '')}_${weight}${PESO_SUFIXO[weight] ?? weight}`
}

/**
 * Itálicos verdadeiros por família — carregados JUNTO com a família quando o
 * tema a usa. iOS não sintetiza itálico de fonte custom; sem o asset real,
 * `fontStyle: 'italic'` é silenciosamente ignorado. Hoje só o Cormorant
 * (noir) precisa — os nomes de prato da vitrine gastronômica são em itálico.
 */
const FONTES_ITALICO: Record<string, Record<number, Font.FontSource>> = {
  'Cormorant Garamond': {
    500: CormorantGaramond_500Medium_Italic,
    600: CormorantGaramond_600SemiBold_Italic,
  },
}

/** Nome RN do asset itálico: 'CormorantGaramond_500Medium_Italic'. */
function nomeFonteItalico(family: string, weight: number): string {
  return `${nomeFonte(family, weight)}_Italic`
}

/**
 * Estilo itálico verdadeiro de um Text tematizado. Com o spec carregado e a
 * família tendo itálico registrado, usa o asset real; senão cai no itálico
 * sintético de sistema (funciona porque aí a fontFamily também é de sistema).
 */
export function fontStyleItalico(
  spec: FontSpec | null,
  weight: 400 | 500 | 600 | 700,
): TextStyle {
  if (spec && FONTES_ITALICO[spec.family]) {
    const disponiveis = Object.keys(FONTES_ITALICO[spec.family]).map(Number)
    const ate = disponiveis.filter((w) => w <= weight).sort((a, b) => a - b)
    const escolhido = ate.length > 0 ? ate[ate.length - 1] : disponiveis[0]
    return { fontFamily: nomeFonteItalico(spec.family, escolhido) }
  }
  return { fontStyle: 'italic', fontWeight: String(weight) as TextStyle['fontWeight'] }
}

/**
 * Peso disponível mais próximo do desejado dentro do spec: o maior peso
 * declarado ≤ desejado; se nenhum, o menor declarado (ex.: 800 com
 * [400,600,700] → 700).
 */
function pesoMaisProximo(spec: FontSpec, desejado: number): number {
  const disponiveis = spec.weights
    .filter((w) => FONTES[spec.family]?.[w] !== undefined)
    .sort((a, b) => a - b)
  if (disponiveis.length === 0) return desejado
  const ate = disponiveis.filter((w) => w <= desejado)
  return ate.length > 0 ? ate[ate.length - 1] : disponiveis[0]
}

/**
 * Estilo tipográfico de um Text tematizado. `spec` null (fora de loja, fonte
 * ainda carregando ou família desconhecida) → peso do sistema, aparência
 * idêntica à de hoje.
 */
export function fontStyle(spec: FontSpec | null, weight: 400 | 500 | 600 | 700 | 800): TextStyle {
  if (spec && FONTES[spec.family]) {
    return { fontFamily: nomeFonte(spec.family, pesoMaisProximo(spec, weight)) }
  }
  return { fontWeight: String(weight) as TextStyle['fontWeight'] }
}

/**
 * Carrega as fontes (display + body) do tema da loja atual. Retorna `true`
 * quando prontas. `tokens` null → não carrega nada (loja sem preset v2).
 */
export function useThemeFonts(tokens: ThemeTokens | null): boolean {
  const [prontas, setProntas] = useState(false)

  // Mapa estável de assets a carregar — só muda se as famílias/pesos mudarem.
  const mapa = useMemo(() => {
    if (!tokens) return null
    const out: Record<string, Font.FontSource> = {}
    for (const spec of [tokens.typography.display, tokens.typography.body]) {
      const familia = FONTES[spec.family]
      if (!familia) continue
      for (const w of spec.weights) {
        const asset = familia[w]
        if (asset) out[nomeFonte(spec.family, w)] = asset
      }
      // Itálicos verdadeiros da família (quando registrados) vêm junto.
      const italicos = FONTES_ITALICO[spec.family]
      if (italicos) {
        for (const [w, asset] of Object.entries(italicos)) {
          out[nomeFonteItalico(spec.family, Number(w))] = asset
        }
      }
    }
    return Object.keys(out).length > 0 ? out : null
  }, [tokens])

  useEffect(() => {
    if (!mapa) {
      setProntas(false)
      return
    }
    let cancelado = false
    setProntas(false)
    Font.loadAsync(mapa)
      .then(() => {
        if (!cancelado) setProntas(true)
      })
      .catch(() => {
        // Falha de carregamento → segue com fonte de sistema (sem quebrar).
        if (!cancelado) setProntas(false)
      })
    return () => {
      cancelado = true
    }
  }, [mapa])

  return prontas
}
