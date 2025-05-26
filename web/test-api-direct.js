// Script para testar API de telegram diretamente
const testDirectAPI = async () => {
  try {
    console.log('🧪 Testando API de teste...');
    
    const response = await fetch('http://localhost:3025/api/test-telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: 987654321,
        message: 'Teste direto da API local'
      })
    });

    const result = await response.json();
    
    console.log('📋 Status:', response.status);
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

testDirectAPI(); 