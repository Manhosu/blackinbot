import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar service role para ter acesso completo
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// Simular um update do Telegram para teste
interface TestStartRequest {
  botId: string;
  chatId: number;
  userId: number;
  firstName: string;
  username?: string;
}

interface TelegramUpdate {
  update_id: number;
  message: {
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
    };
    date: number;
    text: string;
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
      supports_streaming: true,
      ...options
    })
  });
  
  return response.json();
}

async function getBotById(botId: string): Promise<BotConfig | null> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('bots')
      .select('id, name, token, username, is_activated, welcome_message, welcome_media_url, welcome_media_type')
      .eq('id', botId)
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

async function getBotPlans(botId: string) {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, description, price, period_days')
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

async function handleStartCommand(update: TelegramUpdate, bot: BotConfig) {
  const chatId = update.message.chat.id;
  const userId = update.message.from.id;

  console.log(`🔄 /start simulado de usuário ${userId} para bot ${bot.name}`);

  // Verificar se bot está ativado
  if (!bot.is_activated) {
    const message = `🤖 **Bot ainda não ativado**

Este bot ainda não foi ativado pelo proprietário.`;

    await sendTelegramMessage(bot.token, chatId, message);
    return;
  }

  // Buscar planos
  const plans = await getBotPlans(bot.id);
  
  // Criar mensagem inicial
  let initialMessage = bot.welcome_message;
  
  if (plans.length === 0) {
    initialMessage += '\n\n❌ **Nenhum plano disponível no momento.**';
    
    // Enviar só texto se não houver planos
    if (bot.welcome_media_url && bot.welcome_media_type === 'video') {
      await sendTelegramVideo(bot.token, chatId, bot.welcome_media_url, initialMessage);
    } else {
      await sendTelegramMessage(bot.token, chatId, initialMessage);
    }
    return;
  }

  // Adicionar planos à mensagem
  initialMessage += '\n\n💎 **Planos disponíveis:**\n';
  plans.forEach((plan, index) => {
    initialMessage += `${index + 1}. **${plan.name}** - R$ ${plan.price.toFixed(2).replace('.', ',')}\n`;
  });
  initialMessage += '\n📲 Use os botões abaixo para escolher um plano!';

  // Criar botões dos planos
  const keyboard = plans.map(plan => [{
    text: `💎 ${plan.name} - R$ ${plan.price.toFixed(2).replace('.', ',')}`,
    callback_data: `plan_${plan.id}`
  }]);

  keyboard.push([{
    text: '❓ Ajuda',
    callback_data: 'help_payment'
  }]);

  const replyMarkup = {
    inline_keyboard: keyboard
  };

  // Enviar mensagem com mídia se disponível
  if (bot.welcome_media_url && bot.welcome_media_type === 'video') {
    const result = await sendTelegramVideo(bot.token, chatId, bot.welcome_media_url, initialMessage, {
      reply_markup: replyMarkup
    });
    console.log('📤 Resultado do envio:', result);
  } else {
    const result = await sendTelegramMessage(bot.token, chatId, initialMessage, {
      reply_markup: replyMarkup
    });
    console.log('📤 Resultado do envio:', result);
  }

  console.log(`✅ Mensagem /start enviada para usuário ${userId} com ${plans.length} planos`);
}

export async function POST(request: NextRequest) {
  try {
    const body: TestStartRequest = await request.json();
    const { botId, chatId, userId, firstName, username } = body;

    if (!botId || !chatId || !userId || !firstName) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios: botId, chatId, userId, firstName'
      }, { status: 400 });
    }

    console.log(`🧪 Testando comando /start para bot ${botId}...`);

    // Buscar dados do bot
    const bot = await getBotById(botId);
    if (!bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    // Criar update simulado
    const simulatedUpdate: TelegramUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: {
          id: userId,
          is_bot: false,
          first_name: firstName,
          username: username
        },
        chat: {
          id: chatId,
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    };

    // Processar comando /start
    await handleStartCommand(simulatedUpdate, bot);

    return NextResponse.json({
      success: true,
      message: 'Comando /start processado com sucesso',
      bot: {
        id: bot.id,
        name: bot.name,
        is_activated: bot.is_activated
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao testar /start:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor: ' + error.message
    }, { status: 500 });
  }
} 