// Script para testar webhook do bot
const testWebhook = async () => {
  const botId = '2180ae3a-b8a7-4f22-8237-6c66641b1bf8';
  const webhookUrl = `https://blackinbot.vercel.app/api/webhook/${botId}`;
  
  const testUpdate = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: "Teste",
        username: "teste_user"
      },
      chat: {
        id: 123456789,
        type: "private"
      },
      date: Math.floor(Date.now() / 1000),
      text: "/start"
    }
  };

  try {
    console.log('🧪 Testando webhook:', webhookUrl);
    console.log('📤 Enviando update:', JSON.stringify(testUpdate, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.json();
    
    console.log('📋 Status:', response.status);
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook funcionando!');
    } else {
      console.log('❌ Webhook com erro');
    }
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
  }
};

testWebhook(); 