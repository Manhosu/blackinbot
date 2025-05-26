import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pushinPayAPI } from '@/lib/pushinpay';

// Função para criar cliente Supabase com Service Role Key
function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('❌ Variáveis de ambiente do Supabase não configuradas para Service Role');
  }
  
  return createClient(url, serviceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;
    console.log('🔍 Verificando status do pagamento:', paymentId);

    // Criar cliente Supabase
    const supabase = createSupabaseServiceClient();

    // Buscar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado:', paymentError);
      return NextResponse.json({
        success: false,
        error: 'Pagamento não encontrado'
      }, { status: 404 });
    }

    // Se o pagamento já foi pago, retornar status atual
    if (payment.status === 'paid') {
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          amount_formatted: (payment.amount / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }),
          paid_at: payment.paid_at,
        }
      });
    }

    // Se ainda está pendente, verificar no PushinPay
    if (payment.status === 'pending' && payment.pushinpay_id) {
      console.log('🔄 Consultando status no PushinPay:', payment.pushinpay_id);
      
      const pixStatus = await pushinPayAPI.checkPushinPaymentStatus(payment.pushinpay_id);
      
      if (pixStatus.success && pixStatus.data) {
        const newStatus = pixStatus.data.status;
        
        // Se o status mudou, atualizar no banco
        if (newStatus !== payment.status) {
          console.log(`📝 Atualizando status: ${payment.status} → ${newStatus}`);
          
          const updateData: any = {
            status: newStatus,
            updated_at: new Date().toISOString(),
          };

          // Se foi pago, registrar data de pagamento
          if (newStatus === 'paid') {
            updateData.paid_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', paymentId);

          if (updateError) {
            console.error('❌ Erro ao atualizar status:', updateError);
          } else {
            console.log('✅ Status atualizado no banco');
            
            // Se foi pago, processar acesso (similar ao webhook)
            if (newStatus === 'paid') {
              try {
                await processPaymentApproval(paymentId);
              } catch (processError) {
                console.error('❌ Erro ao processar aprovação:', processError);
              }
            }
          }

          // Retornar novo status
          return NextResponse.json({
            success: true,
            payment: {
              id: paymentId,
              status: newStatus,
              amount: payment.amount,
              amount_formatted: (payment.amount / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }),
              paid_at: newStatus === 'paid' ? updateData.paid_at : null,
            }
          });
        }
      }
    }

    // Retornar status atual
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        amount_formatted: (payment.amount / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        paid_at: payment.paid_at,
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar status do pagamento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * Processa aprovação de pagamento
 */
async function processPaymentApproval(paymentId: string) {
  console.log('🎯 Processando aprovação do pagamento:', paymentId);

  try {
    // Criar cliente Supabase
    const supabase = createSupabaseServiceClient();

    // Buscar dados completos do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bots (*),
        plans (*)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Erro ao buscar pagamento:', paymentError);
      return;
    }

    // 1. Calcular data de expiração
    const expiresAt = payment.plans?.days_access 
      ? new Date(Date.now() + payment.plans.days_access * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // 2. Registrar venda
    const { error: saleError } = await supabase
      .from('sales')
      .insert({
        payment_id: payment.id,
        bot_id: payment.bot_id,
        plan_id: payment.plan_id,
        user_telegram_id: payment.telegram_user_id,
        amount: payment.amount,
        currency: payment.currency,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });

    if (saleError) {
      console.error('❌ Erro ao registrar venda:', saleError);
    } else {
      console.log('✅ Venda registrada com sucesso');
    }

    // 3. Registrar acesso do usuário
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .eq('bot_id', payment.bot_id)
      .limit(1);

    if (groups && groups.length > 0) {
      const group = groups[0];
      
      const { error: accessError } = await supabase
        .from('bot_user_access')
        .insert({
          user_id: payment.telegram_user_id,
          bot_id: payment.bot_id,
          group_id: group.id,
          payment_id: payment.id,
          status: 'active',
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        });

      if (accessError) {
        console.error('❌ Erro ao registrar acesso:', accessError);
      } else {
        console.log('✅ Acesso registrado com sucesso');
      }
    }

    // 4. Enviar notificação via Telegram
    if (payment.bots?.token && payment.telegram_user_id) {
      await sendPaymentNotification(payment);
    }

    console.log('✅ Aprovação processada com sucesso');

  } catch (error) {
    console.error('❌ Erro ao processar aprovação:', error);
    throw error;
  }
}

/**
 * Envia notificação de pagamento aprovado
 */
async function sendPaymentNotification(payment: any) {
  try {
    console.log('📤 Enviando notificação de pagamento aprovado...');

    const message = `✅ *PAGAMENTO APROVADO* ✅

Olá! Seu pagamento foi confirmado com sucesso!

💳 *Detalhes:*
• Valor: ${(payment.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
• Plano: ${payment.plans?.name || 'Plano'}
• Bot: ${payment.bots?.name || 'Bot'}

🎉 Seu acesso foi liberado!`;

    const telegramUrl = `https://api.telegram.org/bot${payment.bots.token}/sendMessage`;
    
    const messageData: any = {
      chat_id: payment.telegram_user_id,
      text: message,
      parse_mode: 'Markdown',
    };

    // Adicionar botão do grupo se disponível
    if (payment.bots.telegram_group_link) {
      messageData.reply_markup = {
        inline_keyboard: [[
          {
            text: '👉 Entrar no Grupo VIP 👈',
            url: payment.bots.telegram_group_link
          }
        ]]
      };
    }

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });

    if (response.ok) {
      console.log('✅ Notificação enviada com sucesso');
    } else {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar notificação:', errorData);
    }

  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
  }
} 