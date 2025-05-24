const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'x-bypass-rls': 'true'
    }
  }
});

async function testBotSearch() {
  console.log('🔍 Testando busca de bots...');
  
  try {
    // Buscar todos os bots
    const { data: allBots, error: allError } = await supabaseAdmin
      .from('bots')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Resultado da busca:');
    console.log('Total de bots:', allBots?.length || 0);
    console.log('Erro:', allError);
    
    if (allBots && allBots.length > 0) {
      console.log('\n📋 Bots encontrados:');
      allBots.forEach((bot, index) => {
        console.log(`${index + 1}. ${bot.name} (${bot.id}) - Owner: ${bot.owner_id} - Status: ${bot.status}`);
      });
    }

    // Buscar especificamente para o user_id que usamos nos testes
    const testUserId = '315cf688-6036-4c3e-b316-f821b2d326f9';
    const { data: userBots, error: userError } = await supabaseAdmin
      .from('bots')
      .select('*')
      .eq('owner_id', testUserId)
      .eq('status', 'active');

    console.log(`\n🎯 Bots do usuário ${testUserId}:`);
    console.log('Total:', userBots?.length || 0);
    console.log('Erro:', userError);
    
    if (userBots && userBots.length > 0) {
      userBots.forEach((bot, index) => {
        console.log(`${index + 1}. ${bot.name} (${bot.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testBotSearch().then(() => {
  console.log('\n✅ Teste concluído!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
}); 