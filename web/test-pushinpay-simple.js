// Teste simples da API PushinPay com endpoint correto
const API_KEY = '30054|WAhgfJDCfZrHGRqsdaCvYjOh4wUncQm4rhLtHszK34b10bea';
const BASE_URL = 'https://api.pushinpay.com.br/api';

async function testPushinPayDirect() {
  console.log('🔍 Testando API PushinPay diretamente...');
  
  try {
    // Testar criação de pagamento PIX
    const paymentData = {
      value: 990, // R$ 9,90 em centavos
      webhook_url: 'http://localhost:3025/api/webhooks/pushinpay'
    };
    
    console.log('📋 Dados do pagamento:', JSON.stringify(paymentData, null, 2));
    
    const response = await fetch(`${BASE_URL}/pix/cashIn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });
    
    console.log('📋 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📋 Body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Pagamento criado com sucesso!');
        console.log('📋 QR Code:', data.qr_code || 'Não encontrado');
        console.log('📋 QR Code Base64:', data.qr_code_base64 || 'Não encontrado');
        console.log('📋 ID:', data.id || 'Não encontrado');
      } catch (e) {
        console.log('⚠️ Resposta não é JSON válido');
      }
    } else {
      console.log('❌ Erro na API:', response.status, responseText);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testPushinPayDirect(); 