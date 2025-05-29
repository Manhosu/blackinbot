// Script para testar API de pagamento diretamente
const testPaymentAPI = async () => {
  const apiUrl = 'http://localhost:3025/api/payments/create';
  
  const paymentData = {
    bot_id: '2180ae3a-b8a7-4f22-8237-6c66641b1bf8',
    plan_id: '4a2bff4e-34b0-4e31-bf67-5e4490987597',
    telegram_user_id: '987654321',
    telegram_username: 'usuario_teste',
    user_name: 'Usuario Teste',
    value_reais: 4.9
  };

  try {
    console.log('🧪 Testando API de pagamento...');
    console.log('📤 Dados:', JSON.stringify(paymentData, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();
    
    console.log('📋 Resposta da API:');
    console.log('  Status:', response.status);
    console.log('  Resultado:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Pagamento criado com sucesso!');
    } else {
      console.log('❌ Erro na criação do pagamento');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testPaymentAPI(); 