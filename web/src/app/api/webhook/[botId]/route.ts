import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: {
    botId: string;
  };
}

// Função para criar cliente Supabase administrativo
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? 'OK' : 'MISSING');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', key ? 'OK' : 'MISSING');
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
      last_name?: string;
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
      last_name?: string;
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
  owner_id: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  period_days: number;
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
    console.log(`📤 Enviando mensagem para chat ${chatId}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error(`❌ Erro do Telegram: ${result.description} (código: ${result.error_code})`);
      return result;
    }

    console.log(`✅ Mensagem enviada com sucesso para chat ${chatId}`);
    return result;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    throw error;
  }
}

async function sendTelegramPhoto(botToken: string, chatId: number, photo: string, caption?: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  
  const payload = {
    chat_id: chatId,
    photo: photo,
    parse_mode: 'Markdown' as const,
    ...options
  };
  
  if (caption) {
    payload.caption = caption;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (!result.ok) {
    throw new Error(`Telegram API error: ${result.description}`);
  }
  
  return result;
}

async function sendTelegramVideo(botToken: string, chatId: number, video: string, caption?: string, options: any = {}) {
  console.log(`🎬 Tentando enviar vídeo: ${video.substring(0, 100)}...`);
  
  try {
    // Primeiro: tentar como vídeo normal
    const url = `https://api.telegram.org/bot${botToken}/sendVideo`;
    
    const payload = {
      chat_id: chatId,
      video: video,
      parse_mode: 'Markdown' as const,
      supports_streaming: true,
      ...options
    };
    
    if (caption) {
      payload.caption = caption;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log(`✅ Vídeo enviado com sucesso via sendVideo`);
      return result;
    }
    
    // Se falhou, tentar como documento
    console.log(`⚠️ sendVideo falhou, tentando como documento:`, result);
    const docUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
    
    const docResponse = await fetch(docUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        document: video,
        caption: caption ? `🎬 **Vídeo**\n\n${caption}` : '🎬 **Vídeo**',
        parse_mode: 'Markdown',
        ...options
      })
    });
    
    const docResult = await docResponse.json();
    
    if (docResult.ok) {
      console.log(`✅ Vídeo enviado como documento`);
      return docResult;
    }
    
    // Se ainda falhou, enviar como link
    console.log(`⚠️ sendDocument também falhou, enviando como link:`, docResult);
    const linkMessage = `🎬 **Vídeo de boas-vindas**

${caption || ''}

🔗 **Link do vídeo:** ${video}

_Clique no link acima para assistir ao vídeo_`;
    
    return await sendTelegramMessage(botToken, chatId, linkMessage, options);
    
  } catch (error) {
    console.error('❌ Erro no envio de vídeo:', error);
    throw error;
  }
}

async function editTelegramMessage(botToken: string, chatId: number, messageId: number, text: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
  
  const payload = {
    chat_id: chatId,
    message_id: messageId,
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
    console.error('❌ Erro ao editar mensagem:', error);
    throw error;
  }
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  
  const payload = {
    callback_query_id: callbackQueryId,
    text: text || 'Processando...'
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
    return { ok: false };
  }
}

async function getBotById(botId: string): Promise<BotConfig | null> {
  try {
    console.log(`🔍 Buscando bot com ID: ${botId}`);
    const supabase = createSupabaseAdmin();
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, token, username, is_activated, welcome_message, welcome_media_url, welcome_media_type, owner_id')
      .eq('id', botId)
      .single();

    console.log(`📋 Resultado da busca:`, { bot, error });

    if (error || !bot) {
      console.error(`❌ Bot ${botId} não encontrado:`, error);
      return null;
    }

    console.log(`✅ Bot encontrado: ${bot.name}`);
    return bot;
  } catch (error) {
    console.error(`❌ Erro ao buscar bot ${botId}:`, error);
    return null;
  }
}

async function getBotPlans(botId: string): Promise<Plan[]> {
  try {
    const supabase = createSupabaseAdmin();
    const { data: plans, error } = await supabase
      .from('plans')
      .select('id, name, price, description, period_days')
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
    const message = `${bot.welcome_message || `Olá! Bem-vindo ao ${bot.name}!`}

❌ **Nenhum plano disponível no momento.**

Entre em contato com o proprietário do bot.`;
    
    await sendTelegramMessage(bot.token, chatId, message);
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

  // Mensagem de boas-vindas personalizada
  const welcomeText = bot.welcome_message || `🤖 **Olá! Bem-vindo ao ${bot.name}!**

Escolha um dos nossos planos abaixo:`;

  // Enviar mídia primeiro (se configurada)
  if (bot.welcome_media_url) {
    try {
      console.log(`📸 Enviando mídia de boas-vindas: ${bot.welcome_media_type}`);
      console.log(`🎯 URL da mídia: ${bot.welcome_media_url}`);
      
      if (bot.welcome_media_type === 'photo' || bot.welcome_media_type === 'image') {
        console.log('📸 Enviando FOTO de boas-vindas');
        await sendTelegramPhoto(bot.token, chatId, bot.welcome_media_url, welcomeText, {
          reply_markup: replyMarkup
        });
      } else if (bot.welcome_media_type === 'video') {
        console.log('🎬 Enviando VÍDEO de boas-vindas');
        await sendTelegramVideo(bot.token, chatId, bot.welcome_media_url, welcomeText, {
          reply_markup: replyMarkup
        });
      } else {
        // Fallback: tentar deduzir pela extensão se tipo não estiver definido
        console.log('🤔 Tipo de mídia não definido, tentando deduzir pela extensão...');
        const isVideo = bot.welcome_media_url.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
        
        if (isVideo) {
          console.log('🎬 Enviando VÍDEO de boas-vindas (deduzido por extensão)');
          await sendTelegramVideo(bot.token, chatId, bot.welcome_media_url, welcomeText, {
            reply_markup: replyMarkup
          });
        } else {
          console.log('📸 Enviando FOTO de boas-vindas (deduzido por extensão)');
          await sendTelegramPhoto(bot.token, chatId, bot.welcome_media_url, welcomeText, {
            reply_markup: replyMarkup
          });
        }
      }
    } catch (mediaError) {
      console.warn(`⚠️ Erro ao enviar mídia: ${mediaError}`);
      // Fallback para mensagem de texto
      await sendTelegramMessage(bot.token, chatId, welcomeText, {
        reply_markup: replyMarkup
      });
    }
  } else {
    // Enviar apenas mensagem de texto com planos
    await sendTelegramMessage(bot.token, chatId, welcomeText, {
      reply_markup: replyMarkup
    });
  }

  console.log(`✅ Mensagem de boas-vindas enviada para usuário ${userId}`);
}

async function handleCallbackQuery(update: TelegramUpdate, bot: BotConfig) {
  const callbackQuery = update.callback_query!;
  const chatId = callbackQuery.message!.chat.id;
  const messageId = callbackQuery.message!.message_id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const userName = `${callbackQuery.from.first_name} ${callbackQuery.from.last_name || ''}`.trim();

  console.log(`💎 Callback recebido: ${data} de usuário ${userId} no chat ${chatId}`);

  // Responder ao callback para remover o "loading"
  await answerCallbackQuery(bot.token, callbackQuery.id);

  // Processar clique no plano
  if (data?.startsWith('plan_')) {
    const planId = data.replace('plan_', '');
    
    try {
      // Buscar detalhes do plano
      const supabase = createSupabaseAdmin();
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
          '❌ Plano não encontrado ou indisponível. Tente novamente com /start');
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
          user_telegram_id: userId.toString(),
          user_name: userName,
          amount: plan.price
        })
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResult.success) {
        console.error('❌ Erro ao criar pagamento:', paymentResult.error);
        await sendTelegramMessage(bot.token, chatId, 
          `❌ Erro ao processar pagamento: ${paymentResult.error}`);
        return;
      }

      console.log('✅ Pagamento PIX criado:', paymentResult.payment.id);

      // Calcular valores do split
      const totalAmount = plan.price;
      const platformFee = 1.48 + (totalAmount * 0.05);
      const ownerAmount = totalAmount - platformFee;

      // Gerar mensagem com instruções de pagamento
      const paymentMessage = `💳 **PLANO SELECIONADO**

📦 **${plan.name}**
💰 **Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}
⏰ **Período:** ${plan.period_days} dias
${plan.description ? `📝 **Descrição:** ${plan.description}` : ''}

🎯 **PAGAMENTO VIA PIX**

💻 **Código Copia e Cola:**
\`${paymentResult.payment.qr_code}\`

📱 **Como pagar:**
1. Abra o app do seu banco
2. Escolha PIX → Copia e Cola
3. Cole o código acima
4. Confirme o pagamento

⚡ **Pagamento expira em 15 minutos**
🔄 **Acesso liberado automaticamente após confirmação**

💰 **Split:** Plataforma R$ ${platformFee.toFixed(2)} | Proprietário R$ ${ownerAmount.toFixed(2)}`;

      // Botões de ação
      const keyboard = [
        [{ text: '📲 Ver QR Code', callback_data: `qr_${paymentResult.payment.id}` }],
        [{ text: '🔄 Verificar Pagamento', callback_data: `check_${paymentResult.payment.id}` }],
        [{ text: '❌ Cancelar', callback_data: `cancel_${paymentResult.payment.id}` }]
      ];

      // Editar mensagem com instruções de pagamento
      await editTelegramMessage(bot.token, chatId, messageId, paymentMessage, {
          reply_markup: {
            inline_keyboard: keyboard
          }
      });

      console.log(`✅ Instruções de pagamento enviadas para usuário ${userId}`);

    } catch (error) {
      console.error('❌ Erro ao processar plano:', error);
      await sendTelegramMessage(bot.token, chatId, 
        '❌ Erro interno. Tente novamente em alguns instantes.');
    }
  }
  
  // Processar QR Code
  else if (data?.startsWith('qr_')) {
    const paymentId = data.replace('qr_', '');
    
    try {
      // Buscar dados do pagamento
      const supabase = createSupabaseAdmin();
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          qr_code, 
          amount, 
          plans!inner(name),
          metadata
        `)
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        await sendTelegramMessage(bot.token, chatId, 
          '❌ Pagamento não encontrado.');
        return;
      }

      const planName = (payment as any).plans?.name || 'Plano';
        const qrMessage = `📲 **QR CODE PIX**

💰 **Valor:** R$ ${payment.amount.toFixed(2).replace('.', ',')}
📦 **Plano:** ${planName}

📱 **Escaneie o QR Code abaixo com o app do seu banco:**`;

      // Enviar QR Code como imagem
      const qrCodeImageUrl = (payment as any).metadata?.qr_code_image_url;
      if (qrCodeImageUrl) {
        await sendTelegramPhoto(bot.token, chatId, qrCodeImageUrl, qrMessage);
      } else {
        await sendTelegramMessage(bot.token, chatId, 
          qrMessage + '\n\n❌ QR Code não disponível. Use o código copia e cola.');
      }

    } catch (error) {
      console.error('❌ Erro ao enviar QR code:', error);
      await sendTelegramMessage(bot.token, chatId, 
        '❌ Erro ao carregar QR code.');
    }
  }
  
  // Verificar pagamento
  else if (data?.startsWith('check_')) {
    const paymentId = data.replace('check_', '');
    
    try {
      // Verificar status do pagamento
      const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app'}/api/payments/status/${paymentId}`);
      const statusResult = await statusResponse.json();

      if (statusResult.success && statusResult.status === 'completed') {
        await sendTelegramMessage(bot.token, chatId, 
          '🎉 **PAGAMENTO CONFIRMADO!**\n\n✅ Seu acesso foi liberado com sucesso!\n🔄 Você será adicionado ao grupo automaticamente.');
      } else if (statusResult.status === 'pending') {
        await sendTelegramMessage(bot.token, chatId, 
          '⏳ Pagamento ainda pendente. Aguarde a confirmação ou verifique se o PIX foi processado.');
      } else {
        await sendTelegramMessage(bot.token, chatId, 
          '❌ Pagamento não encontrado ou expirado. Inicie novamente com /start');
      }

    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error);
      await sendTelegramMessage(bot.token, chatId, 
        '❌ Erro ao verificar status do pagamento.');
    }
  }
  
  // Cancelar pagamento
  else if (data?.startsWith('cancel_')) {
    await sendTelegramMessage(bot.token, chatId, 
      '❌ **Pagamento cancelado.**\n\n🔄 Você pode escolher um plano novamente com /start');
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { botId } = await params;
  
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

    // Verificar se o body é válido antes de fazer parse
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Content-Type inválido:', contentType);
      return NextResponse.json({ success: false, error: 'Content-Type deve ser application/json' }, { status: 400 });
    }

    // Processar update do Telegram com tratamento de erro
    let update: TelegramUpdate;
    try {
      const body = await request.text(); // Primeiro pegar como texto
      console.log('📥 Body recebido:', body.substring(0, 100) + '...'); // Log do início do body
      
      if (!body || body.trim() === '') {
        console.error('❌ Body vazio recebido');
        return NextResponse.json({ success: false, error: 'Body vazio' }, { status: 400 });
      }
      
      update = JSON.parse(body); // Depois fazer parse manual
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.log('📝 Body problemático:', await request.text());
      return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
    }

    if (update.message) {
      const message = update.message;
      
      // Comando /start
      if (message.text === '/start' && message.chat.type === 'private') {
        await handleStartCommand(update, bot);
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