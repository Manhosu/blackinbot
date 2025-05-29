// Teste simples da API PushinPay
const PUSHINPAY_BASE_URL = 'https://api.pushinpay.com.br/api/v1';
const API_KEY = '30054|WAhgfJDCfZrHGRqsdaCvYjOh4wUncQm4rhLtHszK34b10bea';

async function testPushinPay() {
  console.log('🔍 Testando API PushinPay...');
  
  try {
    // Testar endpoint de saldo
    const balanceResponse = await fetch(`${PUSHINPAY_BASE_URL}/account/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('📋 Status saldo:', balanceResponse.status);
    const balanceData = await balanceResponse.text();
    console.log('📋 Resposta saldo:', balanceData);
    
    // Testar criação de pagamento
    const paymentData = {
      amount: 990, // R$ 9,90 em centavos
      description: 'Teste de pagamento',
      external_reference: 'test-123',
      expires_in: 900,
      payment_method: 'pix'
    };
    
    const paymentResponse = await fetch(`${PUSHINPAY_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });
    
    console.log('📋 Status pagamento:', paymentResponse.status);
    const paymentResponseData = await paymentResponse.text();
    console.log('📋 Resposta pagamento:', paymentResponseData);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testPushinPay(); 