// Teste simples das APIs usando console no browser
console.log('🧪 Iniciando teste das APIs...');

// Ir para localhost:3025
if (window.location.hostname !== 'localhost' || window.location.port !== '3025') {
  console.log('⚠️ Redirecionando para localhost:3025...');
  window.location.href = 'http://localhost:3025';
} else {
  testAPIs();
}

async function testAPIs() {
  console.log('1. Testando API de bots...');
  try {
    const response = await fetch('/api/bots');
    const text = await response.text();
    console.log('Response:', text.substring(0, 200));
    
    const data = JSON.parse(text);
    console.log('✅ API de bots funcionando:', data);
  } catch (error) {
    console.log('❌ Erro na API de bots:', error);
  }
  
  console.log('\n2. Testando API PIX...');
  try {
    const response = await fetch('/api/payments/pix');
    const data = await response.json();
    console.log('✅ API PIX funcionando:', data);
  } catch (error) {
    console.log('❌ Erro na API PIX:', error);
  }
} 