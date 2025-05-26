const axios = require('axios');

// Configurações
const API_BASE = 'http://localhost:3025';
const BOT_TOKEN = '7940039994:AAGLXFQNGHasfyrjsmTSvWTjQ2c-_0Dfy2w'; // Bot de Teste

// Simular uma mensagem /start
const startMessage = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Teste",
      username: "teste_user",
      language_code: "pt-br"
    },
    chat: {
      id: 123456789,
      first_name: "Teste",
      username: "teste_user",
      type: "private"
    },
    date: Math.floor(Date.now() / 1000),
    text: "/start"
  }
};

// Simular uma mensagem de ativação em grupo
const activationMessage = {
  update_id: 123456790,
  message: {
    message_id: 2,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Teste",
      username: "teste_user",
      language_code: "pt-br"
    },
    chat: {
      id: -1001234567890, // ID de grupo (negativo)
      title: "Grupo de Teste",
      type: "supergroup"
    },
    date: Math.floor(Date.now() / 1000),
    text: "TESTE-2025"
  }
};

// Simular callback de seleção de plano
const planCallback = {
  update_id: 123456791,
  callback_query: {
    id: "callback123",
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Teste",
      username: "teste_user",
      language_code: "pt-br"
    },
    message: {
      message_id: 3,
      from: {
        id: 7940039994,
        is_bot: true,
        first_name: "Bot de Teste",
        username: "blackiin_bot"
      },
      chat: {
        id: 123456789,
        first_name: "Teste",
        username: "teste_user",
        type: "private"
      },
      date: Math.floor(Date.now() / 1000),
      text: "Escolha seu plano:"
    },
    data: "plan_1"
  }
};

async function testWebhook(testName, payload) {
  try {
    console.log(`\n🧪 Testando: ${testName}`);
    console.log(`📤 Enviando para: ${API_BASE}/api/telegram/webhook?token=${BOT_TOKEN}`);
    
    const response = await axios.post(
      `${API_BASE}/api/telegram/webhook?token=${BOT_TOKEN}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📋 Resposta:`, response.data);
    
    return true;
  } catch (error) {
    console.log(`❌ Erro no teste ${testName}:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Dados:`, error.response.data);
    } else {
      console.log(`   Erro:`, error.message);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando testes do webhook local...\n');
  
  const tests = [
    ['Comando /start', startMessage],
    ['Código de ativação em grupo', activationMessage],
    ['Callback de seleção de plano', planCallback]
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [name, payload] of tests) {
    const success = await testWebhook(name, payload);
    if (success) passed++;
    
    // Aguardar um pouco entre os testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Resultado dos testes: ${passed}/${total} passaram`);
  
  if (passed === total) {
    console.log('🎉 Todos os testes passaram! Webhook funcionando corretamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
}

// Executar os testes
runAllTests().catch(console.error); 