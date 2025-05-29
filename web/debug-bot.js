require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔧 Configuração Supabase:');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBot() {
  const botId = 'd7a8f37c-8367-482a-9df2-cc17101a5677';
  
  console.log('🔍 Debugando bot:', botId);
  
  try {
    // 1. Verificar se o bot existe
    console.log('\n1. Verificando se o bot existe...');
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();
    
    if (botError) {
      console.error('❌ Erro ao buscar bot:', botError);
      return;
    }
    
    if (!bot) {
      console.error('❌ Bot não encontrado');
      return;
    }
    
    console.log('✅ Bot encontrado:', {
      id: bot.id,
      name: bot.name,
      username: bot.username,
      is_activated: bot.is_activated,
      welcome_message: bot.welcome_message?.substring(0, 50) + '...',
      token: bot.token?.substring(0, 10) + '...'
    });
    
    // 2. Verificar planos
    console.log('\n2. Verificando planos...');
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('bot_id', botId)
      .eq('is_active', true);
    
    if (plansError) {
      console.error('❌ Erro ao buscar planos:', plansError);
      return;
    }
    
    console.log(`✅ Encontrados ${plans?.length || 0} planos ativos:`);
    plans?.forEach(plan => {
      console.log(`  - ${plan.name}: R$ ${plan.price} (${plan.period_days} dias)`);
    });
    
    // 3. Testar webhook
    console.log('\n3. Testando webhook...');
    const testUpdate = {
      update_id: 123456789,
      message: {
        message_id: 1,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: "Teste",
          username: "teste_user"
        },
        chat: {
          id: 123456789,
          type: "private"
        },
        date: Math.floor(Date.now() / 1000),
        text: "/start"
      }
    };
    
    const response = await fetch(`http://localhost:3025/api/webhook/${botId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUpdate)
    });
    
    const result = await response.json();
    console.log('📤 Resposta do webhook:', result);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugBot(); 