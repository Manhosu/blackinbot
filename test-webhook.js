// Script para testar o webhook do Telegram
const BASE_URL = 'http://localhost:3025';

async function testWebhook() {
  try {
    console.log('🧪 Testando webhook do Telegram...');
    
    // Simular uma mensagem de comando /start
    const startMessage = {
      update_id: 123456789,
      message: {
        message_id: 987654321,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'João',
          username: 'joaosilva',
          language_code: 'pt-br'
        },
        chat: {
          id: 123456789,
          first_name: 'João',
          username: 'joaosilva',
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    };
    
    console.log('📤 Enviando comando /start...');
    
    const startResponse = await fetch(`${BASE_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(startMessage)
    });
    
    const startResult = await startResponse.json();
    console.log('✅ Resposta:', startResult);
    
    // Simular uma mensagem de comando /pagar_1
    const paymentMessage = {
      ...startMessage,
      message: {
        ...startMessage.message,
        message_id: 987654322,
        date: Math.floor(Date.now() / 1000),
        text: '/pagar_1'
      }
    };
    
    console.log('\n📤 Enviando comando /pagar_1...');
    
    const paymentResponse = await fetch(`${BASE_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentMessage)
    });
    
    const paymentResult = await paymentResponse.json();
    console.log('✅ Resposta:', paymentResult);
    
    console.log('\n🎉 Teste do webhook completo!');
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
  }
}

// Executar teste
testWebhook(); 