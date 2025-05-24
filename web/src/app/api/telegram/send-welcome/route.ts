import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, chatId, welcomeMessage, welcomeMediaUrl, plans } = await request.json();
    
    console.log('📤 Enviando mensagem de boas-vindas...');
    console.log('Token:', token?.substring(0, 10) + '...');
    console.log('Chat ID:', chatId);
    
    const baseUrl = `https://api.telegram.org/bot${token}`;
    
    // Preparar mensagem com planos
    let message = welcomeMessage + '\n\n💰 **Planos Disponíveis:**\n';
    
    if (plans && plans.length > 0) {
      plans.forEach((plan: any, index: number) => {
        message += `\n${index + 1}. **${plan.name}**\n`;
        message += `   💵 R$ ${plan.price}\n`;
        message += `   ⏰ ${plan.period} dias\n`;
      });
    } else {
      message += '\n1. **Acesso VIP**\n   💵 R$ 1,00\n   ⏰ 30 dias\n';
    }
    
    message += '\n\n🔗 Entre em contato para adquirir seu plano!';
    
    let result;
    
    // Se tem mídia, enviar como foto/vídeo com caption
    if (welcomeMediaUrl) {
      const isVideo = welcomeMediaUrl.includes('.mp4') || welcomeMediaUrl.includes('.mov') || welcomeMediaUrl.includes('video');
      const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
      const mediaField = isVideo ? 'video' : 'photo';
      
      console.log(`📸 Enviando ${isVideo ? 'vídeo' : 'imagem'} com mensagem...`);
      
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          [mediaField]: welcomeMediaUrl,
          caption: message,
          parse_mode: 'Markdown'
        })
      });
      
      result = await response.json();
    } else {
      // Só mensagem de texto
      console.log('💬 Enviando apenas mensagem de texto...');
      
      const response = await fetch(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      result = await response.json();
    }
    
    if (result.ok) {
      console.log('✅ Mensagem enviada com sucesso!');
      return NextResponse.json({ 
        success: true, 
        message: 'Mensagem enviada com sucesso!',
        telegram_response: result
      });
    } else {
      console.error('❌ Erro do Telegram:', result);
      return NextResponse.json({ 
        success: false, 
        error: result.description || 'Erro ao enviar mensagem',
        telegram_error: result
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Erro na API de envio:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 