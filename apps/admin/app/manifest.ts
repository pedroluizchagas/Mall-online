import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mallevo — Administração',
    short_name: 'Mallevo Admin',
    description: 'Os bastidores do shopping digital de Divinópolis.',
    start_url: '/',
    display: 'standalone',
    // A moldura da administração é a marquise: abertura e barra do app instalado em zinco.
    background_color: '#18181B',
    theme_color: '#18181B',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
