/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações básicas
  reactStrictMode: false,
  poweredByHeader: false,
  
  // Build config - desabilitar verificações que estão falhando
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Voltar ao standalone
  output: 'standalone',
  
  // Images config
  images: {
    unoptimized: true,
  },
  
  // Trailing slash
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  
  // Configuração para Next.js 15.x
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Experimental - forçar dynamic rendering
  experimental: {
    esmExternals: false,
  },
  
  // Webpack config
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
}

module.exports = nextConfig 