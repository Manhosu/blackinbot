// Script para debug do webhook PushinPay
const testWebhookDebug = async () => {
  const webhookUrl = 'http://localhost:3025/api/webhooks/pushinpay';
  
  // Teste simples
  const webhookPayload = {
    event: 'payment.status_changed',
    data: {
      id: 'pushin_test_123',
      status: 'paid'
    }
  };

  try {
    console.log('🔍 Debug webhook PushinPay...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    const text = await response.text();
    console.log('📋 Resposta bruta:', text);
    
    try {
      const result = JSON.parse(text);
      console.log('📋 Resposta JSON:', result);
    } catch (e) {
      console.log('❌ Não é JSON válido');
    }
    
    console.log('📊 Status:', response.status);

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testWebhookDebug(); 