// Script para testar webhook do PushinPay
const testPushinPayWebhook = async () => {
  const webhookUrl = 'https://blackinbot.vercel.app/api/webhooks/pushinpay';
  
  // Simular webhook de pagamento aprovado
  const webhookPayload = {
    event: 'payment.status_changed',
    data: {
      id: 'pushin_test_123',
      status: 'paid',
      amount: 490, // 4.90 em centavos
      external_reference: 'payment_test_987654321',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  try {
    console.log('🧪 Testando webhook PushinPay...');
    console.log('📤 Payload:', JSON.stringify(webhookPayload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pushinpay-Signature': 'test_signature' // Em produção seria real
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();
    
    console.log('📋 Resposta do webhook:');
    console.log('  Status:', response.status);
    console.log('  Resultado:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook PushinPay processado com sucesso!');
    } else {
      console.log('❌ Erro no webhook PushinPay');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testPushinPayWebhook(); 