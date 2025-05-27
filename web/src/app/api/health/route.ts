import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Verificar conexão com Supabase
    const { data, error } = await supabase
      .from('bots')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    // Verificar variáveis de ambiente essenciais
    const requiredEnvs = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TELEGRAM_BOT_TOKEN'
    ];
    
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvs.join(', ')}`);
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      app_url: process.env.NEXT_PUBLIC_APP_URL,
      checks: {
        supabase: 'connected',
        environment_variables: 'all_present',
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`
      }
    });
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
} 