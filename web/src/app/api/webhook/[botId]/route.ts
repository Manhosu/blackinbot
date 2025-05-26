import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: {
    botId: string;
  };
}

// Função para criar cliente Supabase administrativo
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas');
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
  username?: string;
  is_activated?: boolean;
  welcome_message?: string;
  welcome_media_url?: string;
  welcome_media_type?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
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

async function getBotById(botId: string): Promise<BotConfig | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, token, username, is_activated, welcome_message, welcome_media_url, welcome_media_type')
      .eq('id', botId)
      .single();

    if (error || !bot) {
      console.error(`❌ Bot ${botId} não encontrado:`, error);
      return null;
    }

    return bot;
  } catch (error) {
    console.error(`❌ Erro ao buscar bot ${botId}:`, error);
    return null;
  }
}

async function getBotPlans(botId: string): Promise<Plan[]> {
  try {
    const supabase = createSupabaseAdminClient();
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

    return plans || [];
  } catch (error) {
    console.error(`❌ Erro ao buscar planos:`, error);
    return [];
  }
}

async function activateBotWithCode(code: string, userId: number, chatId: number, botId: string) {
  try {
    console.log(`🔑 Tentando ativar bot ${botId} com código ${code}`);
    
    const supabase = createSupabaseAdminClient();

    // Buscar código de ativação
    const { data: codeData, error: codeError } = await supabase
      .from('bot_activation_codes')
      .select('id, bot_id, expires_at, used_at')
      .eq('activation_code', code.toUpperCase())
      .eq('bot_id', botId)
      .single();

    console.log(`🔍 Resultado da busca do código:`, { codeData, codeError });

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
    const { error: codeUpdateError } = await supabase
      .from('bot_activation_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by_telegram_id: userId.toString()
      })
      .eq('id', codeData.id);

    if (codeUpdateError) {
      console.error('❌ Erro ao marcar código como usado:', codeUpdateError);
      return { success: false, error: 'Erro ao processar código' };
    }

    // Ativar bot
    const { error: botUpdateError } = await supabase
      .from('bots')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        activated_by_user_id: userId
      })
      .eq('id', botId);

    if (botUpdateError) {
      console.error('❌ Erro ao ativar bot:', botUpdateError);
      return { success: false, error: 'Erro ao ativar bot' };
    }

    console.log(`✅ Bot ${botId} ativado com sucesso!`);
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

  // Enviar mensagem de boas-vindas
  const welcomeMessage = bot.welcome_message || `🤖 Olá! Bem-vindo ao ${bot.name}!\n\nEscolha um dos nossos planos abaixo:`;
  
  await sendTelegramMessage(bot.token, chatId, welcomeMessage, {
    reply_markup: replyMarkup
  });

  console.log(`✅ Mensagem de boas-vindas enviada para usuário ${userId}`);
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
  const result = await activateBotWithCode(text, message.from.id, message.chat.id, bot.id);

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

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { botId } = params;
  
  // Validar botId
  if (!botId || typeof botId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Bot ID inválido' }, 
      { status: 400 }
    );
  }

  try {
    console.log(`🔄 Update recebido para bot ID: ${botId}`);

    // Buscar configuração do bot
    const bot = await getBotById(botId);
    if (!bot) {
      console.error(`❌ Bot ${botId} não encontrado`);
      return NextResponse.json({ success: false, error: 'Bot não encontrado' }, { status: 404 });
    }

    console.log(`✅ Bot encontrado: ${bot.name}`);

    // Processar update do Telegram
    const update: TelegramUpdate = await request.json();

    if (update.message) {
      const message = update.message;
      
      // Comando /start
      if (message.text === '/start' && message.chat.type === 'private') {
        await handleStartCommand(update, bot);
      }
      // Mensagens em grupos (códigos de ativação)
      else if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
        await handleGroupMessage(update, bot);
      }
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Método não permitido' }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Método não permitido' }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Método não permitido' }, 
    { status: 405 }
  );
} 