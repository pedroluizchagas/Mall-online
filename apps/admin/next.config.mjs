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
      allowedOrigins: ['localhost:3001', 'admin.mallevo.com.br'],
    },
  },
}

export default nextConfig
