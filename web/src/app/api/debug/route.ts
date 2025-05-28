import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Informações básicas sobre ambiente
  const envInfo = {
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    is_vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'local',
    app_url: process.env.NEXT_PUBLIC_APP_URL,
    host: request.headers.get('host'),
    user_agent: request.headers.get('user-agent')
  };

  // Informações sobre a solicitação
  const requestInfo = {
    url: request.url,
    method: request.method,
    geo: request.geo,
    next_url: {
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      host: request.nextUrl.host
    },
    cookies_count: request.cookies.size
  };

  // Verificar informações de limite de tamanho
  const sizeInfo = {
    max_request_size: '4MB',
    configured_upload_limit: process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '4MB',
    vercel_body_limit: '4.5MB (padrão Vercel)',
    serverless_timeout: process.env.VERCEL_SERVERLESS_TIMEOUT || '60s'
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: envInfo,
    request: requestInfo,
    size_limits: sizeInfo,
    message: 'Debug endpoint operacional'
  });
} 