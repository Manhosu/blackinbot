import { NextRequest, NextResponse } from 'next/server';
import { WebhookManager } from '@/lib/webhook-manager';

// Sistema de monitoramento automático que roda a cada 5 minutos
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [CRON] Iniciando monitoramento automático de webhooks...');
    
    // Verificar autorização (opcional para segurança)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'webhook-monitor-secret';
    
    if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
      console.log('⚠️ [CRON] Acesso não autorizado');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Executar configuração automática para todos os bots
    const result = await WebhookManager.setupAllBots();
    
    console.log('✅ [CRON] Monitoramento concluído:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Monitoramento automático executado',
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('❌ [CRON] Erro no monitoramento automático:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro no monitoramento automático',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Endpoint para forçar execução manual
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [MANUAL] Execução manual do monitoramento...');
    
    const result = await WebhookManager.setupAllBots();
    
    return NextResponse.json({
      success: true,
      message: 'Monitoramento manual executado',
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('❌ [MANUAL] Erro na execução manual:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro na execução manual',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 