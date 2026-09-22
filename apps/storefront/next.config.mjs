/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mallevo/types', '@mallevo/lib'],
  async headers() {
    // Quem pode embutir o /preview num iframe: o dashboard, e só ele. As
    // origens de localhost existem para o dev e para o e2e — em produção NÃO
    // entram (achado A-13: elas estavam indo junto no header publicado).
    // `PREVIEW_FRAME_ANCESTORS` permite acrescentar origens (ex.: um Preview
    // da Vercel do dashboard) sem mexer no código.
    const ehProducao = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'
    const ancestrais = [
      "'self'",
      'https://app.mallevo.com.br',
      ...(ehProducao
        ? []
        : [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3100',
            'http://127.0.0.1:3100',
          ]),
      ...(process.env.PREVIEW_FRAME_ANCESTORS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    ]

    return [
      {
        // /preview é embutido pelo dashboard (Minha Loja) em iframe — e só por ele.
        source: '/preview',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${ancestrais.join(' ')}` },
        ],
      },
      {
        // Todo o resto da loja (catálogo, produto, CHECKOUT, pedido, auth) não
        // é embutível por ninguém — clickjacking sobre o checkout seria o alvo
        // óbvio. O `/preview` fica de FORA pelo lookahead negativo: quando duas
        // regras casam, o Next manda os dois headers e o navegador aplica a
        // interseção das CSPs — o `'none'` venceria e mataria o iframe.
        source: '/:path((?!preview$).*)',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3002',
        '*.mallevo.com.br',
        '*.mallevo.localhost',
      ],
    },
  },
}

export default nextConfig
