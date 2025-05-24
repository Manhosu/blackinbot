import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// Cliente Supabase para componentes
const supabase = createClientComponentClient<Database>();

export interface Bot {
  id?: string;
  name: string;
  token: string;
  description?: string;
  telegram_id?: number;
  username?: string;
  webhook_url?: string;
  webhook_set_at?: string;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
  is_public?: boolean;
  status?: 'active' | 'inactive' | 'deleted';
  payment_method?: string;
}

/**
 * Cria um novo bot no Supabase
 */
export async function createBot(botData: Bot) {
  try {
    // Criar bot diretamente usando RLS (Row Level Security)
    // Isso vai usar o token JWT da sessão atual automaticamente
    const { data, error } = await supabase
      .from('bots')
      .insert({
        name: botData.name,
        token: botData.token,
        description: botData.description || '',
        telegram_id: botData.telegram_id,
        username: botData.username,
        webhook_url: botData.webhook_url,
        is_public: botData.is_public || false,
        status: botData.status || 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar bot:', error);
      throw new Error(error.message);
    }
    
    console.log('✅ Bot criado com sucesso:', data);
    return data;
  } catch (error: any) {
    console.error('Erro ao criar bot:', error);
    throw error;
  }
}

/**
 * Valida um token de bot do Telegram
 */
export async function validateBotToken(token: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Token inválido');
    }
    
    return {
      isValid: true,
      botInfo: data.result
    };
  } catch (error: any) {
    console.error('Erro ao validar token:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Busca todos os bots do usuário atual
 */
export async function getMyBots() {
  try {
    // Verificar primeiro se o usuário está autenticado
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erro ao verificar sessão:', sessionError);
      throw new Error('Erro ao verificar autenticação');
    }
    
    if (!sessionData.session) {
      console.warn('⚠️ Usuário não autenticado, buscando bots públicos');
      
      try {
        // Buscar bots públicos
        const { data: publicBots, error: publicError } = await supabase
          .from('bots')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10); // Limitar para evitar carregar muitos dados
        
        if (publicError) {
          console.error('Erro ao buscar bots:', publicError);
          return []; // Retornar array vazio em vez de propagar o erro
        }
        
        console.log(`✅ ${publicBots?.length || 0} bots públicos encontrados`);
        return publicBots || [];
      } catch (error) {
        console.error('Erro ao buscar bots para visitante:', error);
        // Retornar array vazio em vez de propagar o erro
        return [];
      }
    }
    
    // Se estiver autenticado, buscar bots do usuário (RLS filtrará automaticamente)
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar bots:', error);
      return []; // Retornar array vazio em vez de propagar o erro
    }
    
    console.log(`✅ ${data?.length || 0} bots encontrados para o usuário`);
    return data || [];
  } catch (error: any) {
    console.error('Erro ao buscar bots:', error);
    return []; // Retornar array vazio em vez de propagar o erro
  }
}

/**
 * Busca um bot específico por ID
 */
export async function getBotById(id: string) {
  try {
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar bot ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error: any) {
    console.error(`Erro ao buscar bot ${id}:`, error);
    throw error;
  }
}

/**
 * Atualiza um bot existente
 */
export async function updateBot(id: string, botData: Partial<Bot>) {
  try {
    const { data, error } = await supabase
      .from('bots')
      .update(botData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar bot ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error: any) {
    console.error(`Erro ao atualizar bot ${id}:`, error);
    throw error;
  }
}

/**
 * Salva configuração de webhook
 */
export async function saveWebhookConfig(botId: string, token: string, webhookUrl: string) {
  try {
    // Atualizar o bot com a URL do webhook
    const { data: botData, error: botError } = await supabase
      .from('bots')
      .update({
        webhook_url: webhookUrl,
        webhook_set_at: new Date().toISOString()
      })
      .eq('id', botId)
      .select()
      .single();
    
    if (botError) {
      console.error('Erro ao atualizar webhook do bot:', botError);
      throw new Error(botError.message);
    }
    
    // Salvar na tabela de configurações de webhook
    const tokenHash = btoa(token.slice(-10)); // Hash simples do token (últimos 10 caracteres)
    
    const { data: webhookData, error: webhookError } = await supabase
      .from('webhook_configs')
      .upsert({
        bot_id: botId,
        token_hash: tokenHash,
        webhook_url: webhookUrl,
        configured_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();
    
    if (webhookError) {
      console.error('Erro ao salvar configuração de webhook:', webhookError);
      throw new Error(webhookError.message);
    }
    
    return { bot: botData, webhook: webhookData };
  } catch (error: any) {
    console.error('Erro ao salvar configuração de webhook:', error);
    throw error;
  }
} 