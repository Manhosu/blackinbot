// Script de teste para verificar APIs
const BASE_URL = 'http://localhost:3025';

async function testAPIs() {
  console.log('🧪 Testando APIs do sistema...\n');

  // Teste 1: API de bots
  try {
    console.log('1. Testando API de bots...');
    const response = await fetch(`${BASE_URL}/api/bots`);
    const data = await response.json();
    console.log('✅ API de bots:', data.success ? 'OK' : 'ERRO');
    console.log(`   Bots encontrados: ${data.bots?.length || 0}`);
  } catch (error) {
    console.log('❌ API de bots: ERRO -', error.message);
  }

  // Teste 2: API de pagamentos PIX
  try {
    console.log('\n2. Testando API de pagamentos PIX...');
    const response = await fetch(`${BASE_URL}/api/payments/pix`);
    const data = await response.json();
    console.log('✅ API PIX:', data.status ? 'OK' : 'ERRO');
  } catch (error) {
    console.log('❌ API PIX: ERRO -', error.message);
  }

  // Teste 3: API de simulação
  try {
    console.log('\n3. Testando API de simulação...');
    const response = await fetch(`${BASE_URL}/api/payments/simulate`);
    const data = await response.json();
    console.log('✅ API Simulação:', data.status ? 'OK' : 'ERRO');
  } catch (error) {
    console.log('❌ API Simulação: ERRO -', error.message);
  }

  // Teste 4: Webhook Telegram
  try {
    console.log('\n4. Testando Webhook Telegram...');
    const response = await fetch(`${BASE_URL}/api/telegram/webhook`);
    const data = await response.json();
    console.log('✅ Webhook Telegram:', data.status ? 'OK' : 'ERRO');
  } catch (error) {
    console.log('❌ Webhook Telegram: ERRO -', error.message);
  }

  console.log('\n🎉 Teste das APIs concluído!');
}

// Executar testes
testAPIs().catch(console.error); 