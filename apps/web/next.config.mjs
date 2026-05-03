/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mallora/types', '@mallora/lib'],
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
        'localhost:3000',
        'app.mallevo.com.br',
        '*.mallevo.com.br',
        '*.mallevo.localhost',
      ],
    },
  },
}

export default nextConfig
