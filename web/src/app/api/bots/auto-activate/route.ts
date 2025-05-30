import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

interface GroupInfo {
  id: number;
  title: string;
  type: string;
  description?: string;
  invite_link?: string;
  member_count?: number;
  permissions?: any;
}

interface BotMember {
  user: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  status: string;
  can_be_edited?: boolean;
  can_manage_chat?: boolean;
  can_change_info?: boolean;
  can_delete_messages?: boolean;
  can_invite_users?: boolean;
  can_restrict_members?: boolean;
  can_pin_messages?: boolean;
  can_promote_members?: boolean;
  can_manage_video_chats?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
}

// Função para testar se o token do bot está funcionando
async function testBotToken(botToken: string): Promise<{
  success: boolean;
  error?: string;
  botInfo?: any;
}> {
  try {
    console.log('🧪 Testando token do bot...');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error('❌ Token inválido:', result);
      return {
        success: false,
        error: `Token do bot inválido: ${result.description || 'Token malformado ou expirado'}`
      };
    }
    
    console.log('✅ Token válido! Bot:', result.result.first_name, result.result.username);
    return {
      success: true,
      botInfo: result.result
    };
    
  } catch (error) {
    console.error('❌ Erro ao testar token:', error);
    return {
      success: false,
      error: 'Erro de conectividade ao testar token do bot'
    };
  }
}

// Função para extrair ID do grupo de um link
function extractGroupIdFromLink(link: string): { identifier: string | null; isInviteLink: boolean; linkType: string } {
  // Formatos de link possíveis:
  // https://t.me/+ABC123... (convite privado)
  // https://t.me/joinchat/ABC123... (convite privado antigo)
  // https://t.me/groupname (grupo público)
  // t.me/+ABC123...
  // ID direto: -100123456789

  const cleanLink = link.trim();

  // Se já é um ID direto (negativo para grupos)
  if (/^-?\d+$/.test(cleanLink)) {
    return { identifier: cleanLink, isInviteLink: false, linkType: 'direct_id' };
  }

  // Links de convite privados (+ ou joinchat)
  const inviteMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]+)/);
  if (inviteMatch) {
    return { identifier: inviteMatch[1], isInviteLink: true, linkType: 'private_invite' };
  }

  // Para grupos públicos (@username) - incluindo links com @
  if (cleanLink.startsWith('@')) {
    return { identifier: cleanLink, isInviteLink: false, linkType: 'username' };
  }
  
  const usernameMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z0-9_]+)/);
  if (usernameMatch) {
    return { identifier: `@${usernameMatch[1]}`, isInviteLink: false, linkType: 'username' };
  }

  return { identifier: null, isInviteLink: false, linkType: 'invalid' };
}

// Função para validar grupo via API do Telegram
async function validateGroupWithBot(botToken: string, groupIdentifier: string, isInviteLink: boolean, linkType: string): Promise<{
  success: boolean;
  group?: GroupInfo;
  botMember?: BotMember;
  error?: string;
}> {
  try {
    console.log(`🔍 Validando grupo ${groupIdentifier} (tipo: ${linkType}) com bot`);

    // Para links de convite privados, não podemos validar diretamente
    if (isInviteLink) {
      return {
        success: false,
        error: `❌ Links de convite privados não são suportados!\n\n📝 **Como resolver:**\n\n1. **Adicione o bot ao grupo manualmente**\n2. **Use um grupo público** (com @username)\n3. **Ou forneça o ID do grupo diretamente**\n\n💡 **Para obter o ID do grupo:**\n- Adicione @userinfobot ao seu grupo\n- Ele mostrará o ID (ex: -100123456789)\n- Use esse ID no campo acima\n\n⚠️ **Importante:** O bot deve estar no grupo como administrador antes da ativação!`
      };
    }

    // 1. Tentar obter informações do grupo
    let chatInfo: any;
    try {
      const chatUrl = `https://api.telegram.org/bot${botToken}/getChat`;
      const chatResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: groupIdentifier })
      });
      
      const chatResult = await chatResponse.json();
      
      if (!chatResult.ok) {
        console.error('❌ Erro ao obter informações do grupo:', chatResult);
        
        // Dar instruções específicas baseadas no tipo de erro
        let errorMessage = `Não foi possível acessar o grupo: ${chatResult.description || 'Erro desconhecido'}`;
        
        if (chatResult.description?.includes('chat not found')) {
          errorMessage = `❌ Grupo não encontrado!\n\n📝 **Possíveis causas:**\n\n1. **Bot não está no grupo** - Adicione o bot ao grupo primeiro\n2. **ID do grupo incorreto** - Verifique se o ID está correto\n3. **Grupo é privado** - Use o ID numérico do grupo\n\n💡 **Para grupos privados:**\n- Adicione @userinfobot ao grupo\n- Copie o ID (ex: -100123456789)\n- Use esse ID no campo acima`;
        } else if (chatResult.description?.includes('Forbidden')) {
          errorMessage = `❌ Bot não tem permissão para acessar o grupo!\n\n📝 **Como resolver:**\n\n1. **Adicione o bot ao grupo**\n2. **Torne o bot administrador**\n3. **Certifique-se que o bot não foi removido**`;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      chatInfo = chatResult.result;
      console.log(`✅ Informações do grupo obtidas: ${chatInfo.title}`);
    } catch (error) {
      console.error('❌ Erro na requisição getChat:', error);
      return {
        success: false,
        error: 'Erro ao conectar com API do Telegram. Verifique sua conexão.'
      };
    }

    // 2. Verificar se o bot está no grupo e suas permissões
    let botMember: BotMember | undefined;
    try {
      const memberUrl = `https://api.telegram.org/bot${botToken}/getChatMember`;
      const memberResponse = await fetch(memberUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: groupIdentifier,
          user_id: botToken.split(':')[0] // Extrair bot ID do token
        })
      });
      
      const memberResult = await memberResponse.json();
      
      if (!memberResult.ok) {
        console.error('❌ Bot não encontrado no grupo:', memberResult);
        return {
          success: false,
          error: `Bot não está no grupo ou não tem permissões: ${memberResult.description || 'Erro desconhecido'}`
        };
      }
      
      botMember = memberResult.result;
      
      if (!botMember) {
        return {
          success: false,
          error: 'Erro ao obter informações do bot no grupo'
        };
      }
      
      console.log(`✅ Bot encontrado no grupo com status: ${botMember.status}`);
      
      // Verificar se o bot é administrador
      if (botMember.status !== 'administrator') {
        return {
          success: false,
          error: `Bot precisa ser administrador do grupo. Status atual: ${botMember.status}`
        };
      }
      
    } catch (error) {
      console.error('❌ Erro na requisição getChatMember:', error);
      return {
        success: false,
        error: 'Erro ao verificar permissões do bot'
      };
    }

    // 3. Validar tipo de grupo
    if (chatInfo.type !== 'group' && chatInfo.type !== 'supergroup') {
      return {
        success: false,
        error: `Tipo de chat inválido: ${chatInfo.type}. Apenas grupos são suportados.`
      };
    }

    // 4. Retornar informações validadas
    const group: GroupInfo = {
      id: chatInfo.id,
      title: chatInfo.title,
      type: chatInfo.type,
      description: chatInfo.description,
      invite_link: chatInfo.invite_link,
      member_count: chatInfo.member_count || 0
    };

    return {
      success: true,
      group,
      botMember
    };

  } catch (error) {
    console.error('❌ Erro geral na validação:', error);
    return {
      success: false,
      error: `Erro interno: ${error}`
    };
  }
}

// Função para enviar mensagem de boas-vindas
async function sendWelcomeMessage(botToken: string, chatId: number, botId: string): Promise<boolean> {
  try {
    console.log(`📤 Enviando mensagem de boas-vindas para grupo ${chatId}`);
    
    // Buscar dados do bot no Supabase
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient();
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('name, welcome_message, welcome_media_url, welcome_media_type')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ Erro ao buscar dados do bot:', botError);
      return false;
    }

    // Buscar planos
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('id, name, price')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (plansError) {
      console.error('❌ Erro ao buscar planos:', plansError);
      return false;
    }

    // Enviar mídia primeiro (se configurada)
    if (bot.welcome_media_url) {
      try {
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
        
        const mediaUrl = `https://api.telegram.org/bot${botToken}/${mediaMethod}`;
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
        if (mediaResult.ok) {
          console.log(`✅ Mídia de boas-vindas enviada`);
        }
      } catch (mediaError) {
        console.warn(`⚠️ Erro ao enviar mídia: ${mediaError}`);
      }
    }

    // Criar mensagem de boas-vindas
    let welcomeMessage = bot.welcome_message || `🤖 **${bot.name} está ativo!**\n\nOlá! Agora vocês podem usar nossos planos:`;

    // Adicionar planos se existirem
    if (plans && plans.length > 0) {
      welcomeMessage += '\n\n💎 **Planos disponíveis:**\n';
      plans.forEach((plan, index) => {
        welcomeMessage += `${index + 1}. **${plan.name}** - R$ ${plan.price.toFixed(2).replace('.', ',')}\n`;
      });
      welcomeMessage += '\n📲 Use o comando /start em conversa privada para comprar!';
    }

    // Enviar mensagem de texto
    const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const messageResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: 'Markdown'
      })
    });

    const messageResult = await messageResponse.json();
    
    if (messageResult.ok) {
      console.log(`✅ Mensagem de boas-vindas enviada com sucesso`);
      return true;
    } else {
      console.error('❌ Erro ao enviar mensagem:', messageResult);
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de boas-vindas:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 === INÍCIO DA ATIVAÇÃO AUTOMÁTICA ===');
    
    const body = await request.json();
    const { botId, groupLink } = body;

    console.log('📥 Dados recebidos:', { botId, groupLink });

    if (!botId || !groupLink) {
      console.log('❌ Dados obrigatórios faltando');
      return NextResponse.json({
        success: false,
        error: 'Bot ID e link/ID do grupo são obrigatórios'
      }, { status: 400 });
    }

    console.log(`🔄 Iniciando ativação automática para bot ${botId} com grupo ${groupLink}`);

    // Criar cliente Supabase de forma mais robusta
    const cookieStore = await cookies();
    
    // Tentar múltiplas formas de criar o cliente
    let supabaseClient;
    let user;
    
    try {
      supabaseClient = createSupabaseServerClient();
      
      // Verificar se o usuário está autenticado
      console.log('🔐 Verificando autenticação do usuário...');
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError) {
        console.error('❌ Erro de autenticação:', authError.message);
        throw new Error('Auth session missing!');
      }
      
      if (!authUser) {
        console.error('❌ Usuário não encontrado na sessão');
        throw new Error('User not found in session!');
      }
      
      user = authUser;
      console.log('✅ Usuário autenticado:', { id: user.id, email: user.email });
      
    } catch (authError: any) {
      console.error('❌ Erro na autenticação:', authError.message);
      
      // Tentar obter dados do header Authorization como fallback
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        console.log('🔄 Tentando autenticação via header...');
        const token = authHeader.substring(7);
        
        // Criar cliente com token direto
        const { createClient } = await import('@supabase/supabase-js');
        supabaseClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            },
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );
        
        const { data: { user: headerUser }, error: headerError } = await supabaseClient.auth.getUser();
        if (headerError || !headerUser) {
          throw new Error('Invalid token in header');
        }
        user = headerUser;
        console.log('✅ Usuário autenticado via header:', { id: user.id, email: user.email });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Usuário não autenticado. Faça login novamente.'
        }, { status: 401 });
      }
    }

    // 1. Buscar dados do bot com verificação de propriedade
    console.log('🔍 Buscando dados do bot...');
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id, name, token, owner_id')
      .eq('id', botId)
      .eq('owner_id', user.id) // Verificar se o bot pertence ao usuário autenticado
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado ou sem permissão:', botError?.message || 'Sem erro específico');
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado ou você não tem permissão para ativá-lo'
      }, { status: 404 });
    }

    console.log('✅ Bot encontrado:', { id: bot.id, name: bot.name, owner: bot.owner_id });

    // 2. Extrair ID do grupo do link
    console.log('🔍 Extraindo ID do grupo...');
    const linkInfo = extractGroupIdFromLink(groupLink);
    if (!linkInfo.identifier) {
      console.log('❌ Link inválido:', linkInfo);
      return NextResponse.json({
        success: false,
        error: 'Link ou ID do grupo inválido. Use um link do Telegram válido ou ID do grupo.'
      }, { status: 400 });
    }

    console.log(`✅ ID/identificador extraído: ${linkInfo.identifier} (tipo: ${linkInfo.linkType})`);

    // 3. Testar token do bot primeiro
    console.log('🧪 Testando token do bot...');
    const tokenTest = await testBotToken(bot.token);
    
    if (!tokenTest.success) {
      console.error('❌ Token do bot falhou no teste:', tokenTest.error);
      
      // Salvar erro de token
      try {
        await supabaseClient
          .from('bots')
          .update({
            auto_activation_attempted_at: new Date().toISOString(),
            auto_activation_error: tokenTest.error,
            group_link: groupLink,
            group_id_telegram: linkInfo.identifier
          })
          .eq('id', botId);
        console.log('📝 Erro de token salvo no banco');
      } catch (saveError) {
        console.error('❌ Erro ao salvar tentativa:', saveError);
      }

      return NextResponse.json({
        success: false,
        error: tokenTest.error
      }, { status: 400 });
    }

    console.log('✅ Token do bot validado com sucesso');

    // 4. Validar grupo e permissões do bot
    console.log('🔍 Validando grupo e permissões...');
    const validation = await validateGroupWithBot(bot.token, linkInfo.identifier, linkInfo.isInviteLink, linkInfo.linkType);
    
    if (!validation.success) {
      console.error('❌ Validação falhou:', validation.error);
      
      // Salvar erro de tentativa
      try {
        await supabaseClient
          .from('bots')
          .update({
            auto_activation_attempted_at: new Date().toISOString(),
            auto_activation_error: validation.error,
            group_link: groupLink,
            group_id_telegram: linkInfo.identifier
          })
          .eq('id', botId);
        console.log('📝 Erro de tentativa salvo no banco');
      } catch (saveError) {
        console.error('❌ Erro ao salvar tentativa:', saveError);
      }

      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    const { group, botMember } = validation;

    if (!group) {
      console.error('❌ Dados do grupo não disponíveis');
      return NextResponse.json({
        success: false,
        error: 'Erro interno: dados do grupo não disponíveis'
      }, { status: 500 });
    }

    console.log(`✅ Grupo validado: ${group.title} (ID: ${group.id})`);

    // 5. PULAR SALVAMENTO DE GRUPO TEMPORARIAMENTE PARA DEBUG
    console.log('⚠️ Pulando salvamento de grupo temporariamente...');

    // 6. Ativar o bot - MÉTODO ULTRA SIMPLIFICADO  
    console.log('🔓 Ativando o bot...');
    
    try {
      // Operação única: apenas ativar o bot
      console.log('📝 Atualizando status do bot...');
      const { error: activationError } = await supabaseClient
        .from('bots')
        .update({
          is_activated: true,
          activated_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', botId)
        .eq('owner_id', user.id); // Filtro adicional de segurança

      if (activationError) {
        console.error('❌ Erro na ativação:', activationError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao ativar bot: ' + activationError.message,
          details: activationError
        }, { status: 500 });
      }

      console.log('✅ Bot ativado com sucesso!');

    } catch (generalError: any) {
      console.error('❌ Erro geral na ativação:', generalError);
      console.error('Stack trace:', generalError.stack);
      return NextResponse.json({
        success: false,
        error: 'Erro crítico ao ativar bot: ' + generalError.message
      }, { status: 500 });
    }

    // 7. Configurar webhook automaticamente
    console.log('🔧 Configurando webhook...');
    try {
      const host = request.headers.get('host') || 'localhost:3025';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = process.env.WEBHOOK_URL || `${protocol}://${host}`;
      const webhookUrl = `${baseUrl}/api/telegram/webhook?token=${bot.token}`;
      
      console.log(`📡 URL do webhook: ${webhookUrl}`);
      
      const telegramUrl = `https://api.telegram.org/bot${bot.token}/setWebhook`;
      const webhookResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query', 'inline_query'],
          drop_pending_updates: true
        })
      });

      const webhookResult = await webhookResponse.json();
      
      if (webhookResult.ok) {
        console.log('✅ Webhook configurado com sucesso');
        
        // Atualizar bot com informações do webhook
        try {
          await supabaseClient
            .from('bots')
            .update({
              webhook_url: webhookUrl,
              webhook_set_at: new Date().toISOString()
            })
            .eq('id', botId);
          console.log('✅ Dados do webhook salvos no banco');
        } catch (updateError) {
          console.warn('⚠️ Erro ao salvar webhook no banco:', updateError);
        }
      } else {
        console.error('❌ Erro ao configurar webhook:', webhookResult);
      }
    } catch (webhookError) {
      console.error('❌ Erro ao configurar webhook:', webhookError);
      // Continuar mesmo se webhook falhar - bot já está ativado
    }

    // 8. Enviar mensagem de boas-vindas no grupo  
    console.log('📤 Enviando mensagem de boas-vindas...');
    const welcomeSent = await sendWelcomeMessage(bot.token, group.id, botId);

    console.log(`🎉 Bot ${bot.name} ativado com sucesso no grupo ${group.title}!`);
    console.log('🚀 === FIM DA ATIVAÇÃO AUTOMÁTICA ===');

    return NextResponse.json({
      success: true,
      message: 'Bot ativado com sucesso!',
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          is_activated: true,
          auto_activated: true
        },
        group: {
          id: group.id,
          title: group.title,
          type: group.type,
          member_count: group.member_count
        },
        welcome_message_sent: welcomeSent
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO GERAL na ativação automática:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido')
    }, { status: 500 });
  }
} 
