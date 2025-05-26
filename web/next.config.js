/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
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
  // Configurar variáveis de ambiente
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://xcnhlmqkovfaqyjxwdje.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.Ej_2Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
    NEXT_PUBLIC_APP_URL: 'https://blackinbot.vercel.app',
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