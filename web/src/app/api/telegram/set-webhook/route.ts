import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { botToken, webhookUrl } = await request.json();
    
    if (!botToken) {
      return NextResponse.json({
        success: false,
        error: 'Token do bot é obrigatório'
      }, { status: 400 });
    }
    
    // Configurar webhook do Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    
    const webhookUrlFinal = webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
    
    console.log(`📱 Configurando webhook para: ${webhookUrlFinal}`);
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrlFinal,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
        secret_token: process.env.TELEGRAM_SECRET_TOKEN || undefined
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook configurado com sucesso');
      return NextResponse.json({
        success: true,
        message: 'Webhook configurado com sucesso',
        webhook_url: webhookUrlFinal,
        telegram_response: result
      });
    } else {
      console.error('❌ Erro ao configurar webhook:', result);
      return NextResponse.json({
        success: false,
        error: 'Erro ao configurar webhook',
        details: result
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botToken = searchParams.get('botToken');
    
    if (!botToken) {
      return NextResponse.json({
        success: false,
        error: 'Token do bot é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar webhook atual
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
    
    const response = await fetch(telegramApiUrl);
    const result = await response.json();
    
    if (result.ok) {
      return NextResponse.json({
        success: true,
        webhook_info: result.result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Erro ao obter informações do webhook',
        details: result
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
} 