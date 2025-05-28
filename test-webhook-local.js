// Teste específico do webhook local com vídeo
async function testWebhookLocal() {
  console.log('🧪 TESTE WEBHOOK LOCAL - VÍDEO');
  console.log('================================');
  
  try {
    // Primeiro, configurar um vídeo no banco
    console.log('📝 1. Configurando vídeo no banco...');
    
    // Simular o update que o Telegram enviaria
    const testUpdate = {
      update_id: Date.now(),
      message: {
        message_id: 1,
        from: {
          id: 5173071848, // Substitua pelo seu chat ID
          is_bot: false,
          first_name: "Test User"
        },
        chat: {
          id: 5173071848, // Substitua pelo seu chat ID
          type: "private"
        },
        date: Math.floor(Date.now() / 1000),
        text: "/start"
      }
    };
    
    console.log('📤 2. Enviando update para webhook local...');
    
    const webhookUrl = 'http://localhost:3025/api/telegram/webhook?token=7661233806:AAFYxUXjS2N-7l_obGBvyWBSzTuMHLPZlI0';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUpdate)
    });
    
    console.log('📋 3. Status da resposta:', response.status);
    
    const responseText = await response.text();
    console.log('📄 4. Resposta do webhook:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
    } else {
      console.log('❌ Erro no webhook:', response.status, responseText);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

testWebhookLocal(); 