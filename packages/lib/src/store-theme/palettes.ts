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
  roast: [
    {
      // Torra escura: marrom-café profundo com terracota quente.
      codigo: 'barro',
      nome: 'Barro',
      color: {
        bg: '#241A14', surface: '#2C221A', surfaceAlt: '#372B21',
        ink: '#F4EBDD', inkMuted: '#A99882', line: '#413428',
        accent: '#E0703A', accentInk: '#211006',
      },
    },
    {
      // Verde-hortelã noturno para cafés de vibe fresca.
      codigo: 'hortela',
      nome: 'Hortelã',
      color: {
        bg: '#16241E', surface: '#1D2E26', surfaceAlt: '#263A30',
        ink: '#EDF5EC', inkMuted: '#93A89A', line: '#31473B',
        accent: '#8FD9A8', accentInk: '#0E1F16',
      },
    },
    {
      // Roxo-açaí profundo + orquídea vibrante — a pele das açaíterias.
      codigo: 'acai',
      nome: 'Açaí',
      color: {
        bg: '#24102E', surface: '#2E1839', surfaceAlt: '#392046',
        ink: '#F6EFF9', inkMuted: '#B5A3C4', line: '#432952',
        accent: '#C97BEA', accentInk: '#240F2B',
      },
    },
  ],
  ritual: [
    {
      // O verde-matcha da referência OCHA — a pele literal, sem o desvio açaí.
      codigo: 'matcha',
      nome: 'Matcha',
      color: {
        bg: '#F6B8D3', surface: '#FBF3DC', surfaceAlt: '#F9D3E3',
        // inkMuted aprofundado: a ficha do PDP ritual escreve o texto de apoio
        // DIRETO no rosa, sem surface por baixo — o verde claro dava 2,7:1.
        ink: '#16382A', inkMuted: '#43594E', line: '#EBA0C4',
        accent: '#1C4A34', accentInk: '#FBF3DC',
      },
    },
    {
      // Vinho-pitaya: rosa sobre rosa, o tropical mais intenso da família.
      codigo: 'pitaya',
      nome: 'Pitaya',
      color: {
        bg: '#F6B8D3', surface: '#FBF3DC', surfaceAlt: '#F9D3E3',
        ink: '#4A0E2B', inkMuted: '#7E405C', line: '#EBA0C4',
        accent: '#831441', accentInk: '#FBF3DC',
      },
    },
  ],
  smash: [
    {
      // Marrom-espresso + mostarda: o burger clássico de chapa.
      codigo: 'mostarda',
      nome: 'Mostarda',
      color: {
        bg: '#2B1A0E', surface: '#342112', surfaceAlt: '#3E2917',
        ink: '#FCF3E2', inkMuted: '#C4A88B', line: '#4A311C',
        accent: '#F2B33D', accentInk: '#2B1503',
      },
    },
    {
      // Fuligem quente + vermelho-pimenta: a lanchonete de fim de noite.
      codigo: 'pimenta',
      nome: 'Pimenta',
      color: {
        bg: '#1C1013', surface: '#261519', surfaceAlt: '#301B20',
        ink: '#FBF0E7', inkMuted: '#BA9C94', line: '#3C2329',
        accent: '#FF5A3C', accentInk: '#240905',
      },
    },
  ],
  garden: [
    {
      // Beterraba assada: o mesmo farm-to-table com o vermelho-terroso no
      // lugar do verde — o rosa dos cartões continua servindo a pele.
      codigo: 'beterraba',
      nome: 'Beterraba',
      color: {
        bg: '#FAF3E3', surface: '#FFFDF6', surfaceAlt: '#F3E8D3',
        // inkMuted aprofundado pelo mesmo motivo do preset: os rótulos e as
        // linhas de ingredientes desta vitrine escrevem direto no creme.
        ink: '#3A1A24', inkMuted: '#6E5148', line: '#EDDCC8',
        accent: '#7A2743', accentInk: '#FAF3E3',
      },
    },
    {
      // Cacau e grão tostado: a casa de granola/pães integrais.
      codigo: 'cacau',
      nome: 'Cacau',
      color: {
        bg: '#F8F1E4', surface: '#FFFCF4', surfaceAlt: '#EFE4D2',
        ink: '#2E2318', inkMuted: '#6E6049', line: '#E8DCC6',
        accent: '#4C3323', accentInk: '#F8F1E4',
      },
    },
  ],
  slice: [
    {
      // A cantina verde-oliva: o mesmo cartaz com o basílico no lugar do
      // vermelho — os blocos preto e ouro continuam servindo a pele.
      codigo: 'basilico',
      nome: 'Basílico',
      color: {
        bg: '#F4F1E2', surface: '#FDFBEF', surfaceAlt: '#EAE6CF',
        // inkMuted aprofundado pelo mesmo motivo do preset: as descrições de
        // item desta vitrine escrevem direto no creme.
        ink: '#171B10', inkMuted: '#616550', line: '#E3DFC6',
        accent: '#2C5E34', accentInk: '#F4F1E2',
      },
    },
    {
      // Vinho da casa: a cantina de massas ao tinto, mais grave que o
      // vermelho-cartaz do preset.
      codigo: 'vinho',
      nome: 'Vinho',
      color: {
        bg: '#F7F0E2', surface: '#FFFBF0', surfaceAlt: '#EFE3CF',
        ink: '#241318', inkMuted: '#6E5B54', line: '#EADFCA',
        accent: '#7A1F33', accentInk: '#F7F0E2',
      },
    },
  ],
  mono: [
    {
      // Off-white quente de quiet luxury. As paletas do mono trocam a
      // TEMPERATURA do branco e nunca acrescentam cor — a única do arquétipo
      // é o laranja do chip de escassez, que é DNA da vitrine, não token.
      codigo: 'areia',
      nome: 'Areia',
      color: {
        bg: '#F6F2EA', surface: '#FCFAF6', surfaceAlt: '#ECE6D8',
        ink: '#1A1712', inkMuted: '#6B6355', line: '#E5DECE',
        accent: '#1A1712', accentInk: '#F6F2EA',
      },
    },
    {
      // Rosé quase imperceptível — o branco das lojas femininas.
      codigo: 'porcelana',
      nome: 'Porcelana',
      color: {
        bg: '#FAF5F2', surface: '#FFFDFB', surfaceAlt: '#F2E9E3',
        ink: '#201417', inkMuted: '#6F5D5B', line: '#EBE0D9',
        accent: '#201417', accentInk: '#FAF5F2',
      },
    },
  ],
  magazine: [
    {
      // O rosa-varejo da referência Revive.
      codigo: 'framboesa',
      nome: 'Framboesa',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#FBF2F5',
        ink: '#221419', inkMuted: '#7C6870', line: '#F0E2E7',
        accent: '#C2185B', accentInk: '#FFFFFF',
      },
    },
    {
      // Azul-magazine dos grandes varejos brasileiros.
      codigo: 'azul-magazine',
      nome: 'Azul magazine',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#F0F4FB',
        ink: '#131A26', inkMuted: '#63707F', line: '#E2E9F2',
        accent: '#1D4ED8', accentInk: '#FFFFFF',
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
  volt: [
    {
      // O azul-violeta elétrico da faixa de anúncio da referência Nivest.
      codigo: 'eletrico',
      nome: 'Elétrico',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#EFF0FA',
        ink: '#0B0A14', inkMuted: '#6A6980', line: '#E5E6F2',
        accent: '#4633FF', accentInk: '#FFFFFF',
      },
    },
    {
      codigo: 'laranja-pista',
      nome: 'Laranja pista',
      color: {
        bg: '#FFFFFF', surface: '#FFFFFF', surfaceAlt: '#F5F0EA',
        ink: '#140D07', inkMuted: '#79695C', line: '#EDE4DA',
        // Aprofundado p/ sustentar tinta branca com AA real (≥ 4.5).
        accent: '#C2430A', accentInk: '#FFFFFF',
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
