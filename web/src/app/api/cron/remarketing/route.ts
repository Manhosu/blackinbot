import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Cron Job para envio automático de mensagens de remarketing
 * Executa diariamente para encontrar membros que expiram em 1 dia
 * e enviar mensagem de renovação via Telegram
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🤖 Iniciando cron job de remarketing...');
    
    // Calcular data de amanhã (1 dia a partir de agora)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Início do dia
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(0, 0, 0, 0); // Final do dia
    
    console.log('📅 Buscando membros que expiram entre:', {
      start: tomorrow.toISOString(),
      end: dayAfterTomorrow.toISOString()
    });
    
    // Buscar todos os membros que expiram amanhã
    const { data: expiringMembers, error } = await supabase
      .from('group_members')
      .select(`
        *,
        groups:group_id (
          id,
          name,
          telegram_id,
          bot_id,
          bots:bot_id (
            id,
            name,
            token,
            remarketing_message
          )
        )
      `)
      .gte('expires_at', tomorrow.toISOString())
      .lt('expires_at', dayAfterTomorrow.toISOString())
      .eq('status', 'active');
    
    if (error) {
      console.error('❌ Erro ao buscar membros expirando:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar membros'
      }, { status: 500 });
    }
    
    console.log(`📊 Encontrados ${expiringMembers?.length || 0} membros expirando amanhã`);
    
    if (!expiringMembers || expiringMembers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum membro expirando amanhã',
        sent_messages: 0
      });
    }
    
    let sentMessages = 0;
    let errors = 0;
    
    // Processar cada membro
    for (const member of expiringMembers) {
      try {
        // Pular administradores - eles não precisam de remarketing
        if (member.is_admin || member.member_type === 'admin' || member.member_type === 'bot_owner') {
          console.log(`⏭️ Pulando admin ${member.name} (${member.telegram_user_id})`);
          continue;
        }

        const group = member.groups;
        const bot = group?.bots;
        
        if (!bot || !bot.token) {
          console.warn(`⚠️ Bot não encontrado para membro ${member.telegram_user_id}`);
          errors++;
          continue;
        }
        
        if (!bot.remarketing_message) {
          console.warn(`⚠️ Mensagem de remarketing não configurada para bot ${bot.name}`);
          errors++;
          continue;
        }
        
        // Preparar mensagem personalizada
        let message = bot.remarketing_message;
        message = message.replace(/\{nome\}/g, member.name || 'amigo');
        
        console.log(`📤 Enviando mensagem de remarketing para ${member.name} (${member.telegram_id})`);
        
        // Enviar mensagem via API do Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: member.telegram_id,
            text: message,
            parse_mode: 'Markdown'
          })
        });
        
        const telegramResult = await telegramResponse.json();
        
        if (telegramResult.ok) {
          console.log(`✅ Mensagem enviada com sucesso para ${member.name}`);
          sentMessages++;
          
          // Registrar envio na tabela de logs (se existir)
          try {
            await supabase
              .from('remarketing_logs')
              .insert({
                member_id: member.id,
                bot_id: bot.id,
                message_sent: message,
                sent_at: new Date().toISOString(),
                telegram_response: telegramResult
              });
          } catch (logError) {
            console.warn('⚠️ Erro ao registrar log:', logError);
          }
          
        } else {
          console.error(`❌ Erro ao enviar mensagem para ${member.name}:`, telegramResult);
          errors++;
        }
        
        // Aguardar 1 segundo entre envios para não sobrecarregar a API do Telegram
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (memberError) {
        console.error(`❌ Erro ao processar membro ${member.telegram_id}:`, memberError);
        errors++;
      }
    }
    
    console.log(`📊 Processamento concluído:`, {
      total_members: expiringMembers.length,
      sent_messages: sentMessages,
      errors: errors
    });
    
    return NextResponse.json({
      success: true,
      message: `Processamento concluído: ${sentMessages} mensagens enviadas, ${errors} erros`,
      total_members: expiringMembers.length,
      sent_messages: sentMessages,
      errors: errors,
      processed_at: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro no cron job de remarketing:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST - Executar remarketing manualmente (para testes)
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_id, test_mode = false } = await request.json();
    
    console.log('🧪 Executando remarketing manual:', { bot_id, test_mode });
    
    if (!bot_id) {
      return NextResponse.json({
        success: false,
        error: 'bot_id é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', bot_id)
      .single();
    
    if (botError || !bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }
    
    if (!bot.remarketing_message) {
      return NextResponse.json({
        success: false,
        error: 'Mensagem de remarketing não configurada para este bot'
      }, { status: 400 });
    }
    
    // Buscar membros expirando em 1 dia para este bot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(0, 0, 0, 0);
    
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        *,
        groups:group_id (
          id,
          name,
          telegram_id,
          bot_id
        )
      `)
      .gte('expires_at', tomorrow.toISOString())
      .lt('expires_at', dayAfterTomorrow.toISOString())
      .eq('status', 'active');
    
    if (membersError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar membros'
      }, { status: 500 });
    }
    
    // Filtrar apenas membros dos grupos deste bot
    const botMembers = (members || []).filter((member: any) => 
      member.groups?.bot_id === bot_id
    );
    
    console.log(`🎯 Encontrados ${botMembers.length} membros para remarketing do bot ${bot.name}`);
    
    if (test_mode) {
      // Modo teste - apenas retornar informações sem enviar
      return NextResponse.json({
        success: true,
        test_mode: true,
        bot_name: bot.name,
        remarketing_message: bot.remarketing_message,
        members_found: botMembers.length,
        members: botMembers.map((m: any) => ({
          name: m.name,
          telegram_id: m.telegram_id,
          expires_at: m.expires_at,
          group_name: m.groups?.name
        }))
      });
    }
    
    // Enviar mensagens reais
    let sentMessages = 0;
    for (const member of botMembers) {
      try {
        let message = bot.remarketing_message;
        message = message.replace(/\{nome\}/g, member.name || 'amigo');
        
        const telegramResponse = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: member.telegram_id,
            text: message,
            parse_mode: 'Markdown'
          })
        });
        
        const result = await telegramResponse.json();
        
        if (result.ok) {
          sentMessages++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Erro ao enviar para membro:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      bot_name: bot.name,
      members_found: botMembers.length,
      sent_messages: sentMessages
    });
    
  } catch (error: any) {
    console.error('❌ Erro no remarketing manual:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 