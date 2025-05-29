// Script para testar envio de mensagem do Telegram
const testTelegramMessage = async () => {
  const botToken = '7859665110:AAFNe1gmKNHxZLr49QnZGBGO2Wy0eZ0diS0';
  const chatId = 123456789; // ID de teste
  const message = 'Teste de mensagem do bot';

  try {
    console.log('🧪 Testando envio de mensagem...');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    
    console.log('📋 Status:', response.status);
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    
    if (result.ok) {
      console.log('✅ Mensagem enviada com sucesso!');
    } else {
      console.log('❌ Erro ao enviar mensagem:', result.description);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

testTelegramMessage(); 