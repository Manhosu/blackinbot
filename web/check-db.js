const { createClient } = require('@supabase/supabase-js');

// Carregar env manualmente
const fs = require('fs');
const path = require('path');

// Ler .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  let currentKey = null;
  let currentValue = '';
  
  lines.forEach(line => {
    line = line.trim();
    
    // Ignorar comentários e linhas vazias
    if (!line || line.startsWith('#')) {
      return;
    }
    
    // Nova variável
    if (line.includes('=')) {
      // Salvar a variável anterior se existir
      if (currentKey && currentValue) {
        process.env[currentKey] = currentValue;
      }
      
      const [key, ...valueParts] = line.split('=');
      currentKey = key.trim();
      currentValue = valueParts.join('=').trim();
    } else {
      // Continuação de valor em múltiplas linhas
      currentValue += line;
    }
  });
  
  // Salvar a última variável
  if (currentKey && currentValue) {
    process.env[currentKey] = currentValue;
  }
}

console.log('🔍 SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING');
console.log('🔍 SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndCreateBot() {
  console.log('🔍 Verificando bots no banco de dados...');
  
  // Verificar bots existentes
  const { data: bots, error: botError } = await supabase
    .from('telegram_bots')
    .select('*');
    
  if (botError) {
    console.error('❌ Erro ao buscar bots:', botError);
    return;
  }
  
  console.log('📋 Bots encontrados:', bots?.length || 0);
  
  if (!bots || bots.length === 0) {
    console.log('🤖 Criando bot de teste...');
    
    const { data: newBot, error: createError } = await supabase
      .from('telegram_bots')
      .insert({
        id: 1,
        token: process.env.TELEGRAM_BOT_TOKEN,
        username: 'blackinbot',
        welcome_message: '🎉 *Bem-vindo ao BlackinBot!*\n\nEscolha um de nossos planos exclusivos:',
        is_active: true,
        group_id: '-1001234567890', // ID fictício do grupo
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (createError) {
      console.error('❌ Erro ao criar bot:', createError);
    } else {
      console.log('✅ Bot criado:', newBot);
    }
  } else {
    console.log('✅ Bot já existe:', bots[0]);
  }
}

async function checkAndCreatePlans() {
  console.log('🔍 Verificando planos no banco de dados...');
  
  // Verificar planos existentes
  const { data: plans, error: planError } = await supabase
    .from('plans')
    .select('*');
    
  if (planError) {
    console.error('❌ Erro ao buscar planos:', planError);
    return;
  }
  
  console.log('📋 Planos encontrados:', plans?.length || 0);
  
  if (!plans || plans.length === 0) {
    console.log('💰 Criando planos de teste...');
    
    const testPlans = [
      {
        id: 1,
        bot_id: 1,
        name: 'Plano Básico',
        description: 'Acesso ao grupo VIP com sinais básicos',
        price: 29.90,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        bot_id: 1,
        name: 'Plano Premium',
        description: 'Acesso completo + suporte prioritário',
        price: 59.90,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        bot_id: 1,
        name: 'Plano VIP',
        description: 'Todos os benefícios + sinais exclusivos',
        price: 99.90,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
    
    const { data: newPlans, error: createError } = await supabase
      .from('plans')
      .insert(testPlans)
      .select();
      
    if (createError) {
      console.error('❌ Erro ao criar planos:', createError);
    } else {
      console.log('✅ Planos criados:', newPlans);
    }
  } else {
    console.log('✅ Planos já existem:', plans);
  }
}

async function checkTables() {
  console.log('🔍 Verificando estrutura das tabelas...');
  
  const tables = [
    'telegram_bots',
    'plans', 
    'payments',
    'group_members',
    'sales'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
      
    if (error) {
      console.error(`❌ Erro na tabela ${table}:`, error.message);
    } else {
      console.log(`✅ Tabela ${table} funcionando`);
    }
  }
}

async function main() {
  console.log('🚀 Verificando configuração do banco de dados...\n');
  
  await checkTables();
  console.log('');
  
  await checkAndCreateBot();
  console.log('');
  
  await checkAndCreatePlans();
  console.log('');
  
  console.log('🏁 Verificação concluída!');
}

main().catch(console.error); 