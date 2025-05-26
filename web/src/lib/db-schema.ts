import { supabase } from '@/lib/supabase';

/**
 * Verifica se a tabela webhook_configs existe e a cria se necessário
 */
export async function ensureWebhookConfigsTable() {
  try {
    // Verificar se a tabela existe
    const { data: existingTables } = await supabase
      .from('webhook_configs')
      .select('id')
      .limit(1);
    
    if (existingTables) {
      console.log('✅ Tabela webhook_configs já existe');
      return true;
    }
  } catch (error) {
    // A tabela provavelmente não existe, vamos criá-la via SQL
    console.log('🔍 Tabela webhook_configs não encontrada, tentando criar...');
    
    const { error: createError } = await supabase.rpc('execute', {
      query: `
        CREATE TABLE IF NOT EXISTS public.webhook_configs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          token_hash TEXT NOT NULL,
          webhook_url TEXT NOT NULL,
          configured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
          status TEXT DEFAULT 'active',
          UNIQUE(token_hash)
        );
        
        -- Adicionar políticas RLS
        ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Usuários autenticados podem ler qualquer configuração de webhook"
        ON public.webhook_configs FOR SELECT
        TO authenticated
        USING (true);
        
        CREATE POLICY "Usuários autenticados podem inserir seus próprios webhooks"
        ON public.webhook_configs FOR INSERT
        TO authenticated
        WITH CHECK (bot_id IS NULL OR bot_id IN (
            SELECT id FROM public.bots WHERE owner_id = auth.uid()
        ));
        
        CREATE POLICY "Usuários autenticados podem atualizar seus próprios webhooks"
        ON public.webhook_configs FOR UPDATE
        TO authenticated
        USING (bot_id IS NULL OR bot_id IN (
            SELECT id FROM public.bots WHERE owner_id = auth.uid()
        ));
        
        CREATE POLICY "Usuários autenticados podem excluir seus próprios webhooks"
        ON public.webhook_configs FOR DELETE
        TO authenticated
        USING (bot_id IS NULL OR bot_id IN (
            SELECT id FROM public.bots WHERE owner_id = auth.uid()
        ));
      `
    });
    
    if (createError) {
      console.error('❌ Erro ao criar tabela webhook_configs:', createError);
      return false;
    }
    
    console.log('✅ Tabela webhook_configs criada com sucesso!');
    return true;
  }
  
  return false;
}

/**
 * Adiciona colunas necessárias à tabela bots se não existirem
 */
export async function ensureBotsWebhookColumns() {
  try {
    // Tentar adicionar as colunas (se já existirem, não causa erro)
    const { error } = await supabase.rpc('execute', {
      query: `
        ALTER TABLE public.bots 
        ADD COLUMN IF NOT EXISTS webhook_url TEXT,
        ADD COLUMN IF NOT EXISTS webhook_set_at TIMESTAMP WITH TIME ZONE;
      `
    });
    
    if (error) {
      console.error('❌ Erro ao adicionar colunas à tabela bots:', error);
      return false;
    }
    
    console.log('✅ Colunas webhook_url e webhook_set_at verificadas/adicionadas à tabela bots');
    return true;
  } catch (error) {
    console.error('❌ Erro ao modificar tabela bots:', error);
    return false;
  }
}

/**
 * Inicializa o banco de dados, verificando/criando tabelas e colunas necessárias
 */
export async function initDatabase() {
  console.log('🔍 Verificando estrutura do banco de dados...');
  
  const webhookTable = await ensureWebhookConfigsTable();
  const botsColumns = await ensureBotsWebhookColumns();
  
  if (webhookTable && botsColumns) {
    console.log('✅ Banco de dados verificado e estrutura completa!');
    return true;
  } else {
    console.warn('⚠️ Não foi possível verificar/criar todas as estruturas necessárias');
    return false;
  }
} 