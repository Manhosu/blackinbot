// Script de teste direto usando a API local
const BASE_URL = 'http://localhost:3025';

// Testar primeiro se a API está funcionando
const testAPI = async () => {
  console.log('🔍 Testando se API está funcionando...');
  
  try {
    const response = await fetch(`${BASE_URL}`, {
      method: 'GET'
    });
    
    console.log('📋 Status da API:', response.status);
    return response.status === 200 || response.status === 404; // 404 é ok pois não temos rota raiz
  } catch (error) {
    console.error('❌ API não está acessível:', error.message);
    return false;
  }
};

// Testar webhook do bot diretamente usando fetch
const testBotWebhook = async () => {
  console.log('🤖 Testando webhook do bot...');
  
  const startMessage = {
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

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/80b495fa-ea07-4ec7-ab5a-877d2dd50501`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(startMessage)
    });

    const responseText = await response.text();
    console.log('📋 Resposta webhook bot:', response.status);
    console.log('📋 Conteúdo:', responseText);
    
    return { status: response.status, body: responseText };
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return { status: 0, error: error.message };
  }
};

// Testar criação de pagamento diretamente
const testPaymentAPI = async () => {
  console.log('💳 Testando API de pagamento...');
  
  const paymentData = {
    bot_id: '80b495fa-ea07-4ec7-ab5a-877d2dd50501',
    plan_id: '2c2ff589-317d-4595-876c-8225934c8fc2',
    user_telegram_id: '123456789',
    user_name: 'João Silva',
    amount: 29.90,
    description: 'Teste de pagamento'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const responseText = await response.text();
    console.log('📋 Status pagamento:', response.status);
    console.log('📋 Resposta:', responseText);
    
    try {
      const jsonData = JSON.parse(responseText);
      return { status: response.status, data: jsonData };
    } catch {
      return { status: response.status, text: responseText };
    }
  } catch (error) {
    console.error('❌ Erro na API de pagamento:', error);
    return { status: 0, error: error.message };
  }
};

// Executar todos os testes
const runTests = async () => {
  console.log('🚀 Iniciando testes diretos do sistema...\n');
  
  // Teste 1: API básica
  const apiOk = await testAPI();
  console.log(apiOk ? '✅ API acessível' : '❌ API não acessível');
  console.log('');
  
  if (!apiOk) {
    console.log('❌ Encerrando testes - API não está funcionando');
    return;
  }
  
  // Teste 2: Webhook do bot
  const webhookResult = await testBotWebhook();
  console.log(`📋 Webhook bot - Status: ${webhookResult.status}`);
  if (webhookResult.error) {
    console.log(`❌ Erro: ${webhookResult.error}`);
  }
  console.log('');
  
  // Teste 3: API de pagamento
  const paymentResult = await testPaymentAPI();
  console.log(`📋 API pagamento - Status: ${paymentResult.status}`);
  if (paymentResult.error) {
    console.log(`❌ Erro: ${paymentResult.error}`);
  }
  console.log('');
  
  console.log('🏁 Testes diretos concluídos!');
  
  // Resumo
  console.log('\n📊 RESUMO:');
  console.log(`• API: ${apiOk ? '✅' : '❌'}`);
  console.log(`• Webhook Bot: ${webhookResult.status === 200 ? '✅' : '❌'} (${webhookResult.status})`);
  console.log(`• API Pagamento: ${paymentResult.status === 200 ? '✅' : '❌'} (${paymentResult.status})`);
};

runTests().catch(console.error); 