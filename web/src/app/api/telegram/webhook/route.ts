import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Storage temporário no servidor para demonstração
let serverWebhookData: any = {
  bots: [],
  lastUpdate: null
};

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { transactionId, userId, userName, chatId, botToken, plan, pixData } = requestData;
    
    console.log('📣 Webhook do Telegram recebido:', {
      transactionId,
      userId,
      userName,
      chatId,
      plan: plan?.name,
      price: plan?.price,
      period: plan?.period
    });
    
    if (!botToken || !chatId || !pixData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Parâmetros incompletos' 
      }, { status: 400 });
    }
    
    // Buscar token do bot pelo ID para garantir que está sendo chamado com o token correto
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Construir a mensagem de pagamento PIX
    const message = `
🔐 *Pagamento Pendente* 🔐

Olá ${userName}!

Você solicitou o pagamento do plano: *${plan.name}*
Valor: *R$ ${parseFloat(plan.price).toFixed(2).replace('.', ',')}*
Período: *${plan.period} dias*

Para finalizar sua compra, faça um PIX com os dados abaixo:

*QR Code PIX:*
${pixData.qrCode}

*Código Copia e Cola:*
\`${pixData.copiaECola}\`

Após o pagamento, você receberá uma confirmação automática.

Obrigado!
    `.trim();
    
    // Enviar mensagem para o Telegram
    try {
      // Primeiro tentar enviar o texto
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const telegramResponse = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      const telegramResult = await telegramResponse.json();
      
      if (!telegramResult.ok) {
        console.error('❌ Erro ao enviar mensagem para o Telegram:', telegramResult);
        return NextResponse.json({
          success: false,
          error: 'Erro ao enviar mensagem para o Telegram',
          telegram_error: telegramResult.description
        }, { status: 500 });
      }
      
      console.log('✅ Mensagem enviada para o Telegram com sucesso!');
      
      // Registrar a atividade no banco de dados
      try {
        await supabase
          .from('bot_activities')
          .insert({
            bot_token: botToken,
            user_id: userId,
            user_name: userName, 
            chat_id: chatId,
            activity_type: 'payment_request',
            transaction_id: transactionId,
            plan_name: plan.name,
            plan_price: plan.price,
            timestamp: new Date().toISOString()
          });
      } catch (dbError) {
        console.warn('⚠️ Erro ao registrar atividade no banco:', dbError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Webhook processado com sucesso'
      });
      
    } catch (telegramError: any) {
      console.error('❌ Erro ao chamar API do Telegram:', telegramError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao chamar API do Telegram',
        details: telegramError?.message || 'Erro desconhecido'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro no webhook do Telegram:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Função para encontrar bot pelo chat
function findTargetBot(chatId: number) {
  // Em produção, mapear chat_id para bot específico
  // Por enquanto, retornar null para usar bot demo
  return null;
}

// Função para processar mensagem do bot
async function handleBotMessage(bot: any, chatId: number, userId: number, userName: string, messageText: string) {
  console.log(`🤖 Processando mensagem para bot: ${bot.name} (${bot.id})`);

  // Verificar se é comando /start
  if (messageText.startsWith('/start')) {
    await sendWelcomeMessage(bot, chatId, userName);
  } 
  // Verificar se é comando de pagamento /pagar_X
  else if (messageText.match(/^\/pagar_\d+$/)) {
    const planIndex = parseInt(messageText.replace('/pagar_', '')) - 1;
    await processPaymentCommand(bot, chatId, userId, userName, planIndex);
  }
  // Qualquer outra mensagem
  else {
    // Responder com informações dos planos
    await sendPlansMessage(bot, chatId, userName);
  }
}

// Função para processar comando de pagamento
async function processPaymentCommand(bot: any, chatId: number, userId: number, userName: string, planIndex: number) {
  try {
    console.log(`💳 Processando comando de pagamento: plano ${planIndex + 1} para ${userName}`);
    
    // Preparar dados do plano
    const plans = getBotPlans(bot);
    const selectedPlan = plans[planIndex];
    
    if (!selectedPlan) {
      await sendTextMessage(bot.token, chatId, '❌ Plano não encontrado. Envie /start para ver os planos disponíveis.');
      return;
    }
    
    // Chamar API de pagamento PIX
    const pixResponse = await fetch('/api/payments/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId: bot.id,
        planIndex,
        userId: userId.toString(),
        userName,
        chatId,
        botData: bot // Enviar dados do bot para a API
      })
    });
    
    const pixResult = await pixResponse.json();
    
    if (pixResult.success) {
      await sendPaymentMessage(bot.token, chatId, pixResult.plan, pixResult.pixData, pixResult.transactionId);
    } else {
      console.error('❌ Erro ao gerar PIX:', pixResult.error);
      await sendTextMessage(bot.token, chatId, '❌ Erro interno. Tente novamente em alguns minutos.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar comando de pagamento:', error);
    await sendTextMessage(bot.token, chatId, '❌ Erro interno. Tente novamente em alguns minutos.');
  }
}

// Função para obter planos do bot
function getBotPlans(bot: any) {
  const plans = [];
  
  // Plano principal (formato antigo)
  if (bot.plan_name && bot.plan_price) {
    plans.push({
      id: 'main_plan',
      name: bot.plan_name,
      price: parseFloat(bot.plan_price) || 0,
      days_access: parseInt(bot.plan_days_access) || 30
    });
  }
  
  // Planos adicionais (formato antigo)
  if (bot.additional_plans && Array.isArray(bot.additional_plans)) {
    bot.additional_plans.forEach((plan: any, index: number) => {
      plans.push({
        id: plan.id || `additional_${index}`,
        name: plan.name,
        price: parseFloat(plan.price) || 0,
        days_access: parseInt(plan.days_access || plan.period_days) || 30
      });
    });
  }
  
  // Planos no formato novo
  if (bot.plans && Array.isArray(bot.plans)) {
    plans.push(...bot.plans.map((plan: any) => ({
      ...plan,
      price: parseFloat(plan.price) || 0,
      days_access: parseInt(plan.days_access || plan.period_days) || 30
    })));
  }
  
  return plans;
}

// Função para enviar dados de pagamento PIX
async function sendPaymentMessage(token: string, chatId: number, plan: any, pixData: any, transactionId: string) {
  try {
    const message = `💳 **DADOS PARA PAGAMENTO**\n\n📦 **Plano:** ${plan.name}\n💰 **Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}\n⏰ **Duração:** ${plan.days_access} dias\n\n🔑 **Chave PIX:** \`${pixData.pixKey}\`\n\n📋 **Descrição:** ${pixData.description}\n\n⚠️ **Importante:**\n• Efetue o pagamento exatamente no valor mostrado\n• O pagamento expira em 30 minutos\n• Após o pagamento, você será adicionado automaticamente ao grupo\n\n🆔 **ID da Transação:** \`${transactionId}\`\n\n💳 **Use o código PIX abaixo ou escaneie o QR Code:**`;
    
    // Enviar mensagem com dados PIX
    await sendTextMessage(token, chatId, message);
    
    // Enviar QR Code se disponível
    if (pixData.qrCodeURL) {
      await sendPhotoMessage(token, chatId, pixData.qrCodeURL, `🔍 **QR Code PIX**\n\nEscaneie este código para pagar rapidamente!\n\n💰 **Valor:** R$ ${plan.price.toFixed(2).replace('.', ',')}\n📦 **Plano:** ${plan.name}`);
    }
    
    // Enviar código PIX copiável
    await sendTextMessage(token, chatId, `📋 **Código PIX (clique para copiar):**\n\n\`${pixData.pixCode}\`\n\n⏰ Este código expira em 30 minutos.`);
    
    console.log(`✅ Dados de pagamento enviados para ${chatId}`);
  } catch (error) {
    console.error('❌ Erro ao enviar dados de pagamento:', error);
  }
}

// Função para enviar foto
async function sendPhotoMessage(token: string, chatId: number, photoUrl: string, caption: string) {
  if (!token) {
    console.log('⚠️ Token não configurado, simulando envio de foto:', caption);
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: 'Markdown'
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao enviar foto:', error);
  }
}

// Função para enviar mensagem de boas-vindas
async function sendWelcomeMessage(bot: any, chatId: number, userName: string) {
  try {
    console.log(`📤 Enviando mensagem de boas-vindas para ${userName}`);
    
    // Personalizar mensagem com nome do usuário
    let welcomeText = bot.welcome_message || 'Bem-vindo!';
    welcomeText = welcomeText.replace('{nome}', userName).replace('{name}', userName);
    
    // Adicionar informações dos planos
    const plansText = generatePlansText(bot);
    const fullMessage = `${welcomeText}\n\n${plansText}`;
    
    // Se tem mídia, enviar com mídia
    if (bot.welcome_media_url) {
      await sendMediaMessage(bot.token, chatId, fullMessage, bot.welcome_media_url);
    } else {
      await sendTextMessage(bot.token, chatId, fullMessage);
    }
    
    console.log('✅ Mensagem de boas-vindas enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar boas-vindas:', error);
  }
}

// Função para enviar mensagem com planos
async function sendPlansMessage(bot: any, chatId: number, userName: string) {
  try {
    console.log(`📤 Enviando planos para ${userName}`);
    
    const plansText = generatePlansText(bot);
    const message = `Olá ${userName}! 👋\n\nAqui estão nossos planos disponíveis:\n\n${plansText}`;
    
    await sendTextMessage(bot.token, chatId, message);
    
    console.log('✅ Mensagem com planos enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar planos:', error);
  }
}

// Função para gerar texto dos planos
function generatePlansText(bot: any): string {
  let plansText = '💎 **PLANOS DISPONÍVEIS:**\n\n';
  
  const plans = getBotPlans(bot);
  
  if (plans.length === 0) {
    return '⚠️ Nenhum plano disponível no momento.';
  }
  
  plans.forEach((plan, index) => {
    const price = parseFloat(plan.price) || 0;
    const days = parseInt(plan.days_access) || 30;
    const period = days >= 9999 ? 'Vitalício' : days >= 365 ? `${Math.floor(days/365)} ano(s)` : `${days} dias`;
    
    plansText += `${index + 1}. **${plan.name}**\n`;
    plansText += `   💰 R$ ${price.toFixed(2).replace('.', ',')}\n`;
    plansText += `   ⏰ ${period}\n`;
    plansText += `   🔗 /pagar_${index + 1}\n\n`;
  });
  
  plansText += '📞 Para mais informações, entre em contato!\n';
  plansText += '💳 Pagamento via PIX instantâneo';
  
  return plansText;
}

// Função para enviar mensagem de texto
async function sendTextMessage(token: string, chatId: number, text: string) {
  if (!token) {
    console.log('⚠️ Token não configurado, simulando envio de mensagem:', text);
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao enviar mensagem:', error);
    throw new Error(`Erro ao enviar mensagem: ${error}`);
  }
  
  return await response.json();
}

// Função para enviar mensagem com mídia
async function sendMediaMessage(token: string, chatId: number, caption: string, mediaUrl: string) {
  if (!token) {
    console.log('⚠️ Token não configurado, simulando envio de mídia:', caption);
    return;
  }

  // Detectar tipo de mídia pela URL ou extensão
  const isVideo = mediaUrl.includes('video') || mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
  const method = isVideo ? 'sendVideo' : 'sendPhoto';
  const mediaField = isVideo ? 'video' : 'photo';
  
  const url = `https://api.telegram.org/bot${token}/${method}`;
  
  const payload = {
    chat_id: chatId,
    [mediaField]: mediaUrl,
    caption: caption,
    parse_mode: 'Markdown'
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao enviar mídia:', error);
    // Fallback para mensagem de texto
    await sendTextMessage(token, chatId, caption);
    return;
  }
  
  return await response.json();
}

// API para configurar dados do webhook (receber dados do frontend)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('⚙️ Configurando dados do webhook:', body);
    
    const { bots } = body;
    
    if (bots && Array.isArray(bots)) {
      serverWebhookData.bots = bots;
      serverWebhookData.lastUpdate = new Date().toISOString();
      
      console.log(`✅ ${bots.length} bots configurados no webhook`);
      
      return NextResponse.json({
        success: true,
        message: `${bots.length} bots configurados`,
        lastUpdate: serverWebhookData.lastUpdate
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Dados de bots inválidos'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram Webhook API ativa',
    timestamp: new Date().toISOString()
  });
} 