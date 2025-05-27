// Script de debug específico
const BASE_URL = 'http://localhost:3025';

const testWebhookDebug = async () => {
  console.log('🔍 Teste de debug do webhook...');
  
  const webhookData = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'João',
        last_name: 'Silva',
        username: 'joaosilva'
      },
      chat: {
        id: 123456789,
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: '/start'
    }
  };

  const botId = '80b495fa-ea07-4ec7-ab5a-877d2dd50501';
  
  try {
    console.log(`📋 Testando com bot ID: ${botId}`);
    console.log(`📋 URL: ${BASE_URL}/api/webhook/${botId}`);
    console.log(`📋 Payload:`, JSON.stringify(webhookData, null, 2));
    
    const response = await fetch(`${BASE_URL}/api/webhook/${botId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    const responseText = await response.text();
    
    console.log(`📋 Status: ${response.status}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`📋 Body: ${responseText}`);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log(`📋 JSON Parseado:`, JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      console.log(`⚠️ Resposta não é JSON válido`);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
};

const testPaymentDebug = async () => {
  console.log('\n💳 Teste de debug da API de pagamento...');
  
  const paymentData = {
    bot_id: '80b495fa-ea07-4ec7-ab5a-877d2dd50501',
    plan_id: '2c2ff589-317d-4595-876c-8225934c8fc2',
    user_telegram_id: '123456789',
    user_name: 'João Silva',
    amount: 9.90,
    description: 'Teste de pagamento debug'
  };

  try {
    console.log(`📋 Payload pagamento:`, JSON.stringify(paymentData, null, 2));
    
    const response = await fetch(`${BASE_URL}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const responseText = await response.text();
    
    console.log(`📋 Status: ${response.status}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`📋 Body: ${responseText}`);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log(`📋 JSON Parseado:`, JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      console.log(`⚠️ Resposta não é JSON válido`);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
};

const runDebug = async () => {
  await testWebhookDebug();
  await testPaymentDebug();
};

runDebug().catch(console.error); 