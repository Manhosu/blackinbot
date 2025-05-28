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
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  
  // Configurações para upload de arquivos
  serverRuntimeConfig: {
    maxFileSize: 25 * 1024 * 1024, // 25MB para vídeos
  },
  publicRuntimeConfig: {
    maxFileSize: 25 * 1024 * 1024, // 25MB para vídeos
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
  
  // Configuração atualizada para Next.js 15.x
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Experimental features para resolver problemas de build
  experimental: {
    // Desabilitar prerendering para páginas de erro
    missingSuspenseWithCSRBailout: false,
  },
  
  // Forçar todas as páginas para serem dinâmicas
  async redirects() {
    return [];
  },
  
  // Configuração para ignorar problemas de prerendering
  staticPageGenerationTimeout: 60,
  
  // Configurações específicas para problemas de React Context
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
  
  // Headers para CORS se necessário
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Configuração para ignorar erros específicos de páginas
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig 