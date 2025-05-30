/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app',
  },
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  serverExternalPackages: ['@supabase/supabase-js'],
  
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
            value: 'Content-Type, Authorization, x-user-data',
          },
        ],
      },
    ];
  },
  
  async redirects() {
    return [
      {
        source: '/dashboard/bots/:id/activate/:path*',
        destination: '/dashboard/bots/:id/activate',
        permanent: false,
      },
      {
        source: '/.identity',
        destination: '/identity',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig 