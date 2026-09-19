/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mallevo/types', '@mallevo/lib'],
  async headers() {
    return [
      {
        // /preview é embutido pelo dashboard (Minha Loja) em iframe — e só por ele.
        source: '/preview',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://app.mallevo.com.br http://localhost:3000 http://127.0.0.1:3000 http://localhost:3100 http://127.0.0.1:3100",
          },
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
