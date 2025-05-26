import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface ScheduledMessage {
  id: string;
  user_id: string;
  message: string;
  include_plans: boolean;
  scheduled_date: string;
  status: string;
  bot: {
    id: string;
    token: string;
    name: string;
  };
  user: {
    id: string;
    telegram_id: string;
    name: string;
    username?: string;
  };
}

interface BotPlan {
  id: string;
  name: string;
  price: number;
  days_access: number;
  description?: string;
}

/**
 * Endpoint para processar mensagens programadas
 * Este endpoint deve ser chamado por um cron job a cada hora
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
    
    // Buscar todas as mensagens programadas pendentes que devem ser enviadas agora
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    const { data: messages, error: messagesError } = await supabase
      .from('bot_scheduled_messages')
      .select(`
        *,
        bot:bots(id, token, name),
        user:bot_users(id, telegram_id, name, username)
      `)
      .eq('status', 'pending')
      .lte('scheduled_date', today);
    
    if (messagesError) {
      throw new Error(`Erro ao buscar mensagens programadas: ${messagesError.message}`);
    }
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma mensagem programada para envio hoje'
      });
    }
    
    // Processar cada mensagem
    const results = await Promise.all(
      messages.map(async (message: ScheduledMessage) => {
        try {
          // Se a mensagem incluir planos, buscar os planos do bot
          let plansMessage = '';
          
          if (message.include_plans && message.bot.id) {
            const { data: plans, error: plansError } = await supabase
              .from('bot_plans')
              .select('*')
              .eq('bot_id', message.bot.id)
              .order('price', { ascending: true });
              
            if (!plansError && plans && plans.length > 0) {
              plansMessage = '\n\n📊 *PLANOS DISPONÍVEIS* 📊\n\n';
              
              for (const plan of plans) {
                let duration = '';
                if (plan.days_access === 7) duration = '7 dias';
                else if (plan.days_access === 15) duration = '15 dias';
                else if (plan.days_access === 30) duration = '1 mês';
                else if (plan.days_access === 90) duration = '3 meses';
                else if (plan.days_access === 180) duration = '6 meses';
                else if (plan.days_access === 365) duration = '1 ano';
                else if (plan.days_access >= 9000) duration = 'Vitalício';
                else duration = `${plan.days_access} dias`;
                
                plansMessage += `🔹 *${plan.name}*\n`;
                plansMessage += `💰 Valor: R$ ${plan.price.toFixed(2).replace('.', ',')}\n`;
                plansMessage += `⏱ Duração: ${duration}\n`;
                
                if (plan.description) {
                  plansMessage += `📝 ${plan.description}\n`;
                }
                
                plansMessage += `\n`;
              }
              
              // Adicionar botão callback para cada plano
              plansMessage += '📲 Para renovar, clique em um dos botões abaixo:';
            }
          }
          
          // Montar a mensagem completa
          const fullMessage = message.message + plansMessage;
          
          // Enviar a mensagem via API do Telegram
          const token = message.bot.token;
          const chatId = message.user.telegram_id;
          
          // Preparar botões inline para os planos, se necessário
          let replyMarkup = {};
          
          if (message.include_plans) {
            const { data: plans } = await supabase
              .from('bot_plans')
              .select('id, name, price')
              .eq('bot_id', message.bot.id)
              .order('price', { ascending: true });
            
            if (plans && plans.length > 0) {
              replyMarkup = {
                inline_keyboard: plans.map((plan: BotPlan) => [{
                  text: `${plan.name} - R$ ${plan.price.toFixed(2).replace('.', ',')}`,
                  callback_data: `plan_${plan.id}`
                }])
              };
            }
          }
          
          // Enviar a mensagem
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: chatId,
                text: fullMessage,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
              }),
            }
          );
          
          const telegramData = await telegramResponse.json();
          
          if (!telegramResponse.ok) {
            throw new Error(`Erro ao enviar mensagem: ${telegramData.description}`);
          }
          
          // Atualizar o status da mensagem para enviada
          await supabase
            .from('bot_scheduled_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              result: JSON.stringify(telegramData)
            })
            .eq('id', message.id);
          
          return {
            id: message.id,
            user_id: message.user_id,
            telegram_id: chatId,
            status: 'sent'
          };
        } catch (err: any) {
          console.error(`Erro ao processar mensagem ${message.id}:`, err);
          
          // Marcar a mensagem como com erro
          await supabase
            .from('bot_scheduled_messages')
            .update({
              status: 'error',
              result: err.message
            })
            .eq('id', message.id);
          
          return {
            id: message.id,
            user_id: message.user_id,
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
    console.error('Erro ao processar mensagens programadas:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 