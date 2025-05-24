import { NextResponse } from 'next/server';
import { getUser } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter os dados do pagamento
    const body = await request.json();
    const { paymentId, action } = body;

    if (!paymentId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID do pagamento e ação são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar o pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('bot_payments')
      .select('*, bot_plans(*), bots(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Erro ao buscar pagamento:', paymentError);
      return NextResponse.json({ 
        success: false, 
        error: 'Pagamento não encontrado' 
      }, { status: 404 });
    }

    // Verificar se o bot pertence ao usuário
    if (payment.bots.user_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Você não tem permissão para gerenciar este pagamento' 
      }, { status: 403 });
    }

    // Processar ação
    if (action === 'approve') {
      // Aprovar pagamento
      const { error: updateError } = await supabase
        .from('bot_payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        console.error('Erro ao atualizar pagamento:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao aprovar pagamento' 
        }, { status: 500 });
      }

      // Atualizar o usuário com o acesso
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + payment.bot_plans.days_access);

      const { error: userUpdateError } = await supabase
        .from('bot_users')
        .update({
          status: 'active',
          access_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('bot_id', payment.bot_id)
        .eq('telegram_id', payment.telegram_user_id);

      if (userUpdateError) {
        console.error('Erro ao atualizar usuário:', userUpdateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao atualizar acesso do usuário' 
        }, { status: 500 });
      }

      // Enviar mensagem ao usuário via Telegram
      const successMessage = payment.bots.success_payment_message || 
        `✅ *PAGAMENTO APROVADO!*\n\nSeu pagamento foi aprovado com sucesso e seu acesso ao grupo foi liberado.\n\nPlano: *${payment.bot_plans.name}*\nValidade: ${expiresAt.toLocaleDateString('pt-BR')}\n\nAproveite seu acesso!`;

      try {
        await sendMessage(payment.telegram_user_id, successMessage, payment.bots.token, {
          parse_mode: 'Markdown'
        });

        // Enviar link de convite
        if (payment.bots.telegram_group_link) {
          await sendMessage(
            payment.telegram_user_id, 
            `🔗 *LINK DE ACESSO*\n\nClique no botão abaixo para acessar o grupo:`,
            payment.bots.token,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{
                    text: '👉 Entrar no Grupo 👈',
                    url: payment.bots.telegram_group_link
                  }]
                ]
              }
            }
          );
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        // Não falhar a operação se a mensagem não puder ser enviada
      }

      return NextResponse.json({ 
        success: true,
        message: 'Pagamento aprovado e acesso liberado' 
      });
    } else if (action === 'reject') {
      // Rejeitar pagamento
      const { error: updateError } = await supabase
        .from('bot_payments')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        console.error('Erro ao atualizar pagamento:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao rejeitar pagamento' 
        }, { status: 500 });
      }

      // Enviar mensagem ao usuário via Telegram
      try {
        await sendMessage(
          payment.telegram_user_id, 
          `❌ *PAGAMENTO REJEITADO*\n\nSeu pagamento para o plano *${payment.bot_plans.name}* foi rejeitado.\n\nPor favor, tente novamente ou entre em contato com o suporte para mais informações.`,
          payment.bots.token,
          {
            parse_mode: 'Markdown'
          }
        );
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        // Não falhar a operação se a mensagem não puder ser enviada
      }

      return NextResponse.json({ 
        success: true,
        message: 'Pagamento rejeitado' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Ação inválida' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro ao processar pagamento:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao processar pagamento' 
      }, 
      { status: 500 }
    );
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