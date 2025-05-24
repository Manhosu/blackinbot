const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// URLs do Supabase
const supabaseUrl = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'x-bypass-rls': 'true'
    }
  }
});

async function runMigrations() {
  try {
    console.log('📦 Iniciando migração do banco de dados...');
    
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'supabase-migration.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Executar a migração
    const { error } = await supabase.rpc('exec_sql', { query: sqlContent });
    
    if (error) {
      console.error('❌ Erro ao executar migração:', error);
      return;
    }
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar as tabelas criadas
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('❌ Erro ao listar tabelas:', tablesError);
      return;
    }
    
    console.log('📋 Tabelas disponíveis:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });
    
    // Verificar bots
    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('*');
    
    if (botsError) {
      console.error('❌ Erro ao listar bots:', botsError);
    } else {
      console.log(`📊 Total de bots: ${bots.length}`);
      if (bots.length > 0) {
        bots.forEach((bot, index) => {
          console.log(`${index + 1}. ${bot.name} (${bot.id}) - Owner: ${bot.owner_id}`);
        });
      }
    }
    
    // Verificar planos
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*');
    
    if (plansError) {
      console.error('❌ Erro ao listar planos:', plansError);
    } else {
      console.log(`📊 Total de planos: ${plans.length}`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar migrações
runMigrations().then(() => {
  console.log('🏁 Processo de migração finalizado!');
}).catch(err => {
  console.error('❌ Erro fatal:', err);
}); 