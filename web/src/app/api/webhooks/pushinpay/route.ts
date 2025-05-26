import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com Service Role Key
function createSupabaseServiceClient() {
  const url = 'https://xcnhlmqkovfaqyjxwdje.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY5MDQ1NiwiZXhwIjoyMDYzMjY2NDU2fQ.-nZKTJD77uUtCglMY3zs1Jkcoq_KiZsy9NLIbJlW9Eg';
  
  return createClient(url, serviceKey);
}

/**
 * Webhook do PushinPay para receber notificações de pagamento
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Webhook PushinPay recebido');
    
    const body = await request.json();
    console.log('📋 Dados do webhook:', JSON.stringify(body, null, 2));

    // Validar estrutura do webhook
    if (!body.event || !body.data) {
      console.error('❌ Webhook inválido - estrutura incorreta');
      return NextResponse.json({ 
        success: false, 
        error: 'Estrutura de webhook inválida' 
      }, { status: 400 });
    }

    const { event, data: paymentData } = body;

    // Processar apenas eventos de mudança de status de pagamento
    if (event !== 'payment.status_changed') {
      console.log(`ℹ️ Evento ignorado: ${event}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Evento ignorado' 
      });
    }

    const { id: pushinpayId, status } = paymentData;

    if (!pushinpayId || !status) {
      console.error('❌ Dados do pagamento incompletos');
      return NextResponse.json({ 
        success: false, 
        error: 'Dados incompletos' 
      }, { status: 400 });
    }

    console.log(`💳 Processando pagamento ${pushinpayId} - Status: ${status}`);

    const supabase = createSupabaseServiceClient();
    console.log('✅ Cliente Supabase criado com sucesso');

    // Buscar pagamento no banco pelo pushinpay_id
    console.log('🔍 Buscando pagamento com pushinpay_id:', pushinpayId);
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        bots!inner(id, name, token, owner_id),
        plans!inner(id, name, period_days)
      `)
      .eq('pushinpay_id', pushinpayId)
      .single();

    console.log('📊 Resultado da consulta:', { payment: payment?.id, error: paymentError?.message });

    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado no banco:', paymentError);
      return NextResponse.json({ 
        success: false, 
        error: 'Pagamento não encontrado' 
      }, { status: 404 });
    }

    console.log(`📋 Pagamento encontrado: ${payment.id} - Status atual: ${payment.status}`);

    // Processar apenas se o status mudou para 'paid' ou 'approved'
    if ((status === 'paid' || status === 'approved') && payment.status !== 'completed') {
      console.log('✅ Pagamento aprovado! Processando...');

      try {
        // 1. Atualizar status do pagamento
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              ...payment.metadata,
              pushinpay_status: status,
              processed_at: new Date().toISOString(),
              webhook_received_at: new Date().toISOString()
            }
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar pagamento:', updateError);
          throw updateError;
        }

        console.log('✅ Status do pagamento atualizado para completed');

        // 2. Calcular e processar split financeiro
        const totalAmount = Number(payment.amount); // Já está em reais
        const platformFee = 1.48 + (totalAmount * 0.05);
        const ownerAmount = totalAmount - platformFee;

        console.log(`💰 Split: Total R$ ${totalAmount.toFixed(2)} | Plataforma: R$ ${platformFee.toFixed(2)} | Dono: R$ ${ownerAmount.toFixed(2)}`);

        // 3. Atualizar saldo financeiro para o dono do bot
        const { data: currentFinance } = await supabase
          .from('user_finances')
          .select('available_balance, total_revenue')
          .eq('user_id', payment.bots.owner_id)
          .single();

        const currentBalance = Number(currentFinance?.available_balance || 0);
        const currentRevenue = Number(currentFinance?.total_revenue || 0);

        const { error: financeError } = await supabase
          .from('user_finances')
          .upsert({
            user_id: payment.bots.owner_id,
            available_balance: currentBalance + ownerAmount,
            total_revenue: currentRevenue + ownerAmount,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (financeError) {
          console.warn('⚠️ Erro ao registrar financeiro (não crítico):', financeError);
        } else {
          console.log('✅ Saldo financeiro atualizado');
        }

        // 4. Liberar acesso do usuário ao bot
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + payment.plans.period_days);

        const { error: accessError } = await supabase
          .from('bot_user_access')
          .upsert({
            bot_id: payment.bot_id,
            user_telegram_id: payment.telegram_user_id,
            plan_id: payment.plan_id,
            payment_id: payment.id,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            metadata: {
              payment_amount: payment.amount,
              plan_name: payment.plans.name,
              granted_via: 'pushinpay_webhook'
            }
          }, {
            onConflict: 'bot_id,user_telegram_id'
          });

        if (accessError) {
          console.error('❌ Erro ao liberar acesso:', accessError);
        } else {
          console.log(`✅ Acesso liberado até ${expiresAt.toISOString()}`);
        }

        // 5. Enviar mensagem de confirmação para o usuário
        try {
          const confirmationMessage = `🎉 **PAGAMENTO CONFIRMADO!**

✅ **Plano ativado:** ${payment.plans.name}
⏰ **Válido até:** ${expiresAt.toLocaleDateString('pt-BR')}
💰 **Valor pago:** R$ ${totalAmount.toFixed(2).replace('.', ',')}

🎯 **Seu acesso foi liberado automaticamente!**

Obrigado pela preferência! 🙏`;

          await fetch(`https://api.telegram.org/bot${payment.bots.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: payment.telegram_user_id,
              text: confirmationMessage,
              parse_mode: 'Markdown'
            })
          });

          console.log('✅ Mensagem de confirmação enviada');
        } catch (telegramError) {
          console.warn('⚠️ Erro ao enviar mensagem de confirmação:', telegramError);
        }

        // 6. Log de auditoria
        const { error: auditError } = await supabase
          .from('payment_audit_log')
          .insert({
            payment_id: payment.id,
            event_type: 'payment_completed',
            event_data: {
              pushinpay_id: pushinpayId,
              status: status,
              amount: totalAmount,
              platform_fee: platformFee,
              owner_amount: ownerAmount,
              processed_at: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          });

        if (auditError) {
          console.warn('⚠️ Erro no log de auditoria:', auditError);
        }

        console.log('🎉 Pagamento processado com sucesso!');

        return NextResponse.json({
          success: true,
          message: 'Pagamento processado com sucesso',
          payment_id: payment.id,
          status: 'completed'
        });

      } catch (processingError) {
        console.error('❌ Erro ao processar pagamento:', processingError);
        
        // Reverter status se houve erro crítico
        await supabase
          .from('payments')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
            metadata: {
              ...payment.metadata,
              error_message: processingError.message,
              error_at: new Date().toISOString()
            }
          })
          .eq('id', payment.id);

        return NextResponse.json({
          success: false,
          error: 'Erro ao processar pagamento',
          payment_id: payment.id
        }, { status: 500 });
      }
    } 
    
    // Status não relevante ou já processado
    else if (status === 'cancelled' || status === 'failed' || status === 'expired') {
      console.log(`📋 Pagamento ${status} - atualizando status`);
      
      await supabase
        .from('payments')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
          metadata: {
            ...payment.metadata,
            pushinpay_status: status,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', payment.id);

      return NextResponse.json({
        success: true,
        message: `Status atualizado para ${status}`,
        payment_id: payment.id
      });
    }
    
    else {
      console.log(`ℹ️ Status ${status} - nenhuma ação necessária`);
      return NextResponse.json({
        success: true,
        message: 'Status recebido, nenhuma ação necessária'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no webhook PushinPay:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET para verificar se o webhook está ativo
 */
export async function GET() {
  return NextResponse.json({
    service: 'PushinPay Webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://blackinbot.vercel.app'}/api/webhooks/pushinpay`
  });
} 