// Script para testar se o servidor está funcionando
const testSimpleAPI = async () => {
  try {
    console.log('🧪 Testando servidor...');
    
    const response = await fetch('http://localhost:3025/api/bots', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('📋 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📋 Resposta (primeiros 200 chars):', text.substring(0, 200));
    
    if (response.ok) {
      console.log('✅ Servidor funcionando!');
    } else {
      console.log('❌ Erro no servidor');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

testSimpleAPI(); 