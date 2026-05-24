/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mallevo/types', '@mallevo/lib'],
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
