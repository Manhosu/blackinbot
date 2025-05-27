import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com Service Role Key
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, serviceKey);
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
    };
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    data: string;
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
  };
}

interface BotConfig {
  id: string;
  name: string;
  token: string;
  username: string;
  is_activated: boolean;
  welcome_message: string;
  welcome_media_url?: string;
  welcome_media_type?: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    })
  });
  
  return response.json();
}

async function sendTelegramPhoto(botToken: string, chatId: number, photo: string, caption: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photo,
      caption: caption,
      parse_mode: 'Markdown',
      ...options
    })
  });
  
  return response.json();
}

async function sendTelegramVideo(botToken: string, chatId: number, video: string, caption: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendVideo`;
  
  const response = await fetch(url, {
        method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
        body: JSON.stringify({
          chat_id: chatId,
      video: video,
      caption: caption,
      parse_mode: 'Markdown',
      ...options
        })
      });
      
  return response.json();
}

async function editTelegramMessage(botToken: string, chatId: number, messageId: number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
            chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    })
  });
  
  return response.json();
}

async function getBotByToken(token: string): Promise<BotConfig | null> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('bots')
      .select('id, name, token, username, is_activated, welcome_message, welcome_media_url, welcome_media_type')
      .eq('token', token)
      .single();
    
    if (error || !data) {
      console.error('❌ Bot não encontrado:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar bot:', error);
  return null;
  }
}

async function getBotPlans(botId: string): Promise<Plan[]> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, description, price')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar planos:', error);
    return [];
  }
}

async function activateBotWithCode(code: string, userId: number, chatId: number, botToken: string) {
  try {
    // Buscar bot
    const bot = await getBotByToken(botToken);
    if (!bot) {
      return { success: false, error: 'Bot não encontrado' };
    }

    const supabase = createSupabaseAdmin();

    // Buscar código de ativação
    const { data: codeData, error: codeError } = await supabase
      .from('bot_activation_codes')
      .select('id, bot_id, expires_at, used_at')
      .eq('activation_code', code.toUpperCase())
      .eq('bot_id', bot.id)
      .single();

    if (codeError || !codeData) {
      return { success: false, error: 'Código inválido' };
    }

    // Verificar se código expirou
    if (new Date() > new Date(codeData.expires_at)) {
      return { success: false, error: 'Código expirado' };
    }

    // Verificar se código já foi usado
    if (codeData.used_at) {
      return { success: false, error: 'Código já foi usado' };
    }

    // Marcar código como usado
    await supabase
      .from('bot_activation_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by_telegram_id: userId.toString()
      })
      .eq('id', codeData.id);

    // Ativar bot
    await supabase
      .from('bots')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        activated_by_telegram_id: userId.toString()
      })
      .eq('id', bot.id);

    return { success: true, message: 'Bot ativado com sucesso!' };

  } catch (error) {
    console.error('❌ Erro na ativação:', error);
    return { success: false, error: 'Erro interno' };
  }
}

async function handleStartCommand(update: TelegramUpdate, bot: BotConfig) {
  const chatId = update.message!.chat.id;
  const userId = update.message!.from.id;

  console.log(`🔄 /start recebido de usuário ${userId} para bot ${bot.name}`);

  // Verificar se bot está ativado
  if (!bot.is_activated) {
    const message = `🤖 **Bot ainda não ativado**

Este bot ainda não foi ativado pelo proprietário.

📋 **Para ativar:**
1. Adicione este bot a um grupo como administrador
2. Gere um código de ativação no painel
3. Envie o código no grupo (formato: XXXX-XXXX)

⏰ Códigos expiram em 10 minutos`;

    await sendTelegramMessage(bot.token, chatId, message);
    return;
  }

  // Buscar planos
  const plans = await getBotPlans(bot.id);
  
  if (plans.length === 0) {
    await sendTelegramMessage(bot.token, chatId, `${bot.welcome_message}\n\n❌ Nenhum plano disponível no momento.`);
    return;
  }

  // Criar botões dos planos
  const keyboard = plans.map(plan => [{
    text: `💎 ${plan.name} - R$ ${plan.price.toFixed(2).replace('.', ',')}`,
    callback_data: `plan_${plan.id}`
  }]);

  const replyMarkup = {
    inline_keyboard: keyboard
  };

  // Enviar mensagem com mídia se disponível
  try {
    if (bot.welcome_media_url && bot.welcome_media_type === 'photo') {
      await sendTelegramPhoto(bot.token, chatId, bot.welcome_media_url, bot.welcome_message, {
        reply_markup: replyMarkup
      });
    } else if (bot.welcome_media_url && bot.welcome_media_type === 'video') {
      await sendTelegramVideo(bot.token, chatId, bot.welcome_media_url, bot.welcome_message, {
        reply_markup: replyMarkup
      });
    } else {
      await sendTelegramMessage(bot.token, chatId, bot.welcome_message, {
        reply_markup: replyMarkup
      });
    }

    console.log(`✅ Mensagem de boas-vindas enviada para usuário ${userId}`);

  } catch (error) {
    console.error('❌ Erro ao enviar mídia:', error);
    // Fallback para texto simples
    await sendTelegramMessage(bot.token, chatId, bot.welcome_message, {
      reply_markup: replyMarkup
    });
  }
}

async function handleGroupMessage(update: TelegramUpdate, bot: BotConfig) {
  const message = update.message!;
  const text = message.text?.trim().toUpperCase();
  
  if (!text) return;

  console.log(`📱 Mensagem no grupo: '${text}' de ${message.from.id} no chat ${message.chat.id}`);

  // Verificar se é código de ativação (formato: XXXX-XXXX)
  const activationPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!activationPattern.test(text)) {
    console.log(`⚠️ Não é código de ativação: ${text}`);
    return;
  }

  console.log(`🔑 Código de ativação detectado: ${text}`);

  // Tentar ativar bot
  const result = await activateBotWithCode(text, message.from.id, message.chat.id, bot.token);

  if (result.success) {
    console.log(`🎉 BOT ATIVADO COM SUCESSO!`);
    await sendTelegramMessage(bot.token, message.chat.id, '✅ Bot ativado com sucesso!', {
      reply_to_message_id: message.message_id
    });
  } else {
    console.log(`❌ Erro na ativação: ${result.error}`);
    await sendTelegramMessage(bot.token, message.chat.id, `❌ ${result.error}`, {
      reply_to_message_id: message.message_id
    });
  }
}

async function handleCallbackQuery(update: TelegramUpdate, bot: BotConfig) {
  const callbackQuery = update.callback_query!;
  const data = callbackQuery.data;
  const chatId = callbackQuery.message!.chat.id;
  const messageId = callbackQuery.message!.message_id;

  console.log(`💎 Callback recebido: ${data} de usuário ${callbackQuery.from.id}`);

  if (data?.startsWith('plan_')) {
    const planId = data.replace('plan_', '');
    
    const supabase = createSupabaseAdmin();
    
    // Buscar informações do plano
    const { data: plan } = await supabase
      .from('plans')
      .select('name, price, description')
      .eq('id', planId)
      .single();

    if (plan) {
      const message = `💳 **Plano Selecionado: ${plan.name}**

📦 **Descrição:** ${plan.description}
💰 **Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}

🔄 **Processando pagamento...**

Em breve você receberá as instruções de pagamento via PIX.`;

      await editTelegramMessage(bot.token, chatId, messageId, message);
      
      // Aqui você pode implementar a lógica de pagamento
      // Por exemplo, integração com MercadoPago ou PushInPay
    }
  }

  // Responder ao callback para remover o "loading"
  await fetch(`https://api.telegram.org/bot${bot.token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQuery.id,
      text: 'Processando...'
    })
  });
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    
    // Extrair token do bot da URL
    const url = new URL(request.url);
    const botToken = url.searchParams.get('token');
    
    if (!botToken) {
      console.error('❌ Token não fornecido na URL');
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    console.log(`🔄 Update recebido para bot token: ${botToken.substring(0, 10)}...`);

    // Buscar configuração do bot
    const bot = await getBotByToken(botToken);
    if (!bot) {
      console.error('❌ Bot não encontrado para token:', botToken.substring(0, 10));
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    console.log(`✅ Bot encontrado: ${bot.name}`);

    // Processar diferentes tipos de update
    if (update.message) {
      const message = update.message;
      
      // Comando /start
      if (message.text === '/start') {
        await handleStartCommand(update, bot);
      }
      // Mensagens em grupos (códigos de ativação)
      else if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
        await handleGroupMessage(update, bot);
      }
    }
    // Callback queries (botões)
    else if (update.callback_query) {
      await handleCallbackQuery(update, bot);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 