import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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

// Função para extrair ID do grupo de um link
function extractGroupIdFromLink(link: string): string | null {
  // Formatos de link possíveis:
  // https://t.me/+ABC123...
  // https://t.me/joinchat/ABC123...
  // https://t.me/groupname
  // t.me/+ABC123...
  // Também aceita IDs diretos: -100123456789

  const cleanLink = link.trim();

  // Se já é um ID direto (negativo para grupos)
  if (/^-?\d+$/.test(cleanLink)) {
    return cleanLink;
  }

  // Extrair de links de convite
  const inviteMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]+)/);
  if (inviteMatch) {
    return inviteMatch[1]; // Retorna o hash do convite
  }

  // Para grupos públicos (@username) - incluindo links com @
  if (cleanLink.startsWith('@')) {
    return cleanLink;
  }
  
  const usernameMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z0-9_]+)/);
  if (usernameMatch) {
    return `@${usernameMatch[1]}`;
  }

  return null;
}

// Função para validar grupo via API do Telegram
async function validateGroupWithBot(botToken: string, groupIdentifier: string): Promise<{
  success: boolean;
  group?: GroupInfo;
  botMember?: BotMember;
  error?: string;
}> {
  try {
    console.log(`🔍 Validando grupo ${groupIdentifier} com bot`);

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
        return {
          success: false,
          error: `Não foi possível acessar o grupo: ${chatResult.description || 'Erro desconhecido'}`
        };
      }
      
      chatInfo = chatResult.result;
      console.log(`✅ Informações do grupo obtidas: ${chatInfo.title}`);
    } catch (error) {
      console.error('❌ Erro na requisição getChat:', error);
      return {
        success: false,
        error: 'Erro ao conectar com API do Telegram'
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
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
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
    const body = await request.json();
    const { botId, groupLink } = body;

    if (!botId || !groupLink) {
      return NextResponse.json({
        success: false,
        error: 'Bot ID e link/ID do grupo são obrigatórios'
      }, { status: 400 });
    }

    console.log(`🔄 Iniciando ativação automática para bot ${botId} com grupo ${groupLink}`);

    const cookieStore = cookies();
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Buscar dados do bot
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id, name, token, owner_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    // 2. Extrair ID do grupo do link
    const groupIdentifier = extractGroupIdFromLink(groupLink);
    if (!groupIdentifier) {
      return NextResponse.json({
        success: false,
        error: 'Link ou ID do grupo inválido. Use um link do Telegram válido ou ID do grupo.'
      }, { status: 400 });
    }

    console.log(`🔍 ID/identificador extraído: ${groupIdentifier}`);

    // 3. Validar grupo e permissões do bot
    const validation = await validateGroupWithBot(bot.token, groupIdentifier);
    
    if (!validation.success) {
      // Salvar erro de tentativa
      await supabaseClient
        .from('bots')
        .update({
          auto_activation_attempted_at: new Date().toISOString(),
          auto_activation_error: validation.error,
          group_link: groupLink,
          group_id_telegram: groupIdentifier
        })
        .eq('id', botId);

      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    const { group, botMember } = validation;

    if (!group) {
      return NextResponse.json({
        success: false,
        error: 'Erro interno: dados do grupo não disponíveis'
      }, { status: 500 });
    }

    console.log(`✅ Grupo validado: ${group.title} (ID: ${group.id})`);

    // 4. Salvar/atualizar informações do grupo
    const groupData = {
      name: group.title,
      telegram_id: group.id.toString(),
      bot_id: botId,
      description: group.description || '',
      is_active: true,
      is_vip: true,
      link: groupLink,
      bot_is_admin: true,
      admin_permissions: botMember || null,
      validated_at: new Date().toISOString()
    };

    // Verificar se o grupo já existe
    const { data: existingGroup, error: groupCheckError } = await supabaseClient
      .from('groups')
      .select('id')
      .eq('telegram_id', group.id.toString())
      .eq('bot_id', botId)
      .single();

    let groupResult;
    if (existingGroup) {
      // Atualizar grupo existente
      const { data: updatedGroup, error: updateError } = await supabaseClient
        .from('groups')
        .update(groupData)
        .eq('id', existingGroup.id)
        .select()
        .single();
      
      groupResult = { data: updatedGroup, error: updateError };
    } else {
      // Criar novo grupo
      const { data: newGroup, error: insertError } = await supabaseClient
        .from('groups')
        .insert(groupData)
        .select()
        .single();
      
      groupResult = { data: newGroup, error: insertError };
    }

    if (groupResult.error) {
      console.error('❌ Erro ao salvar grupo:', groupResult.error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao salvar informações do grupo'
      }, { status: 500 });
    }

    // 5. Ativar o bot
    const { error: botUpdateError } = await supabaseClient
      .from('bots')
      .update({
        is_activated: true,
        auto_activated: true,
        activated_at: new Date().toISOString(),
        activated_by_telegram_id: group.id.toString(),
        activated_in_chat_id: group.id,
        group_link: groupLink,
        group_id_telegram: group.id.toString(),
        auto_activation_attempted_at: new Date().toISOString(),
        auto_activation_error: null,
        status: 'active'
      })
      .eq('id', botId);

    if (botUpdateError) {
      console.error('❌ Erro ao ativar bot:', botUpdateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao ativar bot'
      }, { status: 500 });
    }

    // 6. Enviar mensagem de boas-vindas no grupo
    const welcomeSent = await sendWelcomeMessage(bot.token, group.id, botId);

    console.log(`🎉 Bot ${bot.name} ativado com sucesso no grupo ${group.title}!`);

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
    console.error('❌ Erro geral na ativação automática:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 