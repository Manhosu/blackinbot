/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações básicas
  trailingSlash: false,
  reactStrictMode: false,
  poweredByHeader: false,
  
  // Build config
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  
  // Images config
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Compiler config
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // External packages
  transpilePackages: ['@supabase/supabase-js'],
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig 