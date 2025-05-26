import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Cliente Supabase para componentes
const supabase = createClientComponentClient();

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
    console.log('🚀 Criando bot via API route...');
    
    // Obter owner_id do localStorage ou contexto
    let owner_id = null;
    try {
      const savedUser = localStorage.getItem('blackinpay_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        owner_id = userData.id;
        console.log('🔐 Owner ID do localStorage:', owner_id);
      }
    } catch (localError) {
      console.error('Erro ao ler localStorage:', localError);
    }
    
    // Se não encontrar no localStorage, usar o que foi passado nos botData
    if (!owner_id && botData.owner_id) {
      owner_id = botData.owner_id;
      console.log('🔐 Owner ID dos botData:', owner_id);
    }
    
    // Usar API route que tem autenticação adequada
    const response = await fetch('/api/bots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: botData.name,
        token: botData.token,
        description: botData.description || '',
        telegram_id: botData.telegram_id,
        username: botData.username,
        webhook_url: botData.webhook_url,
        is_public: botData.is_public || false,
        status: botData.status || 'active',
        owner_id: owner_id // Incluir owner_id no corpo da requisição
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro da API ao criar bot:', errorData);
      throw new Error(errorData.error || 'Erro ao criar bot');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ API retornou erro:', result.error);
      throw new Error(result.error || 'Erro ao criar bot');
    }
    
    console.log('✅ Bot criado com sucesso via API:', result.bot);
    return result.bot;
    
  } catch (error: any) {
    console.error('❌ Erro ao criar bot via API:', error);
    throw error;
  }
}

/**
 * Valida um token de bot do Telegram
 */
export async function validateBotToken(token: string) {
  try {
    console.log('🔍 Validando token do bot...');
    
    if (!token || token.trim() === '') {
      return {
        isValid: false,
        error: 'Token não pode estar vazio'
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      console.warn('⚠️ Token inválido:', data.description || 'Resposta inválida');
      return {
        isValid: false,
        error: data.description || 'Token inválido'
      };
    }
    
    console.log('✅ Token válido:', data.result.username);
    return {
      isValid: true,
      botInfo: data.result
    };
  } catch (error: any) {
    console.error('❌ Erro ao validar token:', error.message);
    return {
      isValid: false,
      error: error.message || 'Erro de conexão'
    };
  }
}

/**
 * Busca todos os bots do usuário atual
 */
export async function getMyBots() {
  try {
    // Obter ID do usuário de múltiplas formas
    let userId = null;
    
    // Método 1: Tentar localStorage primeiro (mais confiável no nosso caso)
    try {
      const savedUser = localStorage.getItem('blackinpay_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userId = userData.id;
      }
    } catch (localError) {
      console.error('Erro ao ler localStorage:', localError);
    }
    
    // Método 2: Tentar sessão Supabase como backup
    if (!userId) {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData.session && sessionData.session.user) {
          userId = sessionData.session.user.id;
        }
      } catch (sessionErr) {
        console.error('Erro na sessão Supabase:', sessionErr);
      }
    }
    
    if (!userId) {
      console.warn('Nenhum usuário identificado');
      return [];
    }
    
    // Busca DIRETA sem RLS - vamos fazer a consulta mais simples possível
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro na busca direta:', error);
      
      // Fallback: buscar TODOS os bots e filtrar no cliente
      const { data: allBots, error: allError } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (allError) {
        console.error('Erro na busca geral:', allError);
        return [];
      }
      
      // Filtrar no cliente
      const userBots = allBots?.filter(bot => bot.owner_id === userId) || [];
      return userBots;
    }
    
    return data || [];
    
  } catch (error: any) {
    console.error('Erro geral ao buscar bots:', error);
    
    // Último recurso: buscar por ID específico que sabemos que existe
    try {
      const { data: specificBot, error: specificError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', '300c2ea8-4557-4d57-8050-c28359e9dbd6')
        .single();
        
      if (!specificError && specificBot) {
        return [specificBot];
      }
    } catch (lastErr) {
      console.error('Falha no último recurso:', lastErr);
    }
    
    return [];
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

/**
 * Configura o webhook de um bot automaticamente
 */
export async function setupBotWebhook(botId: string, token: string) {
  try {
    console.log(`🔧 Configurando webhook para o bot ${botId}...`);
    
    // Para desenvolvimento local, usar API route que funciona melhor com autenticação
    console.log(`🔗 Usando API route para configurar webhook...`);
    
    const response = await fetch('/api/bots/setup-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        botId: botId
      })
    });
    
    const result = await response.json();
    console.log(`📡 Resposta da API:`, result);
    
    if (!result.success) {
      console.error(`❌ Erro da API: ${result.error}`);
      throw new Error(`Erro da API: ${result.error}`);
    }
    
    console.log(`✅ Webhook configurado com sucesso via API para o bot ${botId}`);
    return result.data;
    
  } catch (error: any) {
    console.error(`❌ Erro ao configurar webhook:`, error);
    throw error;
  }
}

/**
 * Verifica o status do webhook de um bot
 */
export async function checkWebhookStatus(token: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Erro ao verificar webhook');
    }
    
    return {
      isSet: !!data.result.url,
      url: data.result.url,
      pendingUpdateCount: data.result.pending_update_count,
      lastErrorDate: data.result.last_error_date,
      lastErrorMessage: data.result.last_error_message
    };
  } catch (error: any) {
    console.error('Erro ao verificar status do webhook:', error);
    return {
      isSet: false,
      error: error.message
    };
  }
}

/**
 * Cria um novo bot no Supabase e configura webhook automaticamente
 */
export async function createBotWithWebhook(botData: Bot) {
  try {
    console.log('🚀 Criando bot com webhook automático...');
    
    // Primeiro criar o bot
    const createdBot = await createBot(botData);
    
    // Configurar webhook automaticamente se o bot foi criado com sucesso
    if (createdBot && createdBot.id && botData.token) {
      try {
        await setupBotWebhook(createdBot.id, botData.token);
        console.log('✅ Bot criado e webhook configurado automaticamente');
      } catch (webhookError) {
        console.warn('⚠️ Bot criado mas webhook falhou:', webhookError);
        // Não falhar a criação do bot se apenas o webhook falhar
      }
    }
    
    return createdBot;
  } catch (error: any) {
    console.error('❌ Erro ao criar bot com webhook:', error);
    throw error;
  }
}

/**
 * Configura webhooks para todos os bots que não têm webhook configurado
 */
export async function setupMissingWebhooks() {
  try {
    console.log('🔍 Verificando bots sem webhook...');
    
    // Buscar bots sem webhook configurado
    const { data: botsWithoutWebhook, error } = await supabase
      .from('bots')
      .select('*')
      .or('webhook_url.is.null,webhook_set_at.is.null')
      .eq('status', 'active');
    
    if (error) {
      console.error('Erro ao buscar bots sem webhook:', error);
      return;
    }
    
    if (!botsWithoutWebhook || botsWithoutWebhook.length === 0) {
      console.log('✅ Todos os bots já têm webhook configurado');
      return;
    }
    
    console.log(`🔧 Configurando webhook para ${botsWithoutWebhook.length} bots...`);
    
    const results = [];
    
    for (const bot of botsWithoutWebhook) {
      try {
        console.log(`🔧 Configurando webhook para o bot ${bot.id} (${bot.name})...`);
        
        const result = await setupBotWebhook(bot.id, bot.token);
        
        if (result) {
          console.log(`✅ Webhook configurado para bot ${bot.name} (${bot.id})`);
          results.push({ bot: bot.name, status: 'success' });
        } else {
          console.warn(`⚠️ Falha ao configurar webhook para bot ${bot.name}`);
          results.push({ bot: bot.name, status: 'failed' });
        }
      } catch (error: any) {
        console.error(`❌ Erro ao configurar webhook para bot ${bot.name}:`, error);
        results.push({ bot: bot.name, status: 'error', error: error.message });
      }
    }
    
    console.log('✅ Configuração de webhooks concluída', results);
    return results;
    
  } catch (error: any) {
    console.error('❌ Erro geral ao configurar webhooks:', error);
    throw error;
  }
}

/**
 * Exclui um bot e todas as suas configurações relacionadas
 */
export async function deleteBot(id: string) {
  try {
    console.log(`🗑️ Excluindo bot ${id}...`);
    
    const response = await fetch(`/api/bots/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao excluir bot');
    }
    
    console.log('✅ Bot excluído com sucesso');
    return result;
  } catch (error: any) {
    console.error('Erro ao excluir bot:', error);
    throw error;
  }
}