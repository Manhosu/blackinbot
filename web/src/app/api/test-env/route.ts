import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    PUSHINPAY_API_KEY: process.env.PUSHINPAY_API_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV
  });
} 