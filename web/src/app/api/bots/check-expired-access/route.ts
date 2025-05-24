import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Endpoint para verificar e remover acessos expirados
 * Este endpoint deve ser chamado por um cron job uma vez por dia
 * Remove usuários de grupos que tiveram o acesso expirado há mais de 3 dias
 */
export async function POST(request: Request) {
  try {
    // Verificar se a requisição tem a chave de API correta
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }
    
    // Calcular a data de 3 dias atrás
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    // Buscar acessos que expiraram há mais de 3 dias e ainda estão marcados como ativos
    const { data: expiredAccess, error: accessError } = await supabase
      .from('bot_user_access')
      .select(`
        id,
        user_id,
        group_id,
        bot_id,
        expires_at,
        status,
        bot_users:bot_users(telegram_id),
        bot_groups:bot_groups(chat_id, invite_link),
        bots:bots(token)
      `)
      .eq('status', 'active')
      .lt('expires_at', threeDaysAgo.toISOString());
    
    if (accessError) {
      throw new Error(`Erro ao buscar acessos expirados: ${accessError.message}`);
    }
    
    if (!expiredAccess || expiredAccess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum acesso expirado para processar'
      });
    }
    
    // Processar cada acesso expirado
    const results = await Promise.all(
      expiredAccess.map(async (access) => {
        try {
          // 1. Enviar mensagem para o usuário informando que foi removido
          const token = (access.bots as any).token;
          const chatId = (access.bot_users as any).telegram_id;
          const groupName = (access.bot_groups as any).invite_link.split('/').pop();
          
          const message = `⚠️ *ACESSO EXPIRADO* ⚠️\n\nOlá! Seu acesso ao grupo "${groupName}" expirou há mais de 3 dias. Você foi removido do grupo.\n\nPara obter acesso novamente, por favor, adquira um novo plano enviando /planos.`;
          
          // Enviar mensagem de notificação
          await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
              }),
            }
          );
          
          // 2. Remover o usuário do grupo
          await fetch(
            `https://api.telegram.org/bot${token}/banChatMember`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: (access.bot_groups as any).chat_id,
                user_id: chatId,
                until_date: Math.floor(Date.now() / 1000) + 30 // Ban por 30 segundos apenas (é o mínimo permitido)
              }),
            }
          );
          
          // Pequeno delay para garantir que o usuário seja removido
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 3. Desbanir o usuário (para que ele possa entrar novamente se pagar)
          await fetch(
            `https://api.telegram.org/bot${token}/unbanChatMember`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: (access.bot_groups as any).chat_id,
                user_id: chatId,
                only_if_banned: true
              }),
            }
          );
          
          // 4. Atualizar o status do acesso para expirado
          await supabase
            .from('bot_user_access')
            .update({
              status: 'expired',
              removed_at: new Date().toISOString()
            })
            .eq('id', access.id);
          
          return {
            id: access.id,
            user_id: access.user_id,
            group_id: access.group_id,
            status: 'removed'
          };
        } catch (err: any) {
          console.error(`Erro ao processar acesso expirado ${access.id}:`, err);
          
          return {
            id: access.id,
            user_id: access.user_id,
            group_id: access.group_id,
            error: err.message,
            status: 'error'
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error: any) {
    console.error('Erro ao processar acessos expirados:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 