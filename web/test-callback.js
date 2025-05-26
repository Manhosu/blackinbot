// Script para testar callback_query (clique nos planos)
const testCallbackQuery = async () => {
  const botId = '2180ae3a-b8a7-4f22-8237-6c66641b1bf8';
  const webhookUrl = `https://blackinbot.vercel.app/api/webhook/${botId}`;
  const testChatId = 987654321;
  
  // Simular clique em um plano
  const callbackUpdate = {
    update_id: 123456790,
    callback_query: {
      id: "callback123",
      from: {
        id: testChatId,
        is_bot: false,
        first_name: "Usuario",
        username: "usuario_teste"
      },
      message: {
        message_id: 2,
        chat: {
          id: testChatId,
          type: "private"
        },
        date: Math.floor(Date.now() / 1000)
      },
      data: "plan_4a2bff4e-34b0-4e31-bf67-5e4490987597", // ID real do plano VIP
      chat_instance: "chat123"
    }
  };

  try {
    console.log('🧪 Testando callback_query (clique no plano)...');
    console.log('📤 Enviando callback:', JSON.stringify(callbackUpdate, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackUpdate)
    });

    const result = await response.json();
    
    console.log('📋 Resposta do webhook:');
    console.log('  Status:', response.status);
    console.log('  Resultado:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Callback processado com sucesso!');
    } else {
      console.log('❌ Erro no webhook');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testCallbackQuery(); 