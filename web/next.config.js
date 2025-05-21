/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
    scrollRestoration: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  poweredByHeader: false,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  webpack(config) {
    return config;
  },
  
  async rewrites() {
    return [
      {
        source: '/.identity',
        destination: '/api/identity',
      },
      {
        source: '/.well-known/appspecific/com.chrome.devtools.json',
        destination: '/api/devtools',
      },
    ];
  },
}

module.exports = nextConfig 