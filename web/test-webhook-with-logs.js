// Script para testar webhook e monitorar resposta do bot
const testWebhookAndResponse = async () => {
  const botId = '2180ae3a-b8a7-4f22-8237-6c66641b1bf8';
  const botToken = '7859665110:AAFNe1gmKNHxZLr49QnZGBGO2Wy0eZ0diS0';
  const webhookUrl = `https://blackinbot.vercel.app/api/webhook/${botId}`;
  const testChatId = 987654321;
  
  // Simular um update real do Telegram
  const realUpdate = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: testChatId,
        is_bot: false,
        first_name: "Usuario",
        username: "usuario_teste"
      },
      chat: {
        id: testChatId,
        type: "private"
      },
      date: Math.floor(Date.now() / 1000),
      text: "/start"
    }
  };

  try {
    console.log('🧪 Testando webhook completo...');
    console.log('📤 Enviando /start para webhook...');
    
    // 1. Enviar update para webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realUpdate)
    });

    const webhookResult = await webhookResponse.json();
    
    console.log('📋 Resposta do webhook:');
    console.log('  Status:', webhookResponse.status);
    console.log('  Resultado:', JSON.stringify(webhookResult, null, 2));
    
    if (!webhookResponse.ok) {
      console.log('❌ Webhook falhou');
      return;
    }

    console.log('✅ Webhook processado com sucesso!');
    
    // 2. Aguardar um momento e verificar se bot enviou resposta
    console.log('⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Tentar verificar se há mensagens pendentes para o bot
    console.log('🔍 Verificando atualizações do bot...');
    
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
    const updatesResult = await updatesResponse.json();
    
    console.log('📋 Updates do bot:');
    console.log('  Status:', updatesResponse.status);
    console.log('  Resultado:', JSON.stringify(updatesResult, null, 2));
    
    // 4. Verificar info do webhook
    console.log('🔍 Verificando info do webhook...');
    
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const webhookInfoResult = await webhookInfoResponse.json();
    
    console.log('📋 Info do webhook:');
    console.log('  Status:', webhookInfoResponse.status);
    console.log('  Resultado:', JSON.stringify(webhookInfoResult, null, 2));

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testWebhookAndResponse(); 