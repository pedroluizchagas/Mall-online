import { coresDominantes } from '@mallevo/lib'

/**
 * Extrai as cores de marca da logo no CLIENT (canvas, zero dependências) —
 * docs/store-theme/06 §6.3. A quantização/filtragem vive em
 * @mallevo/lib (coresDominantes); aqui só lemos os pixels.
 *
 * Funciona com object URLs (upload em andamento) e com URLs públicas do
 * Supabase Storage (CORS `*` → canvas não fica tainted). Qualquer falha
 * (CORS, SVG sem dimensões, imagem inválida) → [] — sugestão é opcional,
 * nunca bloqueia o editor.
 */
export async function extrairCoresDaLogo(src: string, max = 3): Promise<string[]> {
  if (typeof document === 'undefined') return []

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    await img.decode()

    // Reduz para ≤64px no maior lado: suficiente para dominantes, barato.
    const escala = Math.min(1, 64 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
    const w = Math.max(1, Math.round((img.naturalWidth || 64) * escala))
    const h = Math.max(1, Math.round((img.naturalHeight || 64) * escala))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(img, 0, 0, w, h)

    return coresDominantes(ctx.getImageData(0, 0, w, h).data, max)
  } catch {
    return []
  }
}
