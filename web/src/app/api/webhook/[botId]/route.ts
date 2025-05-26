import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: {
    botId: string;
  };
}

// Função para criar cliente Supabase administrativo
function createSupabaseAdminClient() {
  const url = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY5MDQ1NiwiZXhwIjoyMDYzMjY2NDU2fQ.-nZKTJD77uUtCglMY3zs1Jkcoq_KiZsy9NLIbJlW9Eg';
  
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
    // Forçar log para ser visível
    console.log(`📤 ENVIANDO MENSAGEM para chat ${chatId}:`, text.substring(0, 100));
    console.log(`🔗 URL:`, url);
    console.log(`📋 PAYLOAD:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log(`📋 STATUS DA RESPOSTA:`, response.status);
    console.log(`📋 RESULTADO COMPLETO:`, JSON.stringify(result, null, 2));
    
    if (!result.ok) {
      console.error(`❌ ERRO DO TELEGRAM: ${result.description} (código: ${result.error_code})`);
      
      // Tratar erro específico de chat not found
      if (result.error_code === 400 && result.description.includes('chat not found')) {
        console.error(`🚫 CHAT ${chatId} NÃO ENCONTRADO - O usuário precisa iniciar conversa com o bot primeiro!`);
        return { 
          ok: false, 
          error_code: result.error_code, 
          description: 'Usuário precisa iniciar conversa com o bot primeiro' 
        };
      }
    } else {
      console.log(`✅ MENSAGEM ENVIADA COM SUCESSO para chat ${chatId}`);
    }

    return result;
  } catch (error) {
    console.error('❌ ERRO DE REDE AO ENVIAR MENSAGEM:', error);
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

  // Enviar mídia primeiro (se configurada)
  if (bot.welcome_media_url) {
    try {
      console.log(`📸 Enviando mídia de boas-vindas: ${bot.welcome_media_type}`);
      
      const mediaType = bot.welcome_media_type || 'photo';
      let mediaMethod = 'sendPhoto';
      let mediaField = 'photo';
      
      if (mediaType === 'video') {
        mediaMethod = 'sendVideo';
        mediaField = 'video';
      } else if (mediaType === 'animation' || mediaType === 'gif') {
        mediaMethod = 'sendAnimation';
        mediaField = 'animation';
      }
      
      const mediaUrl = `https://api.telegram.org/bot${bot.token}/${mediaMethod}`;
      const mediaPayload: any = {
        chat_id: chatId,
        [mediaField]: bot.welcome_media_url
      };
      
      const mediaResponse = await fetch(mediaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaPayload)
      });
      
      const mediaResult = await mediaResponse.json();
      if (!mediaResult.ok) {
        console.warn(`⚠️ Erro ao enviar mídia: ${mediaResult.description}`);
      } else {
        console.log(`✅ Mídia enviada com sucesso`);
      }
    } catch (mediaError) {
      console.warn(`⚠️ Erro ao processar mídia: ${mediaError}`);
    }
  }

  // Enviar mensagem de boas-vindas com planos
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

async function handleCallbackQuery(update: TelegramUpdate, bot: BotConfig) {
  const callbackQuery = update.callback_query!;
  const chatId = callbackQuery.message!.chat.id;
  const messageId = callbackQuery.message!.message_id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const userName = callbackQuery.from.first_name;

  console.log(`💎 Callback recebido: ${data} de usuário ${userId} no chat ${chatId}`);

  // Responder ao callback para remover o "loading"
  try {
    await fetch(`https://api.telegram.org/bot${bot.token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: 'Processando...'
      })
    });
  } catch (error) {
    console.warn('⚠️ Erro ao responder callback:', error);
  }

  // Processar clique no plano
  if (data?.startsWith('plan_')) {
    const planId = data.replace('plan_', '');
    
    try {
      // Buscar detalhes do plano
      const supabase = createSupabaseAdminClient();
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id, name, price, description, period_days')
        .eq('id', planId)
        .eq('bot_id', bot.id)
        .eq('is_active', true)
        .single();

      if (planError || !plan) {
        console.error('❌ Plano não encontrado:', planError);
        await sendTelegramMessage(bot.token, chatId, 
          '❌ Plano não encontrado ou indisponível. Tente novamente.');
        return;
      }

      console.log(`💎 Plano selecionado: ${plan.name} (R$ ${plan.price})`);

      // Criar pagamento PIX
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app'}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_id: bot.id,
          plan_id: planId,
          telegram_user_id: userId.toString(),
          telegram_username: callbackQuery.from.username || '',
          user_name: userName,
          value_reais: plan.price
        })
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResult.success) {
        console.error('❌ Erro ao criar pagamento:', paymentResult.error);
        await sendTelegramMessage(bot.token, chatId, 
          `❌ Erro ao processar pagamento: ${paymentResult.error}`);
        return;
      }

      console.log('✅ Pagamento PIX criado:', paymentResult.payment_id);

      // Calcular split
      const totalAmount = plan.price;
      const platformFee = 1.48 + (totalAmount * 0.05);
      const ownerAmount = totalAmount - platformFee;

      // Gerar mensagem com instruções de pagamento
      const paymentMessage = `💳 **PLANO SELECIONADO**

📦 **${plan.name}**
💰 **Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}
⏰ **Período:** ${plan.period_days} dias

🎯 **PAGAMENTO VIA PIX**

💻 **Código Copia e Cola:**
\`${paymentResult.pix_code}\`

📱 **Como pagar:**
1. Abra o app do seu banco
2. Escolha PIX → Copia e Cola
3. Cole o código acima
4. Confirme o pagamento

⚡ **Pagamento expira em 15 minutos**
🔄 **Acesso liberado automaticamente após confirmação**

💰 **Split da plataforma:** R$ ${platformFee.toFixed(2)} | **Seu valor:** R$ ${ownerAmount.toFixed(2)}`;

      // Botões de ação
      const keyboard = [
        [{ text: '📲 Ver QR Code', callback_data: `qr_${paymentResult.payment_id}` }],
        [{ text: '🔄 Verificar Pagamento', callback_data: `check_${paymentResult.payment_id}` }],
        [{ text: '❌ Cancelar', callback_data: `cancel_${paymentResult.payment_id}` }]
      ];

      // Editar mensagem com instruções de pagamento
      await fetch(`https://api.telegram.org/bot${bot.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: paymentMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        })
      });

      console.log(`✅ Instruções de pagamento enviadas para usuário ${userId}`);

    } catch (error) {
      console.error('❌ Erro ao processar plano:', error);
      await sendTelegramMessage(bot.token, chatId, 
        '❌ Erro interno. Tente novamente em alguns instantes.');
    }
  }
  
  // Processar outros callbacks (QR code, verificar pagamento, etc.)
  else if (data?.startsWith('qr_')) {
    const paymentId = data.replace('qr_', '');
    
    try {
      // Buscar dados do pagamento
      const supabase = createSupabaseAdminClient();
      const { data: payment, error } = await supabase
        .from('payments')
        .select('qr_code_base64, amount, plans(name)')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        await sendTelegramMessage(bot.token, chatId, 
          '❌ Pagamento não encontrado.');
        return;
      }

      // Enviar QR Code como imagem
      if (payment.qr_code_base64) {
        const qrMessage = `📲 **QR CODE PIX**

💰 **Valor:** R$ ${payment.amount.toFixed(2).replace('.', ',')}
📦 **Plano:** ${(payment as any).plans?.name || (payment as any).plans?.[0]?.name || 'N/A'}

📱 **Escaneie o QR Code abaixo com o app do seu banco:**`;

        await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: payment.qr_code_base64,
            caption: qrMessage,
            parse_mode: 'Markdown'
          })
        });
      } else {
        await sendTelegramMessage(bot.token, chatId, 
          '❌ QR Code não disponível. Use o código copia e cola.');
      }

    } catch (error) {
      console.error('❌ Erro ao enviar QR code:', error);
      await sendTelegramMessage(bot.token, chatId, 
        '❌ Erro ao carregar QR code.');
    }
  }
  
  else if (data?.startsWith('check_')) {
    const paymentId = data.replace('check_', '');
    
    try {
      // Verificar status do pagamento
      const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app'}/api/payments/status/${paymentId}`);
      const statusResult = await statusResponse.json();

      if (statusResult.success && statusResult.status === 'completed') {
        await sendTelegramMessage(bot.token, chatId, 
          '🎉 **PAGAMENTO CONFIRMADO!**\n\nSeu acesso foi liberado com sucesso!');
      } else if (statusResult.status === 'pending') {
        await sendTelegramMessage(bot.token, chatId, 
          '⏳ Pagamento ainda pendente. Aguarde a confirmação.');
      } else {
        await sendTelegramMessage(bot.token, chatId, 
          '❌ Pagamento não encontrado ou expirado.');
      }

    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error);
      await sendTelegramMessage(bot.token, chatId, 
        '❌ Erro ao verificar status do pagamento.');
    }
  }
  
  else if (data?.startsWith('cancel_')) {
    const paymentId = data.replace('cancel_', '');
    
    // Cancelar pagamento
    await sendTelegramMessage(bot.token, chatId, 
      '❌ Pagamento cancelado.\n\nVocê pode escolher um plano novamente com /start');
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

    if (update.callback_query) {
      await handleCallbackQuery(update, bot);
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