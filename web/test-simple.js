const testBody = {
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 123456789,
      "is_bot": false,
      "first_name": "Teste",
      "username": "teste_user"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "date": 1620000000,
    "text": "/start"
  }
};

async function testWebhook() {
  try {
    console.log('🧪 Testando webhook...');
    
    const response = await fetch('http://localhost:3025/api/webhook/d7a8f37c-8367-482a-9df2-cc17101a5677', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBody)
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('📝 Response:', result);
    
    if (response.ok) {
      console.log('✅ Webhook funcionou!');
    } else {
      console.log('❌ Webhook falhou:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
  }
}

testWebhook(); 