// Script para testar webhook com dados reais
const testRealWebhook = async () => {
  const botId = '2180ae3a-b8a7-4f22-8237-6c66641b1bf8';
  const webhookUrl = `https://blackinbot.vercel.app/api/webhook/${botId}`;
  
  // Simular um update real do Telegram
  const realUpdate = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 987654321, // ID de usuário diferente
        is_bot: false,
        first_name: "Usuario",
        username: "usuario_teste"
      },
      chat: {
        id: 987654321, // Mesmo ID do usuário para chat privado
        type: "private"
      },
      date: Math.floor(Date.now() / 1000),
      text: "/start"
    }
  };

  try {
    console.log('🧪 Testando webhook com dados reais...');
    console.log('📤 Enviando update:', JSON.stringify(realUpdate, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realUpdate)
    });

    const result = await response.json();
    
    console.log('📋 Status:', response.status);
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
      console.log('💡 Agora verifique se o bot tentou enviar uma mensagem para o chat ID:', realUpdate.message.chat.id);
    } else {
      console.log('❌ Webhook com erro');
    }
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
  }
};

testRealWebhook(); 