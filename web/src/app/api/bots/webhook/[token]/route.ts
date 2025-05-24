import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Manipulador do webhook do Telegram
 * Este endpoint receberá as atualizações do Telegram para o bot
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Decodificar o token da URL
    const decodedToken = Buffer.from(params.token, 'base64').toString();
    
    // Verificar se o bot existe no sistema
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('token', decodedToken)
      .single();
    
    if (botError || !bot) {
      console.error('Bot não encontrado:', botError);
      return NextResponse.json({ success: false, error: 'Bot não encontrado' }, { status: 404 });
    }
    
    // Obter a atualização do Telegram
    const update = await request.json();
    console.log('Webhook recebido:', JSON.stringify(update));
    
    // Processar o update
    await processUpdate(update, bot);
    
    // Retornar sucesso (o Telegram espera uma resposta bem sucedida)
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Processa as atualizações do Telegram
 */
async function processUpdate(update: any, bot: any) {
  // Verificar se é uma mensagem
  if (update.message) {
    await processMessage(update.message, bot);
  }
  
  // Verificar se é uma callback query (botões inline)
  if (update.callback_query) {
    await processCallbackQuery(update.callback_query, bot);
  }
}

/**
 * Processa mensagens recebidas pelo bot
 */
async function processMessage(message: any, bot: any) {
  // Verifica se é um comando ou mensagem normal
  if (message.text && message.text.startsWith('/')) {
    await processCommand(message, bot);
  } else {
    // Caso seja uma mensagem normal, verifica o estado do usuário
    await processNormalMessage(message, bot);
  }
}

/**
 * Processa comandos recebidos pelo bot
 */
async function processCommand(message: any, bot: any) {
  const command = message.text.split(' ')[0].substring(1); // Remove o "/"
  const chatId = message.chat.id;
  
  // Verificar que tipo de comando foi enviado
  switch (command.toLowerCase()) {
    case 'start':
      await handleStartCommand(message, bot);
      break;
    
    case 'planos':
    case 'plans':
      await sendPlansMessage(chatId, bot);
      break;
    
    case 'ajuda':
    case 'help':
      await sendHelpMessage(chatId, bot);
      break;
    
    default:
      // Comando desconhecido
      await sendMessage(chatId, 'Comando não reconhecido. Use /start para começar ou /ajuda para ver os comandos disponíveis.', bot.token);
  }
}

/**
 * Processa o comando /start
 */
async function handleStartCommand(message: any, bot: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const user = message.from;
  
  console.log(`📱 Processando comando /start para usuário ${userId} (${user.first_name || 'desconhecido'}) no bot ${bot.name}`);
  
  try {
  // Registrar ou atualizar o usuário no banco de dados
  const { data: existingUser, error: fetchError } = await supabase
    .from('bot_users')
    .select('*')
    .eq('bot_id', bot.id)
    .eq('telegram_id', userId)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar usuário:', fetchError);
  }
  
  if (!existingUser) {
    // Criar novo usuário
      console.log(`👤 Registrando novo usuário: ${user.first_name || ''} ${user.last_name || ''} (${user.username || 'sem username'})`);
      
    const { error: insertError } = await supabase
      .from('bot_users')
      .insert({
        bot_id: bot.id,
        telegram_id: userId,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        username: user.username || null,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
        console.error('❌ Erro ao inserir usuário:', insertError);
      } else {
        console.log('✅ Usuário registrado com sucesso');
      }
    } else {
      console.log(`👤 Usuário já registrado: ${existingUser.name || 'sem nome'}`);
  }
  
    // Verificar configurações da mensagem de boas-vindas
  let welcomeMessage = bot.welcome_message || `Olá, ${user.first_name || 'usuário'}! 👋\n\nSeja bem-vindo ao ${bot.name}. Aqui você pode adquirir acesso ao nosso conteúdo exclusivo.`;
    
    console.log('📝 Mensagem de boas-vindas:', welcomeMessage.substring(0, 100) + (welcomeMessage.length > 100 ? '...' : ''));
  
  // Verificar se o bot tem mídia configurada para a mensagem de boas-vindas
  if (bot.welcome_media_url) {
      console.log('🖼️ Mídia de boas-vindas detectada:', bot.welcome_media_url);
      
      try {
    const isVideo = bot.welcome_media_url.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
    
    if (isVideo) {
      // Enviar vídeo com a mensagem de boas-vindas
          console.log('🎬 Enviando VÍDEO de boas-vindas');
      await sendVideo(chatId, bot.welcome_media_url, welcomeMessage, bot.token, { parse_mode: 'Markdown' });
    } else {
      // Enviar foto com a mensagem de boas-vindas
          console.log('📸 Enviando FOTO de boas-vindas');
      await sendPhoto(chatId, bot.welcome_media_url, welcomeMessage, bot.token, { parse_mode: 'Markdown' });
        }
        console.log('✅ Mídia de boas-vindas enviada com sucesso');
      } catch (error) {
        console.error('❌ Erro ao enviar mídia de boas-vindas:', error);
        
        // Fallback: se falhar ao enviar mídia, tenta enviar só o texto
        try {
          await sendMessage(chatId, welcomeMessage, bot.token, { parse_mode: 'Markdown' });
          console.log('⚠️ Fallback: mensagem de texto enviada sem mídia');
        } catch (textError) {
          console.error('❌ Erro crítico ao enviar mensagem de texto:', textError);
        }
    }
  } else {
    // Caso não tenha mídia, enviar apenas a mensagem de texto
      console.log('📄 Enviando apenas TEXTO de boas-vindas (sem mídia configurada)');
      
      try {
        await sendMessage(chatId, welcomeMessage, bot.token, { parse_mode: 'Markdown' });
        console.log('✅ Mensagem de texto enviada com sucesso');
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem de texto:', error);
  }
    }
    
    // Aguardar brevemente para não sobrecarregar a API do Telegram
    await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Enviar opções de planos
    console.log('📊 Enviando lista de planos disponíveis');
  await sendPlansMessage(chatId, bot);
  } catch (startCommandError) {
    console.error('❌ Erro no processamento do comando /start:', startCommandError);
    
    // Tentativa de recuperação - enviar uma mensagem genérica de erro
    try {
      await sendMessage(chatId, 
        "Desculpe, ocorreu um erro ao iniciar o bot. Por favor, tente novamente mais tarde ou entre em contato com o suporte.",
        bot.token
      );
    } catch (recoveryError) {
      console.error('❌ Erro crítico na recuperação do comando /start:', recoveryError);
    }
  }
}

/**
 * Envia a mensagem com os planos disponíveis
 */
async function sendPlansMessage(chatId: number, bot: any) {
  console.log(`📋 Preparando mensagem de planos para o bot ${bot.name}`);
  
  // Lista para armazenar todos os planos
  let allPlans: any[] = [];
  let dbSuccess = false;
  
  // 1. Tentar buscar planos do banco de dados
  try {
    console.log('🔍 Buscando planos no banco de dados');
    const { data: dbPlans, error } = await supabase
      .from('plans')
    .select('*')
    .eq('bot_id', bot.id)
    .order('price', { ascending: true });
  
  if (error) {
      console.error('❌ Erro ao buscar planos do banco:', error);
    } else if (dbPlans && dbPlans.length > 0) {
      console.log(`✅ Encontrados ${dbPlans.length} planos no banco de dados`);
      allPlans = [...dbPlans];
      dbSuccess = true;
    } else {
      console.log('⚠️ Nenhum plano encontrado no banco de dados');
    }
  } catch (dbError) {
    console.error('❌ Erro crítico ao consultar planos do banco:', dbError);
  }
  
  // 2. Verificar se o bot tem planos embutidos (como no localStorage)
  if ((!dbSuccess || allPlans.length === 0) && bot.plans && bot.plans.length > 0) {
    console.log(`📦 Usando ${bot.plans.length} planos embutidos no objeto do bot`);
    allPlans = [...bot.plans];
  }
  
  // 3. Verificar se há plano principal diretamente no objeto
  if ((!dbSuccess || allPlans.length === 0) && bot.plan_name && (bot.plan_price !== undefined || bot.plan_price !== null)) {
    console.log('📦 Criando plano principal a partir dos dados do bot');
    
    // Criar plano principal a partir dos dados do bot
    const mainPlan = {
      id: `plan_${Date.now()}_main`,
      name: bot.plan_name || 'Plano Básico',
      price: parseFloat(bot.plan_price) || 0,
      days_access: parseInt(bot.plan_days_access) || 30,
      is_active: true,
      bot_id: bot.id
    };
    
    allPlans = [mainPlan];
    
    // Adicionar planos adicionais se existirem
    if (bot.additional_plans && bot.additional_plans.length > 0) {
      allPlans = [...allPlans, ...bot.additional_plans];
      console.log(`📦 Adicionados ${bot.additional_plans.length} planos adicionais`);
    }
  }
  
  // 4. Último recurso: criar um plano padrão se nenhum plano foi encontrado
  if (!allPlans || allPlans.length === 0) {
    console.warn('⚠️ Nenhum plano encontrado, criando plano padrão');
    
    // Criar plano padrão
    const defaultPlan = {
      id: `plan_default_${Date.now()}`,
      name: 'Plano Básico',
      price: 29.90,
      days_access: 30,
      is_active: true,
      bot_id: bot.id
    };
    
    allPlans = [defaultPlan];
    
    // Tentar salvar o plano padrão no banco para uso futuro
    try {
      await supabase.from('plans').insert({
        bot_id: bot.id,
        name: defaultPlan.name,
        price: defaultPlan.price,
        days_access: defaultPlan.days_access,
        is_active: true,
        created_at: new Date().toISOString()
      });
      console.log('✅ Plano padrão criado e salvo no banco');
    } catch (saveError) {
      console.error('❌ Erro ao salvar plano padrão:', saveError);
  }
  }
  
  console.log(`📊 Total de ${allPlans.length} planos disponíveis para exibição`);
  
  // Montar a mensagem com os planos
  let plansMessage = '📊 *PLANOS DISPONÍVEIS* 📊\n\n';
  
  for (const plan of allPlans) {
    try {
      // Validar se o plano tem valores numéricos válidos
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0;
      const daysAccess = typeof plan.days_access === 'number' ? plan.days_access : 
                         (plan.period_days ? parseInt(plan.period_days) : parseInt(plan.days_access) || 30);
      
    let duration = '';
      if (daysAccess === 7) duration = '7 dias';
      else if (daysAccess === 15) duration = '15 dias';
      else if (daysAccess === 30) duration = '1 mês';
      else if (daysAccess === 90) duration = '3 meses';
      else if (daysAccess === 180) duration = '6 meses';
      else if (daysAccess === 365) duration = '1 ano';
      else if (daysAccess >= 9000) duration = 'Vitalício';
      else duration = `${daysAccess} dias`;
    
      plansMessage += `🔹 *${plan.name || 'Plano'}*\n`;
      plansMessage += `💰 Valor: R$ ${price.toFixed(2).replace('.', ',')}\n`;
    plansMessage += `⏱ Duração: ${duration}\n`;
    
    if (plan.description) {
      plansMessage += `📝 ${plan.description}\n`;
    }
    
    plansMessage += `\n`;
    } catch (planError) {
      console.error('❌ Erro ao processar plano:', planError);
      // Continuar com o próximo plano
    }
  }
  
  plansMessage += '📲 Para adquirir um plano, clique em um dos botões abaixo:';
  
  // Montar os botões inline para cada plano
  const inlineKeyboard = allPlans.map(plan => {
    try {
      const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0;
      
      return [{
        text: `${plan.name || 'Plano'} - R$ ${price.toFixed(2).replace('.', ',')}`,
    callback_data: `plan_${plan.id}`
      }];
    } catch (buttonError) {
      console.error('❌ Erro ao criar botão para plano:', buttonError);
      // Retornar um botão genérico em caso de erro
      return [{
        text: `${plan.name || 'Plano'}`,
        callback_data: `plan_${plan.id || 'unknown'}`
      }];
    }
  });

  // Opções padrão para mensagens
  const messageOptions = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };

  // Verificar se o bot tem mídia específica para os planos
  if (bot.plans_media_url && bot.plans_media_text) {
    console.log('🖼️ Usando mídia específica para os planos');
    const isVideo = bot.plans_media_url.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
    
    try {
      if (isVideo) {
        // Enviar vídeo com o texto e os planos na legenda
        await sendVideo(chatId, bot.plans_media_url, bot.plans_media_text + '\n\n' + plansMessage, bot.token, messageOptions);
      } else {
        // Enviar foto com o texto e os planos na legenda
        await sendPhoto(chatId, bot.plans_media_url, bot.plans_media_text + '\n\n' + plansMessage, bot.token, messageOptions);
      }
      console.log('✅ Mídia de planos enviada com sucesso');
      return; // Retornar se a mídia foi enviada com sucesso
    } catch (mediaError) {
      console.error('❌ Erro ao enviar mídia de planos:', mediaError);
      // Continuar para as próximas tentativas
    }
  }
  
  // Usar a mídia genérica do bot como fallback
  if (bot.media_url && bot.media_text) {
    // Usar a mídia genérica do bot
    console.log('🖼️ Usando mídia genérica do bot para os planos');
    const isVideo = bot.media_url.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
    
    try {
    if (isVideo) {
      // Enviar vídeo com o texto e os planos na legenda
      await sendVideo(chatId, bot.media_url, bot.media_text + '\n\n' + plansMessage, bot.token, messageOptions);
    } else {
      // Enviar foto com o texto e os planos na legenda
      await sendPhoto(chatId, bot.media_url, bot.media_text + '\n\n' + plansMessage, bot.token, messageOptions);
    }
      console.log('✅ Mídia genérica enviada com sucesso');
      return; // Retornar se a mídia foi enviada com sucesso
    } catch (mediaError) {
      console.error('❌ Erro ao enviar mídia genérica:', mediaError);
      // Continuar para texto simples como última opção
    }
  }
  
  // Fallback final: Enviar apenas a mensagem de texto
  console.log('📄 Enviando mensagem de planos apenas como texto (sem mídia ou após falhas)');
  try {
    await sendMessage(chatId, plansMessage, bot.token, messageOptions);
    console.log('✅ Mensagem de planos enviada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de planos:', error);
    
    // Última tentativa: enviar mensagem simples sem botões
    try {
      const simplifiedMessage = '📊 *PLANOS DISPONÍVEIS* 📊\n\n' + 
        'Desculpe, ocorreu um erro ao exibir os planos detalhados.\n' +
        'Por favor, entre em contato com o suporte para mais informações.';
      
      await sendMessage(chatId, simplifiedMessage, bot.token, { parse_mode: 'Markdown' });
      console.log('⚠️ Mensagem simplificada enviada após erros');
    } catch (finalError) {
      console.error('❌ Erro crítico ao enviar qualquer mensagem:', finalError);
    }
  }
}

/**
 * Envia a mensagem de ajuda
 */
async function sendHelpMessage(chatId: number, bot: any) {
  const helpMessage = `
📌 *COMANDOS DISPONÍVEIS* 📌

/start - Iniciar o bot
/planos - Ver os planos disponíveis
/ajuda - Exibir esta mensagem de ajuda
/status - Verificar o status da sua assinatura

Precisa de ajuda? Entre em contato com o suporte.
  `;
  
  await sendMessage(chatId, helpMessage, bot.token, {
    parse_mode: 'Markdown'
  });
}

/**
 * Processa mensagens normais (não comandos)
 */
async function processNormalMessage(message: any, bot: any) {
  // Implementação básica, apenas responde com uma mensagem padrão
  const chatId = message.chat.id;
  
  await sendMessage(
    chatId, 
    'Para ver os comandos disponíveis, envie /ajuda ou para ver os planos disponíveis, envie /planos.',
    bot.token
  );
}

/**
 * Processa callback queries (botões inline)
 */
async function processCallbackQuery(callbackQuery: any, bot: any) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  
  // Responder à callback query para remover o "carregando" no botão
  await answerCallbackQuery(callbackQuery.id, bot.token);
  
  // Verificar o tipo de callback
  if (data.startsWith('plan_')) {
    const planId = data.replace('plan_', '');
    await handlePlanSelection(chatId, userId, planId, bot);
  }
}

/**
 * Processa a seleção de um plano
 */
async function handlePlanSelection(chatId: number, userId: number, planId: string, bot: any) {
  // Buscar informações do plano
  const { data: plan, error } = await supabase
    .from('bot_plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (error || !plan) {
    console.error('Erro ao buscar plano:', error);
    await sendMessage(chatId, 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.', bot.token);
    return;
  }
  
  // Verificar se já tem algum pagamento pendente para este plano
  const { data: existingPayment, error: paymentError } = await supabase
    .from('bot_payments')
    .select('*')
    .eq('bot_id', bot.id)
    .eq('telegram_user_id', userId)
    .eq('plan_id', planId)
    .eq('status', 'pending')
    .single();
  
  if (existingPayment) {
    // Já existe um pagamento pendente, enviar as instruções novamente
    await sendPaymentInstructions(chatId, existingPayment, plan, bot);
    return;
  }
  
  // Criar um novo pagamento
  const paymentId = generateRandomId();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora
  
  const { data: payment, error: insertError } = await supabase
    .from('bot_payments')
    .insert({
      id: paymentId,
      bot_id: bot.id,
      plan_id: planId,
      telegram_user_id: userId,
      amount: plan.price,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();
  
  if (insertError || !payment) {
    console.error('Erro ao criar pagamento:', insertError);
    await sendMessage(chatId, 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.', bot.token);
    return;
  }
  
  // Enviar instruções de pagamento
  await sendPaymentInstructions(chatId, payment, plan, bot);
}

/**
 * Envia instruções de pagamento para o usuário
 */
async function sendPaymentInstructions(chatId: number, payment: any, plan: any, bot: any) {
  // No mundo real, isso geraria um QR code de PIX ou um link de pagamento
  // Para este exemplo, vamos apenas enviar uma mensagem com instruções fictícias
  
  const paymentMessage = `
🛒 *PEDIDO #${payment.id.substring(0, 8)}*

Você selecionou o plano *${plan.name}*.
Valor: R$ ${plan.price.toFixed(2).replace('.', ',')}

Para finalizar seu pagamento, siga as instruções abaixo:

📱 *PAGAMENTO VIA PIX*
1. Abra o app do seu banco
2. Escaneie o QR Code abaixo ou copie a chave PIX
3. Confirme o pagamento de R$ ${plan.price.toFixed(2).replace('.', ',')}
4. Envie o comprovante para este chat

⚠️ Este pagamento expira em 1 hora. Após o pagamento, seu acesso será liberado em até 5 minutos.

🔑 *CHAVE PIX:* \`${bot.pix_key || '00000000000'}\`
📝 *DESCRIÇÃO:* \`Pagamento #${payment.id.substring(0, 8)}\`
  `;
  
  // Opções para os botões de callback
  const messageOptions = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Já Paguei ✅', callback_data: `paid_${payment.id}` }],
        [{ text: 'Cancelar Pedido ❌', callback_data: `cancel_${payment.id}` }]
      ]
    }
  };

  // Verificar se o bot tem mídia configurada para pagamentos
  if (bot.payment_media_url) {
    const isVideo = bot.payment_media_url.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
    
    if (isVideo) {
      // Enviar vídeo com as instruções de pagamento
      await sendVideo(chatId, bot.payment_media_url, paymentMessage, bot.token, messageOptions);
    } else {
      // Enviar foto com as instruções de pagamento
      await sendPhoto(chatId, bot.payment_media_url, paymentMessage, bot.token, messageOptions);
    }
  } else {
    // Caso não tenha mídia, enviar apenas a mensagem de texto
    await sendMessage(chatId, paymentMessage, bot.token, messageOptions);
  }
}

/**
 * Função para enviar mensagens para o Telegram
 */
async function sendMessage(chatId: number, text: string, token: string, options: any = {}) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao enviar mensagem:', data);
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}

/**
 * Função para enviar fotos com texto para o Telegram
 */
async function sendPhoto(chatId: number, photo: string, caption: string, token: string, options: any = {}) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo, // URL da foto ou file_id
        caption, // Texto da legenda
        parse_mode: options.parse_mode || 'Markdown',
        ...options
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao enviar foto:', data);
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao enviar foto:', error);
    throw error;
  }
}

/**
 * Função para enviar vídeos com texto para o Telegram
 */
async function sendVideo(chatId: number, video: string, caption: string, token: string, options: any = {}) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendVideo`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        video, // URL do vídeo ou file_id
        caption, // Texto da legenda
        parse_mode: options.parse_mode || 'Markdown',
        ...options
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao enviar vídeo:', data);
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao enviar vídeo:', error);
    throw error;
  }
}

/**
 * Função para responder a uma callback query
 */
async function answerCallbackQuery(callbackQueryId: string, token: string, options: any = {}) {
  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...options
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao responder callback query:', data);
      throw new Error(`Telegram API error: ${data.description}`);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao responder callback query:', error);
    throw error;
  }
}

/**
 * Função para gerar um ID aleatório para pagamentos
 */
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
} 