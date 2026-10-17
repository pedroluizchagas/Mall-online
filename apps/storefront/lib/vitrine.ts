import { getPresetExplicito, resolveVitrine, type VitrineCodigo } from '@mallevo/lib'

/**
 * Qual vitrine (layout próprio) esta loja veste no web — a MESMA decisão do
 * consumer, tomada pela tabela `VITRINES` de @mallevo/lib: a vitrine do
 * `preset` explícito do `stores.theme`, em qualquer ramo. `null` = layout
 * padrão (estilo sem vitrine ou loja sem estilo).
 */
export function resolveVitrineDaLoja(store: { theme: unknown | null }): VitrineCodigo | null {
  return resolveVitrine(getPresetExplicito(store.theme))
}

/**
 * Vitrines que já têm composição de COMPUTADOR (≥768px); o layout padrão
 * (`null`) também tem. As demais ainda são só a largura de celular em que
 * foram portadas do app: no desktop elas vestem a coluna central de 480px
 * (`MolduraDaVitrine`) até ganharem a sua, porte a porte, cada uma contra o
 * desktop da própria referência. Entrar nesta lista exige as duas
 * composições no disco (guarda em `components/vitrines/__tests__`).
 */
export const VITRINES_COM_DESKTOP: readonly VitrineCodigo[] = ['artesa']

export function vitrineTemDesktop(codigo: VitrineCodigo | null): boolean {
  return codigo === null || VITRINES_COM_DESKTOP.includes(codigo)
}
