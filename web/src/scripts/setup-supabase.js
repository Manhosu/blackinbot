/**
 * Script para configurar o banco de dados Supabase
 * 
 * Este script cria as tabelas necessárias e configura políticas de segurança
 * no Supabase para a aplicação Black-in-Bot funcionar corretamente.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// URLs do Supabase
const supabaseUrl = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U';

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Interface para ler input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar ao usuário
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// SQL para criar as tabelas
const createTableSQL = `
-- Configuração do esquema e extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de bots
CREATE TABLE IF NOT EXISTS public.bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    description TEXT,
    token VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    welcome_message TEXT,
    avatar_url TEXT,
    welcome_media_url TEXT,
    telegram_group_link TEXT,
    plan_name VARCHAR(255),
    plan_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    plan_period VARCHAR(50) DEFAULT '30',
    plan_days_access INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    totalRevenue DECIMAL(10, 2) DEFAULT 0,
    totalSales INTEGER DEFAULT 0
);

-- Tabela de planos
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    days_access INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sales INTEGER DEFAULT 0
);

-- Tabela de grupos
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    telegram_id VARCHAR(255),
    invite_link TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    member_count INTEGER DEFAULT 0
);

-- Tabela de assinantes
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    user_id UUID,
    telegram_user_id VARCHAR(255),
    telegram_username VARCHAR(255),
    telegram_first_name VARCHAR(255),
    telegram_last_name VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    subscription_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

// SQL para configurar políticas RLS
const configurePoliciesSQL = `
-- Políticas RLS para permitir acesso aos proprietários dos bots
-- Habilitar RLS nas tabelas
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Política para bots
CREATE POLICY "Proprietários podem acessar seus próprios bots" 
ON public.bots FOR ALL 
USING (owner_id = auth.uid());

-- Política para planos
CREATE POLICY "Proprietários podem acessar planos dos seus bots" 
ON public.plans FOR ALL 
USING (
    bot_id IN (
        SELECT id FROM public.bots 
        WHERE owner_id = auth.uid()
    )
);

-- Política para grupos
CREATE POLICY "Proprietários podem acessar grupos dos seus bots" 
ON public.groups FOR ALL 
USING (
    bot_id IN (
        SELECT id FROM public.bots 
        WHERE owner_id = auth.uid()
    )
);

-- Política para assinantes
CREATE POLICY "Proprietários podem acessar assinantes dos seus bots" 
ON public.subscribers FOR ALL 
USING (
    bot_id IN (
        SELECT id FROM public.bots 
        WHERE owner_id = auth.uid()
    )
);
`;

// SQL para criar índices e triggers
const optimizationSQL = `
-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON public.bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_plans_bot_id ON public.plans(bot_id);
CREATE INDEX IF NOT EXISTS idx_groups_bot_id ON public.groups(bot_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_bot_id ON public.subscribers(bot_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_plan_id ON public.subscribers(plan_id);

-- Função para atualizar o timestamp de 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar o timestamp de 'updated_at'
CREATE TRIGGER update_bots_updated_at
BEFORE UPDATE ON public.bots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
`;

// Função para migrar do localStorage para o Supabase
async function migrateFromLocalStorage() {
  try {
    console.log('\n🔄 Migração de dados do localStorage para o Supabase');
    
    const jsonInput = await ask('📝 Cole o JSON do localStorage (demo_bots) ou deixe em branco para pular: ');
    
    if (!jsonInput.trim()) {
      console.log('⏩ Migração pulada');
      return;
    }
    
    let localBots;
    try {
      localBots = JSON.parse(jsonInput);
    } catch (e) {
      console.error('❌ JSON inválido:', e);
      return;
    }
    
    if (!Array.isArray(localBots) || localBots.length === 0) {
      console.log('⚠️ Nenhum bot encontrado no JSON fornecido');
      return;
    }
    
    console.log(`📊 Encontrados ${localBots.length} bots para migrar`);
    
    // Obter usuário para owner_id
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('⚠️ Usuário não autenticado. Criando um ID anônimo para os bots...');
    }
    
    const ownerId = user?.id || 'anon_' + Date.now();
    
    // Migrar cada bot
    for (const bot of localBots) {
      console.log(`🤖 Migrando bot: ${bot.name}`);
      
      // Inserir bot
      const { data: insertedBot, error: botError } = await supabase
        .from('bots')
        .upsert({
          id: bot.id,
          name: bot.name,
          username: bot.username || bot.name.toLowerCase().replace(/\s+/g, '_') + '_bot',
          description: bot.description || '',
          token: bot.token || 'invalid_token',
          owner_id: ownerId,
          welcome_message: bot.welcome_message || 'Bem-vindo!',
          plan_name: bot.plan_name || 'Plano Básico',
          plan_price: parseFloat(bot.plan_price) || 0,
          plan_days_access: parseInt(bot.plan_days_access) || 30,
          status: bot.status || 'active',
          created_at: bot.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (botError) {
        console.error(`❌ Erro ao inserir bot ${bot.name}:`, botError);
        continue;
      }
      
      console.log(`✅ Bot ${bot.name} inserido com ID: ${insertedBot.id}`);
      
      // Migrar plano principal
      if (bot.plan_name) {
        const { data: mainPlan, error: mainPlanError } = await supabase
          .from('plans')
          .upsert({
            bot_id: insertedBot.id,
            name: bot.plan_name,
            price: parseFloat(bot.plan_price) || 0,
            days_access: parseInt(bot.plan_days_access) || 30,
            is_active: true,
            created_at: bot.created_at || new Date().toISOString()
          })
          .select();
        
        if (mainPlanError) {
          console.error(`❌ Erro ao inserir plano principal para ${bot.name}:`, mainPlanError);
        } else {
          console.log(`✅ Plano principal ${bot.plan_name} inserido`);
        }
      }
      
      // Migrar planos adicionais
      if (bot.additional_plans && bot.additional_plans.length > 0) {
        for (const plan of bot.additional_plans) {
          const { data: additionalPlan, error: planError } = await supabase
            .from('plans')
            .upsert({
              bot_id: insertedBot.id,
              name: plan.name,
              price: parseFloat(plan.price) || 0,
              days_access: parseInt(plan.days_access) || 30,
              is_active: plan.is_active !== undefined ? plan.is_active : true,
              created_at: plan.created_at || new Date().toISOString()
            })
            .select();
          
          if (planError) {
            console.error(`❌ Erro ao inserir plano ${plan.name}:`, planError);
          } else {
            console.log(`✅ Plano adicional ${plan.name} inserido`);
          }
        }
      }
    }
    
    console.log('🎉 Migração de bots concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

// Função principal
async function main() {
  try {
    console.log('🚀 Iniciando configuração do Supabase para o Black-in-Bot');
    
    const action = await ask('\n📋 Escolha uma ação:\n1. Criar tabelas\n2. Configurar políticas\n3. Criar índices e triggers\n4. Migrar dados do localStorage\n5. Executar tudo\nEscolha (1-5): ');
    
    switch (action.trim()) {
      case '1':
        console.log('\n📦 Criando tabelas...');
        const { error: tablesError } = await supabase.rpc('exec_sql', { query: createTableSQL });
        if (tablesError) {
          console.error('❌ Erro ao criar tabelas:', tablesError);
        } else {
          console.log('✅ Tabelas criadas com sucesso!');
        }
        break;
        
      case '2':
        console.log('\n🔒 Configurando políticas de segurança...');
        const { error: policiesError } = await supabase.rpc('exec_sql', { query: configurePoliciesSQL });
        if (policiesError) {
          console.error('❌ Erro ao configurar políticas:', policiesError);
        } else {
          console.log('✅ Políticas configuradas com sucesso!');
        }
        break;
        
      case '3':
        console.log('\n⚡ Criando índices e triggers...');
        const { error: optimizationError } = await supabase.rpc('exec_sql', { query: optimizationSQL });
        if (optimizationError) {
          console.error('❌ Erro ao criar índices e triggers:', optimizationError);
        } else {
          console.log('✅ Índices e triggers criados com sucesso!');
        }
        break;
        
      case '4':
        await migrateFromLocalStorage();
        break;
        
      case '5':
        console.log('\n📦 Criando tabelas...');
        const { error: allTablesError } = await supabase.rpc('exec_sql', { query: createTableSQL });
        if (allTablesError) {
          console.error('❌ Erro ao criar tabelas:', allTablesError);
        } else {
          console.log('✅ Tabelas criadas com sucesso!');
        }
        
        console.log('\n🔒 Configurando políticas de segurança...');
        const { error: allPoliciesError } = await supabase.rpc('exec_sql', { query: configurePoliciesSQL });
        if (allPoliciesError) {
          console.error('❌ Erro ao configurar políticas:', allPoliciesError);
        } else {
          console.log('✅ Políticas configuradas com sucesso!');
        }
        
        console.log('\n⚡ Criando índices e triggers...');
        const { error: allOptimizationError } = await supabase.rpc('exec_sql', { query: optimizationSQL });
        if (allOptimizationError) {
          console.error('❌ Erro ao criar índices e triggers:', allOptimizationError);
        } else {
          console.log('✅ Índices e triggers criados com sucesso!');
        }
        
        await migrateFromLocalStorage();
        break;
        
      default:
        console.log('⚠️ Opção inválida!');
    }
    
    // Verificar tabelas criadas
    const { data: tables, error: tablesListError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesListError) {
      console.error('❌ Erro ao listar tabelas:', tablesListError);
    } else {
      console.log('\n📋 Tabelas disponíveis no banco de dados:');
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.tablename}`);
      });
    }
    
    console.log('\n🏁 Configuração finalizada!');
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    rl.close();
  }
}

// Executar script
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  rl.close();
}); 