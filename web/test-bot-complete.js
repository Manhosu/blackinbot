// Script para testar o sistema completo do bot
const BASE_URL = 'http://localhost:3025';

// Simular mensagem /start do usuário
const testStartCommand = async () => {
  console.log('🤖 Testando comando /start...');
  
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
        first_name: 'João',
        last_name: 'Silva',
        username: 'joaosilva',
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: '/start'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/1`, { // botId = 1
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.text();
    console.log('📋 Resposta /start:', response.status, result);
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Erro no /start:', error);
    return false;
  }
};

// Simular clique em plano
const testPlanSelection = async () => {
  console.log('💰 Testando seleção de plano...');
  
  const callbackData = {
    update_id: 123456790,
    callback_query: {
      id: 'callback123',
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'João',
        last_name: 'Silva',
        username: 'joaosilva'
      },
      message: {
        message_id: 2,
        chat: {
          id: 123456789,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000)
      },
      data: 'plan_1', // Selecionar plano ID 1
      chat_instance: 'chat123'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/1`, { // botId = 1
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackData)
    });

    const result = await response.text();
    console.log('📋 Resposta seleção plano:', response.status, result);
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Erro na seleção do plano:', error);
    return false;
  }
};

// Simular clique no QR Code
const testQRCodeRequest = async () => {
  console.log('📱 Testando solicitação de QR Code...');
  
  const callbackData = {
    update_id: 123456791,
    callback_query: {
      id: 'callback124',
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'João',
        last_name: 'Silva',
        username: 'joaosilva'
      },
      message: {
        message_id: 3,
        chat: {
          id: 123456789,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000)
      },
      data: 'qr_PAYMENT_ID_HERE', // ID do pagamento criado
      chat_instance: 'chat123'
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/1`, { // botId = 1
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackData)
    });

    const result = await response.text();
    console.log('📋 Resposta QR Code:', response.status, result);
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Erro no QR Code:', error);
    return false;
  }
};

// Testar criação de pagamento diretamente
const testPaymentCreation = async () => {
  console.log('💳 Testando criação de pagamento...');
  
  const paymentData = {
    bot_id: 1,
    plan_id: 1,
    user_telegram_id: '123456789',
    user_name: 'João Silva',
    amount: 29.90,
    description: 'Plano Básico - Grupo VIP'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();
    console.log('📋 Resposta criação pagamento:', response.status);
    console.log('📋 Dados do pagamento:', JSON.stringify(result, null, 2));
    
    return response.status === 200 && result.payment_id;
  } catch (error) {
    console.error('❌ Erro na criação do pagamento:', error);
    return false;
  }
};

// Simular webhook de pagamento aprovado
const testPaymentWebhook = async (paymentId) => {
  console.log('✅ Testando webhook de pagamento aprovado...');
  
  const webhookData = {
    event: 'payment.approved',
    data: {
      id: paymentId,
      status: 'approved',
      amount: 2990, // Em centavos
      external_reference: `bot_1_user_123456789`,
      payer: {
        email: 'joao@email.com',
        name: 'João Silva'
      },
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/pushinpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.text();
    console.log('📋 Resposta webhook pagamento:', response.status, result);
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Erro no webhook de pagamento:', error);
    return false;
  }
};

// Executar todos os testes em sequência
const runAllTests = async () => {
  console.log('🚀 Iniciando testes completos do sistema BlackinBot...\n');
  
  // Teste 1: Comando /start
  const startSuccess = await testStartCommand();
  console.log(startSuccess ? '✅ /start funcionando' : '❌ /start com erro');
  console.log('');
  
  // Teste 2: Seleção de plano
  const planSuccess = await testPlanSelection();
  console.log(planSuccess ? '✅ Seleção de plano funcionando' : '❌ Seleção de plano com erro');
  console.log('');
  
  // Teste 3: Criação de pagamento
  const paymentResult = await testPaymentCreation();
  console.log(paymentResult ? '✅ Criação de pagamento funcionando' : '❌ Criação de pagamento com erro');
  console.log('');
  
  // Teste 4: QR Code (se pagamento foi criado)
  if (paymentResult) {
    const qrSuccess = await testQRCodeRequest();
    console.log(qrSuccess ? '✅ QR Code funcionando' : '❌ QR Code com erro');
    console.log('');
    
    // Teste 5: Webhook de pagamento aprovado
    const webhookSuccess = await testPaymentWebhook(paymentResult);
    console.log(webhookSuccess ? '✅ Webhook de pagamento funcionando' : '❌ Webhook de pagamento com erro');
  }
  
  console.log('\n🏁 Testes concluídos!');
};

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testStartCommand,
  testPlanSelection,
  testQRCodeRequest,
  testPaymentCreation,
  testPaymentWebhook,
  runAllTests
}; 