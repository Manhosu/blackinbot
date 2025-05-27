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
  try {
    console.log('🧪 Testando conexão com Supabase...');
    
    const supabase = createSupabaseAdmin();
    
    // Testar conexão básica
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, name')
      .limit(3);

    if (error) {
      console.error('❌ Erro no Supabase:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro na conexão com Supabase',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Conexão com Supabase OK');
    console.log('📋 Bots encontrados:', bots?.length || 0);

    return NextResponse.json({
      success: true,
      message: 'Conexão com Supabase funcionando',
      bots_count: bots?.length || 0,
      bots: bots
    });

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({
    success: true,
    message: 'POST funcionando!',
    received: body,
    timestamp: new Date().toISOString()
  });
} 