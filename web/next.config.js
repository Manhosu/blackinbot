/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para Vercel
  // Configurar para não gerar páginas estáticas problemáticas
  trailingSlash: false,
  // Configurações de build
  typescript: {
    // Ignorar erros de tipo durante o build (já corrigimos os principais)
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ignorar erros de ESLint durante o build
    ignoreDuringBuilds: true,
  },
  // Configurar variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  reactStrictMode: false,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  poweredByHeader: false,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Permitir imports externos
  transpilePackages: ['@supabase/supabase-js'],
  
  // Configurar para não gerar páginas estáticas
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig 