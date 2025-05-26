import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('👥 Iniciando adição de usuário ao grupo');

    const body = await request.json();
    const { user_telegram_id, group_id, bot_token } = body;

    // Validação básica
    if (!user_telegram_id || !group_id || !bot_token) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios: user_telegram_id, group_id, bot_token'
      }, { status: 400 });
    }

    console.log(`👤 Adicionando usuário ${user_telegram_id} ao grupo ${group_id}`);

    // Extrair chat_id do grupo (caso seja um link)
    let chatId = group_id;
    
    // Se é um link do Telegram, extrair o identificador
    if (typeof group_id === 'string') {
      if (group_id.includes('t.me/+') || group_id.includes('telegram.me/+')) {
        // Link de convite privado - não podemos adicionar diretamente
        console.log('🔗 Grupo privado detectado, enviando link de convite');
        return await sendInviteLink(user_telegram_id, group_id, bot_token);
      } else if (group_id.includes('t.me/') || group_id.includes('telegram.me/')) {
        // Grupo público
        const parts = group_id.includes('t.me/') ? group_id.split('t.me/') : group_id.split('telegram.me/');
        if (parts.length > 1) {
          chatId = '@' + parts[1].split('/')[0].split('?')[0];
        }
      } else if (group_id.startsWith('@')) {
        chatId = group_id;
      } else if (!group_id.startsWith('-')) {
        chatId = '@' + group_id;
      }
    }

    console.log(`📍 Chat ID final: ${chatId}`);

    // Método 1: Tentar adicionar usuário diretamente
    try {
      const addMemberUrl = `https://api.telegram.org/bot${bot_token}/addChatMember`;
      const addResponse = await fetch(addMemberUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: user_telegram_id
        }),
      });

      const addData = await addResponse.json();

      if (addResponse.ok && addData.ok) {
        console.log('✅ Usuário adicionado diretamente ao grupo');
        
        // Enviar mensagem de boas-vindas
        await sendWelcomeMessage(user_telegram_id, bot_token, chatId);
        
        return NextResponse.json({
          success: true,
          method: 'direct_add',
          message: 'Usuário adicionado diretamente ao grupo'
        });
      } else {
        console.log('⚠️ Não foi possível adicionar diretamente:', addData.description);
        
        // Se falhou, tentar método alternativo
        return await sendInviteLink(user_telegram_id, chatId, bot_token);
      }
    } catch (directError) {
      console.error('❌ Erro na adição direta:', directError);
      
      // Fallback para link de convite
      return await sendInviteLink(user_telegram_id, chatId, bot_token);
    }

  } catch (error: any) {
    console.error('❌ Erro geral ao adicionar usuário ao grupo:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * Envia link de convite para o usuário
 */
async function sendInviteLink(user_telegram_id: string, group_id: string, bot_token: string) {
  try {
    console.log('🔗 Enviando link de convite personalizado');

    // Tentar criar link de convite único
    let inviteLink = null;
    
    try {
      const createInviteUrl = `https://api.telegram.org/bot${bot_token}/createChatInviteLink`;
      const inviteResponse = await fetch(createInviteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: group_id,
          member_limit: 1, // Limite de 1 uso
          expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Expira em 24 horas
          name: `Acesso VIP - ${new Date().toLocaleDateString('pt-BR')}`
        }),
      });

      const inviteData = await inviteResponse.json();

      if (inviteResponse.ok && inviteData.ok) {
        inviteLink = inviteData.result.invite_link;
        console.log('✅ Link de convite criado:', inviteLink);
      } else {
        console.warn('⚠️ Não foi possível criar link personalizado:', inviteData.description);
        // Usar o grupo_id original se for um link
        if (typeof group_id === 'string' && group_id.includes('t.me')) {
          inviteLink = group_id;
        }
      }
    } catch (inviteError) {
      console.error('❌ Erro ao criar link de convite:', inviteError);
      
      // Fallback para link original
      if (typeof group_id === 'string' && group_id.includes('t.me')) {
        inviteLink = group_id;
      }
    }

    // Enviar mensagem com link
    const message = `🎉 *ACESSO LIBERADO* 🎉

Seu pagamento foi confirmado! Agora você pode acessar nosso grupo VIP.

${inviteLink ? `👇 Clique no link abaixo para entrar:` : '⚠️ Entre em contato para receber o link de acesso.'}`;

    const sendMessageUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
    const messageData: any = {
      chat_id: user_telegram_id,
      text: message,
      parse_mode: 'Markdown',
    };

    // Adicionar botão se há link
    if (inviteLink) {
      messageData.reply_markup = {
        inline_keyboard: [[
          {
            text: '👉 Entrar no Grupo VIP 👈',
            url: inviteLink
          }
        ]]
      };
    }

    const messageResponse = await fetch(sendMessageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });

    if (messageResponse.ok) {
      console.log('✅ Link de convite enviado com sucesso');
      return NextResponse.json({
        success: true,
        method: 'invite_link',
        message: 'Link de convite enviado ao usuário',
        invite_link: inviteLink
      });
    } else {
      const errorData = await messageResponse.json();
      console.error('❌ Erro ao enviar link:', errorData);
      return NextResponse.json({
        success: false,
        error: 'Erro ao enviar link de convite'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Erro ao enviar link de convite:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar link de convite'
    }, { status: 500 });
  }
}

/**
 * Envia mensagem de boas-vindas após adicionar ao grupo
 */
async function sendWelcomeMessage(user_telegram_id: string, bot_token: string, group_id: string) {
  try {
    const welcomeMessage = `🎉 Bem-vindo ao grupo VIP!

Parabéns por adquirir nosso plano! Aqui você terá acesso a conteúdo exclusivo.

Se tiver dúvidas, entre em contato com nossa equipe.`;

    const sendMessageUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
    
    await fetch(sendMessageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user_telegram_id,
        text: welcomeMessage,
        parse_mode: 'Markdown',
      }),
    });

    console.log('✅ Mensagem de boas-vindas enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar boas-vindas:', error);
  }
} 