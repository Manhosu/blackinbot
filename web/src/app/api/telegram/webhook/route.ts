import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração para Next.js App Router
export const runtime = 'nodejs';

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

// ✅ OTIMIZAÇÃO: Cache simples para planos (cache por 5 minutos)
const plansCache = new Map<string, { data: Plan[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ✅ OTIMIZAÇÃO: Cache para bots também (cache reduzido para debug)
const botsCache = new Map<string, { data: BotConfig; timestamp: number }>();
const BOT_CACHE_DURATION = 30 * 1000; // 30 segundos para debug

// Função para limpar cache
function clearAllCaches() {
  botsCache.clear();
  plansCache.clear();
  console.log('🧹 Cache limpo forçadamente');
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
  
  console.log(`🎬 Tentando enviar vídeo: ${video.substring(0, 100)}...`);
  
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
      width: 640,
      height: 480,
      ...options
    })
  });
  
  const result = await response.json();
  console.log(`📤 Resposta sendVideo:`, result);
  
  return result;
}

// ✅ NOVA FUNÇÃO: Enviar vídeo como documento (para vídeos grandes)
async function sendTelegramDocument(botToken: string, chatId: number, document: string, caption: string, options: any = {}) {
  const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
  
  console.log(`📁 Enviando vídeo como documento: ${document.substring(0, 100)}...`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      document: document,
      caption: caption,
      parse_mode: 'Markdown',
      ...options
    })
  });
  
  const result = await response.json();
  console.log(`📤 Resposta sendDocument:`, result);
  
  return result;
}

// ✅ NOVA FUNÇÃO: Enviar vídeo com fallbacks inteligentes
async function sendVideoWithFallbacks(botToken: string, chatId: number, videoUrl: string, caption: string, options: any = {}) {
  console.log(`🎬 Iniciando envio de vídeo com fallbacks`);
  
  try {
    // Primeiro: tentar como vídeo normal
    console.log(`🎯 Tentativa 1: sendVideo`);
    const videoResult = await sendTelegramVideo(botToken, chatId, videoUrl, caption, options);
    
    if (videoResult.ok) {
      console.log(`✅ Vídeo enviado com sucesso via sendVideo`);
      return videoResult;
    }
    
    // Se falhou, verificar erro
    console.log(`⚠️ sendVideo falhou:`, videoResult);
    
    // Se é erro de tamanho, tentar como documento
    if (videoResult.error_code === 413 || 
        (videoResult.description && videoResult.description.includes('too large')) ||
        (videoResult.description && videoResult.description.includes('file size'))) {
      
      console.log(`📁 Tentativa 2: sendDocument (vídeo muito grande)`);
      const docResult = await sendTelegramDocument(botToken, chatId, videoUrl, `🎬 **Vídeo**\n\n${caption}`, options);
      
      if (docResult.ok) {
        console.log(`✅ Vídeo enviado como documento`);
        return docResult;
      }
      
      console.log(`❌ sendDocument também falhou:`, docResult);
    }
    
    // Se ainda falhou, tentar como link
    console.log(`🔗 Tentativa 3: enviar como link de texto`);
    const linkMessage = `🎬 **Vídeo de boas-vindas**

${caption}

🔗 **Link do vídeo:** ${videoUrl}

_Clique no link acima para assistir ao vídeo_`;
    
    const textResult = await sendTelegramMessage(botToken, chatId, linkMessage, options);
    
    if (textResult.ok) {
      console.log(`✅ Vídeo enviado como link de texto`);
      return textResult;
    }
    
    throw new Error('Todas as tentativas de envio falharam');
    
  } catch (error) {
    console.error('❌ Erro em sendVideoWithFallbacks:', error);
    throw error;
  }
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
    // ✅ Verificar cache primeiro
    const cached = botsCache.get(token);
    if (cached && (Date.now() - cached.timestamp) < BOT_CACHE_DURATION) {
      console.log(`⚡ Bot carregado do cache`);
      return cached.data;
    }

    console.log(`🔍 Buscando bot no banco...`);
    
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
    
    console.log(`✅ Bot encontrado: ${data.name}`);
    
    // ✅ Atualizar cache
    botsCache.set(token, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar bot:', error);
    
    // ✅ OTIMIZAÇÃO: Retornar cache em caso de erro
    const cached = botsCache.get(token);
    if (cached) {
      console.log('⚠️ Usando cache do bot devido ao erro');
      return cached.data;
    }
    
    return null;
  }
}

async function getBotPlans(botId: string): Promise<Plan[]> {
  try {
    // ✅ Verificar cache primeiro
    const cached = plansCache.get(botId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`⚡ Planos carregados do cache para bot ${botId}`);
      return cached.data;
    }

    console.log(`🔍 Buscando planos no banco para bot ${botId}...`);
    
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, description, price, period_days')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      
      // ✅ OTIMIZAÇÃO: Retornar cache antigo em caso de erro
      if (cached) {
        console.log('⚠️ Usando cache antigo devido ao erro');
        return cached.data;
      }
      
      return [];
    }
    
    const plans = data || [];
    console.log(`✅ ${plans.length} planos encontrados para bot ${botId}`);
    
    // ✅ Atualizar cache
    plansCache.set(botId, {
      data: plans,
      timestamp: Date.now()
    });
    
    return plans;
  } catch (error) {
    console.error('❌ Erro ao buscar planos:', error);
    
    // ✅ OTIMIZAÇÃO: Retornar cache em caso de erro de conexão
    const cached = plansCache.get(botId);
    if (cached) {
      console.log('⚠️ Usando cache devido ao erro de conexão');
      return cached.data;
    }
    
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

  // ✅ OTIMIZAÇÃO: Buscar planos em paralelo com o envio da mensagem
  const plansPromise = getBotPlans(bot.id);
  
  // ✅ OTIMIZAÇÃO: Enviar mensagem de carregamento imediatamente
  const loadingMessage = `${bot.welcome_message}

🔄 **Carregando planos disponíveis...**`;

  // ✅ DEBUG: Log dados do bot
  console.log(`🔍 DEBUG Bot:`, {
    name: bot.name,
    welcome_media_url: bot.welcome_media_url,
    welcome_media_type: bot.welcome_media_type,
    has_media: !!(bot.welcome_media_url && bot.welcome_media_type)
  });

  // Enviar mensagem inicial sem esperar pelos planos
  let sentMessage;
  try {
    if (bot.welcome_media_url && bot.welcome_media_type === 'photo') {
      console.log(`📸 Enviando FOTO: ${bot.welcome_media_url}`);
      sentMessage = await sendTelegramPhoto(bot.token, chatId, bot.welcome_media_url, loadingMessage);
    } else if (bot.welcome_media_url && bot.welcome_media_type === 'video') {
      console.log(`🎬 Enviando VÍDEO: ${bot.welcome_media_url}`);
      sentMessage = await sendVideoWithFallbacks(bot.token, chatId, bot.welcome_media_url, loadingMessage);
    } else {
      console.log(`📝 Enviando apenas TEXTO (sem mídia)`);
      sentMessage = await sendTelegramMessage(bot.token, chatId, loadingMessage);
    }
    
    console.log(`✅ Mídia enviada com sucesso:`, sentMessage);
  } catch (error) {
    console.error('❌ Erro ao enviar mídia:', error);
    // Fallback para texto simples
    console.log(`🔄 Fallback: enviando apenas texto`);
    sentMessage = await sendTelegramMessage(bot.token, chatId, loadingMessage);
  }

  // Aguardar planos e atualizar mensagem
  try {
    const plans = await plansPromise;
    
    if (plans.length === 0) {
      await editTelegramMessage(bot.token, chatId, sentMessage.message_id, 
        `${bot.welcome_message}\n\n❌ **Nenhum plano disponível no momento.**\n\nEntre em contato com o suporte.`);
      return;
    }

    // ✅ OTIMIZAÇÃO: Criar botões dos planos de forma mais eficiente
    const keyboard = plans.map(plan => [{
      text: `💎 ${plan.name} - R$ ${plan.price.toFixed(2).replace('.', ',')}`,
      callback_data: `plan_${plan.id}`
    }]);

    // Adicionar botão de ajuda
    keyboard.push([{
      text: '❓ Ajuda',
      callback_data: 'help_payment'
    }]);

    const replyMarkup = {
      inline_keyboard: keyboard
    };

    // ✅ OTIMIZAÇÃO: Criar mensagem final otimizada
    const finalMessage = `${bot.welcome_message}

💎 **Selecione um plano:**
👇 Escolha o plano que melhor se adequa às suas necessidades`;

    // Atualizar mensagem com planos
    await editTelegramMessage(bot.token, chatId, sentMessage.message_id, finalMessage, {
      reply_markup: replyMarkup
    });

    console.log(`✅ Mensagem de boas-vindas atualizada para usuário ${userId} com ${plans.length} planos`);

  } catch (error) {
    console.error('❌ Erro ao carregar planos:', error);
    
    // ✅ OTIMIZAÇÃO: Fallback em caso de erro
    await editTelegramMessage(bot.token, chatId, sentMessage.message_id, 
      `${bot.welcome_message}

❌ **Erro temporário**

Não foi possível carregar os planos no momento.

🔄 **Tente novamente:**
• Use /start para recarregar
• Ou entre em contato com o suporte

📞 **Suporte:** @suporte_bot`, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Tentar novamente', callback_data: 'back_to_start' }
        ]]
      }
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
  const userId = callbackQuery.from.id;

  console.log(`💎 Callback recebido: ${data} de usuário ${userId}`);

  // ✅ OTIMIZAÇÃO: Responder ao callback IMEDIATAMENTE para remover o "loading"
  await fetch(`https://api.telegram.org/bot${bot.token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQuery.id,
      text: 'Carregando plano...',
      show_alert: false
    })
  });

  if (data?.startsWith('plan_')) {
    const planId = data.replace('plan_', '');
    
    try {
      const supabase = createSupabaseAdmin();
      
      // Buscar informações do plano
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('name, price, description, period_days')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        console.error('❌ Erro ao buscar plano:', planError);
        await editTelegramMessage(bot.token, chatId, messageId, 
          '❌ **Erro**\n\nPlano não encontrado. Tente novamente com /start');
        return;
      }

      // ✅ OTIMIZAÇÃO: Mostrar informações do plano IMEDIATAMENTE
      const periodLabel = plan.period_days >= 9000 ? 'Vitalício' : 
                         plan.period_days >= 365 ? `${Math.floor(plan.period_days/365)} ano(s)` : 
                         `${plan.period_days} dias`;

      const planMessage = `💎 **${plan.name}**

📋 **Descrição:** ${plan.description || 'Acesso completo ao bot'}
💰 **Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}
⏰ **Período:** ${periodLabel}

🚀 **Gerando pagamento PIX...**

Aguarde alguns segundos...`;

      // Editar mensagem com informações do plano
      await editTelegramMessage(bot.token, chatId, messageId, planMessage);

      // ✅ OTIMIZAÇÃO: Gerar pagamento PIX em paralelo (simulado)
      setTimeout(async () => {
        try {
          // Aqui você integraria com um gateway de pagamento real
          // Por enquanto, vou simular a geração de um PIX
          
          const pixCode = `PIX${Date.now().toString().slice(-8)}`;
          const pixKey = 'blackinpay@email.com'; // Substitua pela sua chave PIX real
          
          const paymentMessage = `💳 **Pagamento Gerado!**

**Plano:** ${plan.name}
**Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}

🔹 **Opção 1: PIX Copia e Cola**
\`${pixKey}\`

🔹 **Opção 2: Código PIX**
\`${pixCode}\`

⏰ **Prazo:** 30 minutos para pagamento
📱 **ID da transação:** ${Date.now()}

✅ **Após o pagamento:**
• O acesso será liberado automaticamente
• Você receberá uma confirmação aqui
• Em caso de problemas, entre em contato

⚠️ **Importante:** Não compartilhe este código com outras pessoas`;

          // Criar botões para ações adicionais
          const paymentKeyboard = {
            inline_keyboard: [
              [
                { text: '✅ Já paguei', callback_data: `confirm_payment_${planId}_${Date.now()}` },
                { text: '🔄 Gerar novo PIX', callback_data: `new_pix_${planId}` }
              ],
              [
                { text: '❓ Ajuda', callback_data: 'help_payment' },
                { text: '🏠 Voltar ao início', callback_data: 'back_to_start' }
              ]
            ]
          };

          await editTelegramMessage(bot.token, chatId, messageId, paymentMessage, {
            reply_markup: paymentKeyboard
          });

          console.log(`✅ Pagamento PIX gerado para usuário ${userId}, plano ${plan.name}`);

        } catch (paymentError) {
          console.error('❌ Erro ao gerar pagamento:', paymentError);
          
          const errorMessage = `❌ **Erro no pagamento**

Não foi possível gerar o PIX no momento.

🔄 **Tente novamente:**
• Use /start para voltar ao início
• Ou entre em contato com o suporte

📞 **Suporte:** @suporte_bot`;

          await editTelegramMessage(bot.token, chatId, messageId, errorMessage, {
            reply_markup: {
              inline_keyboard: [[
                { text: '🔄 Tentar novamente', callback_data: `plan_${planId}` },
                { text: '🏠 Voltar ao início', callback_data: 'back_to_start' }
              ]]
            }
          });
        }
      }, 1500); // ✅ OTIMIZAÇÃO: Delay menor para melhor UX

    } catch (error) {
      console.error('❌ Erro geral no callback:', error);
      await editTelegramMessage(bot.token, chatId, messageId, 
        '❌ **Erro interno**\n\nTente novamente em alguns segundos.\n\nUse /start para reiniciar.');
    }
  }
  
  // Tratar outros tipos de callback
  else if (data === 'back_to_start') {
    // Simular comando /start
    const startUpdate = {
      ...update,
      message: {
        message_id: messageId,
        from: callbackQuery.from,
        chat: { id: chatId, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    };
    await handleStartCommand(startUpdate as TelegramUpdate, bot);
  }
  
  else if (data?.startsWith('confirm_payment_')) {
    await editTelegramMessage(bot.token, chatId, messageId, 
      '🔍 **Verificando pagamento...**\n\nAguarde enquanto confirmamos o recebimento.\n\nIsso pode levar alguns minutos.');
    
    // Aqui você implementaria a verificação real do pagamento
    setTimeout(async () => {
      await editTelegramMessage(bot.token, chatId, messageId, 
        '⏳ **Pagamento em análise**\n\nSeu pagamento foi recebido e está sendo processado.\n\nVocê será notificado assim que for aprovado.\n\n⏰ Tempo médio: 5-15 minutos');
    }, 2000);
  }
  
  else if (data?.startsWith('new_pix_')) {
    const planId = data.replace('new_pix_', '');
    // Regenerar PIX - chamar o mesmo callback do plano
    const newUpdate = { ...update, callback_query: { ...callbackQuery, data: `plan_${planId}` } };
    await handleCallbackQuery(newUpdate, bot);
  }
  
  else if (data === 'help_payment') {
    const helpMessage = `❓ **Ajuda com Pagamento PIX**

**Como pagar:**
1️⃣ Copie a chave PIX ou código
2️⃣ Abra seu banco/carteira digital
3️⃣ Faça um PIX para a chave/código
4️⃣ Clique em "✅ Já paguei"

**Problemas comuns:**
• ⏰ PIX expira em 30 minutos
• 💰 Valor deve ser exato
• 📱 Use a chave/código fornecido

**Suporte:**
Em caso de problemas, entre em contato:
📧 suporte@blackinpay.com
📱 @suporte_bot`;

    await editTelegramMessage(bot.token, chatId, messageId, helpMessage, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔙 Voltar', callback_data: 'back_to_start' }
        ]]
      }
    });
  }
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
      // Comando especial para limpar cache
      else if (message.text === '/clear_cache_internal' && message.from.id === 999999999) {
        clearAllCaches();
        console.log('🧹 Cache limpo via comando interno');
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