import { getPresetExplicito, resolveVitrine, type VitrineCodigo } from '@mallevo/lib'

/**
 * Qual vitrine (layout próprio) esta loja veste no web — a MESMA decisão do
 * consumer, tomada pela tabela `VITRINES` de @mallevo/lib: `preset` explícito
 * do `stores.theme` × `categoria_slug`. `null` = layout padrão (só pele).
 */
export function resolveVitrineDaLoja(store: {
  theme: unknown | null
  categoria_slug: string | null
}): VitrineCodigo | null {
  return resolveVitrine(getPresetExplicito(store.theme), store.categoria_slug)
}
