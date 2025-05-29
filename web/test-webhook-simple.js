require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Teste simples do webhook
async function testWebhook() {
  try {
    console.log('🧪 Testando configuração do Supabase...');
    
    // Testar variáveis de ambiente
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('URL:', url ? 'OK' : 'MISSING');
    console.log('Key:', key ? 'OK' : 'MISSING');
    
    if (!url || !key) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return;
    }
    
    // Criar cliente
    const supabase = createClient(url, key);
    
    // Testar busca do bot
    const botId = 'd7a8f37c-8367-482a-9df2-cc17101a5677';
    console.log(`🔍 Buscando bot ${botId}...`);
    
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, token, is_activated')
      .eq('id', botId)
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar bot:', error);
      return;
    }
    
    console.log('✅ Bot encontrado:', bot.name);
    console.log('   Ativado:', bot.is_activated);
    
    // Testar busca de planos
    const { data: plans, error: planError } = await supabase
      .from('plans')
      .select('id, name, price')
      .eq('bot_id', botId)
      .eq('is_active', true);
    
    if (planError) {
      console.error('❌ Erro ao buscar planos:', planError);
      return;
    }
    
    console.log(`✅ Encontrados ${plans?.length || 0} planos`);
    plans?.forEach(plan => {
      console.log(`   - ${plan.name}: R$ ${plan.price}`);
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testWebhook(); 