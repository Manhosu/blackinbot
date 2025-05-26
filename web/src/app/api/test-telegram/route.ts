import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { chatId, message } = await request.json();
    
    const botToken = '7859665110:AAFNe1gmKNHxZLr49QnZGBGO2Wy0eZ0diS0';
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const payload = {
      chat_id: chatId || 987654321,
      text: message || 'Teste de mensagem',
      parse_mode: 'Markdown'
    };

    console.log(`📤 TESTE - Enviando mensagem para chat ${payload.chat_id}:`, payload.text);
    console.log(`🔗 URL:`, url);
    console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log(`📋 Status da resposta:`, response.status);
    console.log(`📋 Resultado:`, JSON.stringify(result, null, 2));
    
    return NextResponse.json({
      success: true,
      telegramResponse: result,
      status: response.status
    });

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de teste do Telegram. Use POST com {chatId, message}'
  });
} 