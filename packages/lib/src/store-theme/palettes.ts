import type { ArquetipoCodigo, ColorTokens } from './types'

/**
 * Paletas curadas por arquétipo — o eixo de variedade do StoreTheme
 * (docs/store-theme/02 §2.4: "a variedade vem das PALETAS dentro de cada
 * arquétipo, não de novos arquétipos").
 *
 * Cada paleta é uma PELE de cor completa (8 tokens; semânticos ficam fixos)
 * aplicada sobre o default do arquétipo, preservando tipografia/forma. A
 * paleta "original" de cada arquétipo é o próprio preset (não listada aqui).
 *
 * Persistência: `stores.theme.palette` guarda só o CÓDIGO — os hex vivem
 * aqui e são refináveis sem quebrar lojas (mesmo princípio dos presets).
 * Ordem de resolução (resolve.ts): preset → paleta → overrides do lojista.
 *
 * Regras de autoria (verificadas em __tests__):
 * - `accentInk` legível sobre `accent` (WCAG AA ≥ 4.5) já na autoria;
 * - códigos únicos dentro do arquétipo;
 * - mesmo `mode` do arquétipo (paleta muda temperatura/acento, não o modo).
 */

/** Pele de cores de uma paleta curada — semânticos (success/…) ficam fixos. */
export type PaletaPele = Omit<ColorTokens, 'success' | 'warning' | 'danger'>

export interface Paleta {
  codigo: string
  /** Nome humano exibido no editor. */
  nome: string
  color: PaletaPele
}

export const PALETAS: Record<ArquetipoCodigo, readonly Paleta[]> = {
  heritage: [
    {
      codigo: 'vinha',
      nome: 'Vinha',
      color: {
        bg: '#FBF5F2', surface: '#FFFFFF', surfaceAlt: '#F5E8E3',
        ink: '#211514', inkMuted: '#6F544E', line: '#ECDCD5',
        accent: '#8E3B46', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'oliva',
      nome: 'Oliva',
      color: {
        bg: '#F8F7EE', surface: '#FFFFFF', surfaceAlt: '#EFEFDC',
        ink: '#1A1A12', inkMuted: '#66684C', line: '#E5E5D0',
        accent: '#5F6B2F', accentInk: '#FFFFFF',
      },
    },
  ],
  raw: [
    {
      // Destilada da referência-âncora Rawline (docs/store-theme/02 §B):
      // vermelhão brutalista + creme quente sobre preto fuligem.
      codigo: 'brasa',
      nome: 'Brasa',
      color: {
        bg: '#0B0A09', surface: '#141311', surfaceAlt: '#1F1D1A',
        ink: '#F2EAD9', inkMuted: '#9C9482', line: '#2A2723',
        accent: '#E8442A', accentInk: '#0B0A09',
      },
    },
    {
      codigo: 'sinal',
      nome: 'Sinal',
      color: {
        bg: '#0E0E10', surface: '#18181B', surfaceAlt: '#232327',
        ink: '#FAFAFA', inkMuted: '#A1A1AA', line: '#27272A',
        accent: '#FF6B2C', accentInk: '#0E0E10',
      },
    },
    {
      codigo: 'gelo',
      nome: 'Gelo',
      color: {
        bg: '#0E0E10', surface: '#18181B', surfaceAlt: '#232327',
        ink: '#FAFAFA', inkMuted: '#A1A1AA', line: '#27272A',
        accent: '#6EE7F0', accentInk: '#0E0E10',
      },
    },
  ],
  editorial: [
    {
      codigo: 'papel',
      nome: 'Papel',
      color: {
        bg: '#FAF6EF', surface: '#FFFFFF', surfaceAlt: '#F1EADC',
        ink: '#1A1712', inkMuted: '#7A7262', line: '#E9E1D1',
        accent: '#1A1712', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'gelo',
      nome: 'Gelo',
      color: {
        bg: '#F7F8FA', surface: '#FFFFFF', surfaceAlt: '#EDF0F4',
        ink: '#0F1115', inkMuted: '#69707D', line: '#E3E7ED',
        accent: '#0F1115', accentInk: '#FFFFFF',
      },
    },
  ],
  noir: [
    {
      codigo: 'prata',
      nome: 'Prata',
      color: {
        bg: '#000000', surface: '#0C0C0C', surfaceAlt: '#161616',
        ink: '#F5F5F5', inkMuted: '#8A8A8A', line: '#1C1C1C',
        accent: '#C9CDD6', accentInk: '#000000',
      },
    },
    {
      codigo: 'rubi',
      nome: 'Rubi',
      color: {
        bg: '#000000', surface: '#0C0C0C', surfaceAlt: '#161616',
        ink: '#F5F5F5', inkMuted: '#8A8A8A', line: '#1C1C1C',
        accent: '#B8434E', accentInk: '#FFFFFF',
      },
    },
  ],
  serene: [
    {
      codigo: 'salvia',
      nome: 'Sálvia',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#EFF2EB',
        ink: '#1B211C', inkMuted: '#79837A', line: '#E5E9E2',
        accent: '#5F6F52', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'perola',
      nome: 'Pérola',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#F5F1EC',
        ink: '#241F1C', inkMuted: '#8A817A', line: '#ECE6DF',
        accent: '#8A6A57', accentInk: '#FFFFFF',
      },
    },
  ],
  soft: [
    {
      codigo: 'lavanda',
      nome: 'Lavanda',
      color: {
        bg: '#F7F5FB', surface: '#FFFFFF', surfaceAlt: '#EEEAF7',
        ink: '#292633', inkMuted: '#7B7590', line: '#E7E2F1',
        accent: '#7C5FD3', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'menta',
      nome: 'Menta',
      color: {
        bg: '#F1F8F4', surface: '#FFFFFF', surfaceAlt: '#E4F1E9',
        ink: '#222A26', inkMuted: '#6C7A72', line: '#DDEAE2',
        accent: '#17795A', accentInk: '#FFFFFF',
      },
    },
  ],
  artisan: [
    {
      codigo: 'terracota',
      nome: 'Terracota',
      color: {
        bg: '#F6EFE9', surface: '#FCF8F3', surfaceAlt: '#EEE1D6',
        ink: '#2B211C', inkMuted: '#70604F', line: '#E5D6C8',
        accent: '#A65A3A', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'salvia',
      nome: 'Sálvia',
      color: {
        bg: '#F2F2EB', surface: '#FAFAF4', surfaceAlt: '#E8E9DD',
        ink: '#24261E', inkMuted: '#666A57', line: '#DEE0D0',
        accent: '#5E6F4A', accentInk: '#FFFFFF',
      },
    },
  ],
  clinic: [
    {
      codigo: 'azul',
      nome: 'Azul clínico',
      color: {
        bg: '#F4F7FB', surface: '#FFFFFF', surfaceAlt: '#E9F0F8',
        ink: '#142433', inkMuted: '#5A6C7D', line: '#DCE7F0',
        accent: '#2160C4', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'botica',
      nome: 'Botica',
      color: {
        bg: '#F4F9F5', surface: '#FFFFFF', surfaceAlt: '#E8F3EA',
        ink: '#14301C', inkMuted: '#5A7161', line: '#DCEAE0',
        accent: '#15803D', accentInk: '#FFFFFF',
      },
    },
  ],
  tech: [
    {
      codigo: 'violeta',
      nome: 'Violeta',
      color: {
        bg: '#FFFFFF', surface: '#F8F7FB', surfaceAlt: '#F0EEF6',
        ink: '#14101F', inkMuted: '#635C76', line: '#E7E4EF',
        accent: '#7C3AED', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'ciano',
      nome: 'Ciano',
      color: {
        bg: '#FFFFFF', surface: '#F6F9FA', surfaceAlt: '#EBF2F4',
        ink: '#0B1B20', inkMuted: '#54696F', line: '#E1EAEC',
        accent: '#0E7490', accentInk: '#FFFFFF',
      },
    },
  ],
  market: [
    {
      codigo: 'feira',
      nome: 'Feira',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#F8F1EC',
        ink: '#26180F', inkMuted: '#6E5B4D', line: '#EEE2D8',
        accent: '#C2410C', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'atacado',
      nome: 'Atacado',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#EFF3FA',
        ink: '#101A2E', inkMuted: '#56617A', line: '#E2E8F2',
        accent: '#1D4ED8', accentInk: '#FFFFFF',
      },
    },
  ],
  utility: [
    {
      codigo: 'oficina',
      nome: 'Oficina',
      color: {
        bg: '#14161A', surface: '#1D2025', surfaceAlt: '#262A31',
        ink: '#F4F5F7', inkMuted: '#9AA1AC', line: '#2D323A',
        accent: '#EF4444', accentInk: '#14161A',
      },
    },
    {
      codigo: 'eletrico',
      nome: 'Elétrico',
      color: {
        bg: '#14161A', surface: '#1D2025', surfaceAlt: '#262A31',
        ink: '#F4F5F7', inkMuted: '#9AA1AC', line: '#2D323A',
        accent: '#38BDF8', accentInk: '#14161A',
      },
    },
  ],
  playful: [
    {
      codigo: 'sol',
      nome: 'Sol',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#FFF4DE',
        ink: '#33250E', inkMuted: '#7A6B4E', line: '#F3E7CE',
        accent: '#F59E0B', accentInk: '#33250E',
      },
    },
    {
      codigo: 'chiclete',
      nome: 'Chiclete',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#FDEEF5',
        ink: '#391527', inkMuted: '#83606F', line: '#F6E0EA',
        accent: '#DB2777', accentInk: '#FFFFFF',
      },
    },
  ],
}

/** Paleta curada de um arquétipo pelo código; null = original/desconhecida. */
export function getPaleta(
  preset: ArquetipoCodigo,
  codigo: string | undefined | null,
): Paleta | null {
  if (!codigo) return null
  return PALETAS[preset]?.find((p) => p.codigo === codigo) ?? null
}
