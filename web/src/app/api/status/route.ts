import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const data = {
    status: 'online',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    app_version: process.env.npm_package_version || '1.0.0',
    nextjs_version: '14.2.29'
  };

  return NextResponse.json(data);
} 