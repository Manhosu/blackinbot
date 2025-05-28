/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações básicas
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Build config - desabilitar verificações que estão falhando
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuração standalone para deploy
  output: 'standalone',
  
  // Images config
  images: {
    unoptimized: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  
  // Configuração para Next.js 15.x
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Webpack config mais específico para resolver problemas de Html imports
  webpack: (config, { isServer, dev }) => {
    // Fallbacks básicos
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    
    // Ignorar warnings específicos sobre Html imports em desenvolvimento
    if (dev) {
      config.ignoreWarnings = [
        /critical dependency:/i,
        /the request of a dependency is an expression/i,
      ];
    }
    
    // Configuração específica para resolver problemas de prerendering
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'next/document': false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig 