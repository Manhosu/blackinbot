/** @type {import('next').NextConfig} */
const nextConfig = {
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
  
  // Configurar para servidor dinâmico
  output: 'standalone',
  
  // Permitir imports externos
  transpilePackages: ['@supabase/supabase-js'],
  
  // Desabilitar geração estática
  trailingSlash: false,
  
  // Configurar para não gerar páginas estáticas
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig 