import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Variáveis de ambiente:');
  console.log('SUPABASE_URL:', url ? 'OK' : 'MISSING');
  console.log('SERVICE_KEY:', key ? 'OK' : 'MISSING');

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
}

export async function GET() {
  console.log('🧪 API de teste chamada');
  
  return NextResponse.json(
    { 
      message: "API funcionando corretamente",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🧪 POST de teste recebido:', body);
    
    return NextResponse.json(
      { 
        message: "POST funcionando corretamente",
    received: body,
    timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erro no teste POST:', error);
    return NextResponse.json(
      { message: "Erro no teste POST", error: error },
      { status: 500 }
    );
  }
} 