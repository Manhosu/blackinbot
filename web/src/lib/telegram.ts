import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com validação
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
  }
  
  return createClient(url, key);
}

// Função para criar cliente Supabase administrativo
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      first_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    message?: any;
    data?: string;
  };
}

interface BotConfig {
  id: string;
  name: string;
  token: string;
  username?: string;
  welcome_text?: string;
  welcome_message?: string;
  welcome_media_url?: string;
  welcome_media_type?: 'photo' | 'video';
  is_activated?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  callback_data: string;
}

// Cache dos bots para evitar múltiplas consultas
const botCache = new Map<string, BotConfig>();
const planCache = new Map<string, Plan[]>();

async function getBotByIdFromCache(botId: string): Promise<BotConfig | null> {
  // Verificar cache primeiro
  if (botCache.has(botId)) {
    return botCache.get(botId)!;
  }

  try {
    const supabase = createSupabaseClient();
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, token, username, welcome_text, welcome_media_url, welcome_media_type, is_activated, welcome_message')
      .eq('id', botId)
      .single();

    if (error || !bot) {
      console.error(`❌ Bot ${botId} não encontrado:`, error);
      return null;
    }

    // Adicionar ao cache
    botCache.set(botId, bot);
    return bot;
  } catch (error) {
    console.error(`❌ Erro ao buscar bot ${botId}:`, error);
    return null;
  }
}

async function getPlansFromCache(botId: string): Promise<Plan[]> {
  // Verificar cache primeiro
  if (planCache.has(botId)) {
    return planCache.get(botId)!;
  }

  try {
    const supabase = createSupabaseClient();
    const { data: plans, error } = await supabase
      .from('plans')
      .select('id, name, price')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error(`❌ Erro ao buscar planos:`, error);
      return [];
    }

    // Formatar planos com callback_data
    const formattedPlans = (plans || []).map(plan => ({
      ...plan,
      callback_data: `plan_${plan.id}`
    }));

    // Adicionar ao cache
    planCache.set(botId, formattedPlans);
    return formattedPlans;
  } catch (error) {
    console.error(`❌ Erro ao buscar planos:`, error);
    return [];
  }
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    throw error;
  }
}

async function sendTelegramPhoto(botToken: string, chatId: number, photo: string, caption?: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
  const payload = {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: 'Markdown',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao enviar foto:', error);
    throw error;
  }
}

async function sendTelegramVideo(botToken: string, chatId: number, video: string, caption?: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendVideo`;
  
  const payload = {
    chat_id: chatId,
    video,
    caption,
    parse_mode: 'Markdown',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao enviar vídeo:', error);
    throw error;
  }
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  
  const payload = {
    callback_query_id: callbackQueryId,
    text
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao responder callback:', error);
    throw error;
  }
}

async function editMessageCaption(botToken: string, chatId: number, messageId: number, caption: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/editMessageCaption`;
  
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: 'Markdown',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao editar caption:', error);
    throw error;
  }
}

async function handleStartCommand(botConfig: BotConfig, update: TelegramUpdate) {
  const message = update.message!;
  const chatId = message.chat.id;
  const userId = message.from.id;

  console.log(`🔄 /start recebido de usuário ${userId} para bot ${botConfig.name}`);

  try {
    // Buscar planos
    const plans = await getPlansFromCache(botConfig.id);
    
    // Criar teclado inline com os planos
    const keyboard = plans.map(plan => [{
      text: `${plan.name} - R$ ${plan.price.toFixed(2)}`,
      callback_data: plan.callback_data
    }]);

    // Texto de boas-vindas personalizado
    const welcomeText = botConfig.welcome_message || botConfig.welcome_text || 
      `🤖 *Olá! Bem-vindo ao ${botConfig.name}!*\n\n` +
      `Escolha um dos nossos planos abaixo:`;

    const replyMarkup = {
      inline_keyboard: keyboard
    };

    // Enviar mídia com mensagem de boas-vindas
    if (botConfig.welcome_media_url) {
      if (botConfig.welcome_media_type === 'video') {
        await sendTelegramVideo(
          botConfig.token, 
          chatId, 
          botConfig.welcome_media_url, 
          welcomeText,
          { reply_markup: replyMarkup }
        );
      } else {
        await sendTelegramPhoto(
          botConfig.token, 
          chatId, 
          botConfig.welcome_media_url, 
          welcomeText,
          { reply_markup: replyMarkup }
        );
      }
    } else {
      // Enviar apenas texto se não houver mídia
      await sendTelegramMessage(
        botConfig.token, 
        chatId, 
        welcomeText,
        { reply_markup: replyMarkup }
      );
    }

    console.log(`✅ Mensagem de boas-vindas enviada para usuário ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao processar /start para bot ${botConfig.name}:`, error);
    
    // Enviar mensagem de erro
    await sendTelegramMessage(
      botConfig.token,
      chatId,
      "❌ Ocorreu um erro. Tente novamente mais tarde."
    );
  }
}

async function handleCallbackQuery(botConfig: BotConfig, update: TelegramUpdate) {
  const callbackQuery = update.callback_query!;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data!;

  console.log(`💎 Callback recebido: ${data} de usuário ${userId}`);

  try {
    // Responder ao callback
    await answerCallbackQuery(botConfig.token, callbackQuery.id);

    // Verificar se é seleção de plano
    if (data.startsWith('plan_')) {
      const planId = data.replace('plan_', '');
      const plans = await getPlansFromCache(botConfig.id);
      const selectedPlan = plans.find(p => p.id === planId);

      if (selectedPlan) {
        const confirmationText = 
          `✅ *Plano selecionado:*\n\n` +
          `📋 ${selectedPlan.name}\n` +
          `💰 R$ ${selectedPlan.price.toFixed(2)}\n\n` +
          `Em breve você receberá instruções para pagamento.`;

        // Editar a mensagem original
        if (callbackQuery.message) {
          await editMessageCaption(
            botConfig.token,
            callbackQuery.message.chat.id,
            callbackQuery.message.message_id,
            confirmationText
          );
        }

        console.log(`✅ Plano ${selectedPlan.name} selecionado por usuário ${userId}`);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao processar callback para bot ${botConfig.name}:`, error);
  }
}

async function handleGroupMessage(botConfig: BotConfig, update: TelegramUpdate) {
  const message = update.message!;
  const text = message.text?.trim() || '';
  const userId = message.from.id;
  const chatId = message.chat.id;

  console.log(`📱 Mensagem no grupo: '${text}' de ${userId} no chat ${chatId}`);

  // Verificar se é um código de ativação (formato XXXX-XXXX)
  const activationCodePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  if (activationCodePattern.test(text)) {
    console.log(`🔍 Possível código de ativação detectado: ${text}`);
    console.log(`🔍 Bot ID: ${botConfig.id}`);
    
    try {
      const supabase = createSupabaseAdminClient();
      console.log(`🔍 Cliente administrativo criado com sucesso`);
      
      // Buscar código no banco
      console.log(`🔍 Buscando código: ${text.toUpperCase()} para bot: ${botConfig.id}`);
      const { data: code, error } = await supabase
        .from('bot_activation_codes')
        .select('*')
        .eq('activation_code', text.toUpperCase())
        .eq('bot_id', botConfig.id)
        .single();

      console.log(`🔍 Resultado da busca:`, { code, error });

      if (error || !code) {
        console.log(`⚠️ Código não encontrado: ${text}`, error);
        return;
      }

      // Verificar se não expirou
      const now = new Date();
      const expiresAt = new Date(code.expires_at);
      
      if (now > expiresAt) {
        console.log(`⚠️ Código expirado: ${text}`);
        await sendTelegramMessage(
          botConfig.token,
          chatId,
          `❌ Código \`${text}\` expirado.`
        );
        return;
      }

      // Ativar o bot
      const { error: botUpdateError } = await supabase
        .from('bots')
        .update({ 
          is_activated: true,
          activated_at: new Date().toISOString(),
          activated_by_user_id: userId,
          activated_in_chat_id: chatId
        })
        .eq('id', botConfig.id);

      if (botUpdateError) {
        console.error('❌ Erro ao ativar bot:', botUpdateError);
        throw new Error('Erro ao ativar bot');
      }

      // Marcar código como usado
      const { error: codeUpdateError } = await supabase
        .from('bot_activation_codes')
        .update({ 
          used_at: new Date().toISOString(),
          used_by_telegram_id: userId.toString()
        })
        .eq('id', code.id);

      if (codeUpdateError) {
        console.error('❌ Erro ao marcar código como usado:', codeUpdateError);
        throw new Error('Erro ao marcar código como usado');
      }

      await sendTelegramMessage(
        botConfig.token,
        chatId,
        `✅ Bot '${botConfig.name}' ativado com sucesso!`
      );

      console.log(`✅ Bot ${botConfig.name} ativado com código ${text}`);
    } catch (error) {
      console.error(`❌ Erro ao processar código de ativação:`, error);
    }
  } else {
    console.log(`⚠️ Não é código de ativação: ${text}`);
  }
}

export async function getBotHandler(botId: string) {
  return async function(request: NextRequest): Promise<NextResponse> {
    try {
      console.log(`🔄 Update recebido para bot ID: ${botId}`);

      // Buscar configuração do bot
      const botConfig = await getBotByIdFromCache(botId);
      if (!botConfig) {
        console.error(`❌ Bot ${botId} não encontrado`);
        return NextResponse.json({ success: false, error: 'Bot não encontrado' }, { status: 404 });
      }

      console.log(`✅ Bot encontrado: ${botConfig.name}`);

      // Processar update do Telegram
      const update: TelegramUpdate = await request.json();

      if (update.message) {
        const message = update.message;
        
        // Comando /start
        if (message.text === '/start' && message.chat.type === 'private') {
          await handleStartCommand(botConfig, update);
        }
        // Mensagem em grupo
        else if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
          await handleGroupMessage(botConfig, update);
        }
      }
      // Callback query (clique em botão)
      else if (update.callback_query) {
        await handleCallbackQuery(botConfig, update);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }, { status: 500 });
    }
  };
} 