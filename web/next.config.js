/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações básicas
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Build config
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuração para manter APIs funcionando
  output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  
  // Images config
  images: {
    unoptimized: true,
  },
  
  // Configuração atualizada para Next.js 15.x
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Webpack config para resolver problemas de dependências
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Experimental - desabilitar prerendering
  experimental: {
    staticGenerationBailout: 'force',
  },
}

module.exports = nextConfig 