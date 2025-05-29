import { NextRequest, NextResponse } from 'next/server';
import { WebhookManager } from '@/lib/webhook-manager';

// Sistema de inicialização automática
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [INIT] Inicializando sistema automatizado...');
    
    // 1. Configurar todos os webhooks
    const webhookResult = await WebhookManager.setupAllBots();
    
    // 2. Verificar status do sistema
    const systemStatus = {
      timestamp: new Date().toISOString(),
      webhooks: webhookResult,
      environment: process.env.NODE_ENV || 'development',
      baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://blackinbot.vercel.app'
    };
    
    console.log('✅ [INIT] Sistema inicializado com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Sistema inicializado com sucesso',
      status: systemStatus
    });
    
  } catch (error) {
    console.error('❌ [INIT] Erro na inicialização:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro na inicialização do sistema',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Endpoint para verificar saúde do sistema
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'health-check':
        return NextResponse.json({
          success: true,
          message: 'Sistema funcionando',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
        
      case 'force-init':
        const result = await WebhookManager.setupAllBots();
        return NextResponse.json({
          success: true,
          message: 'Inicialização forçada executada',
          result
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Ação não reconhecida'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ [INIT] Erro na ação:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro na execução da ação'
    }, { status: 500 });
  }
} 