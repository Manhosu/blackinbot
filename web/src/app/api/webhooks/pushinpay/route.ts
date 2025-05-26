import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Webhook do PushinPay para receber notificações de pagamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📨 Webhook PushinPay recebido:', {
      event: body.event,
      payment_id: body.data?.id,
      status: body.data?.status
    });
    
    // Verificar se é um evento de pagamento
    if (body.event !== 'payment.status_changed') {
      console.log('ℹ️ Evento ignorado:', body.event);
      return NextResponse.json({ received: true });
    }
    
    const pushinpayId = body.data?.id;
    const newStatus = body.data?.status;
    
    if (!pushinpayId || !newStatus) {
      console.error('❌ Dados do webhook incompletos');
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }
    
    // Buscar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        plans (
          name,
          period_days,
          bot_id
        ),
        bots (
          name,
          owner_id,
          group_id,
          invite_link
        )
      `)
      .eq('pushinpay_id', pushinpayId)
      .single();
    
    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado para PushinPay ID:', pushinpayId, paymentError?.message);
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }
    
    console.log('💳 Pagamento encontrado:', payment.id, 'Status atual:', payment.status, 'Novo status:', newStatus);
    
    // Se o pagamento já foi processado, ignorar
    if (payment.status === 'completed') {
      console.log('ℹ️ Pagamento já processado, ignorando webhook');
      return NextResponse.json({ received: true, message: 'Já processado' });
    }
    
    // Processar apenas se foi aprovado
    if (newStatus === 'approved') {
      console.log('✅ Pagamento aprovado! Processando automaticamente...');
      
      try {
        // Iniciar transação para garantir consistência
        const { data: updatedPayment, error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            metadata: {
              ...payment.metadata,
              pushinpay_status: newStatus,
              processed_at: new Date().toISOString(),
              webhook_processed: true
            }
          })
          .eq('id', payment.id)
          .eq('status', 'pending') // Garantir que só processa se ainda estiver pendente
          .select()
          .single();
        
        if (updateError || !updatedPayment) {
          console.error('❌ Erro ao atualizar pagamento ou já foi processado:', updateError?.message);
          return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 });
        }
        
        // Processar split financeiro
        console.log('💰 Processando split financeiro...');
        const splitResult = await supabase
          .rpc('process_payment_split', {
            p_payment_id: payment.id,
            p_bot_owner_id: payment.bots.owner_id,
            p_total_amount: payment.amount
          });
        
        if (splitResult.error) {
          console.error('❌ Erro ao processar split:', splitResult.error);
        } else {
          console.log('💰 Split processado com sucesso:', splitResult.data);
        }
        
        // Calcular data de expiração do acesso
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + payment.plans.period_days);
        
        // Registrar acesso do usuário
        console.log('🔓 Registrando acesso do usuário...');
        const { error: accessError } = await supabase
          .from('bot_user_access')
          .upsert({
            bot_id: payment.bot_id,
            user_telegram_id: payment.user_telegram_id,
            plan_id: payment.plan_id,
            payment_id: payment.id,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true
          }, {
            onConflict: 'bot_id,user_telegram_id'
          });
        
        if (accessError) {
          console.error('❌ Erro ao registrar acesso:', accessError);
        } else {
          console.log('🔓 Acesso registrado para usuário:', payment.user_telegram_id);
        }
        
        // Registrar venda
        console.log('📈 Registrando venda...');
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            bot_id: payment.bot_id,
            plan_id: payment.plan_id,
            payment_id: payment.id,
            customer_telegram_id: payment.user_telegram_id,
            customer_name: payment.user_name,
            amount: payment.amount,
            status: 'completed',
            sale_date: new Date().toISOString(),
            metadata: {
              pushinpay_id: pushinpayId,
              processed_via_webhook: true,
              plan_expires_at: expiresAt.toISOString()
            }
          });
        
        if (saleError) {
          console.error('❌ Erro ao registrar venda:', saleError);
        } else {
          console.log('📈 Venda registrada com sucesso');
        }
        
        // TODO: Adicionar usuário ao grupo do Telegram automaticamente
        // Esta funcionalidade será implementada posteriormente
        
        console.log('🎉 Pagamento processado completamente via webhook!');
        
        return NextResponse.json({
          received: true,
          processed: true,
          payment_id: payment.id,
          status: 'completed',
          message: 'Pagamento processado com sucesso'
        });
        
      } catch (processError) {
        console.error('❌ Erro durante processamento do pagamento:', processError);
        
        // Reverter status se deu erro
        await supabase
          .from('payments')
          .update({
            status: 'error',
            metadata: {
              ...payment.metadata,
              error: 'Erro durante processamento webhook',
              error_details: (processError as any)?.message || 'Erro desconhecido',
              error_at: new Date().toISOString()
            }
          })
          .eq('id', payment.id);
        
        return NextResponse.json({
          error: 'Erro durante processamento',
          payment_id: payment.id
        }, { status: 500 });
      }
    }
    
    // Para outros status, apenas atualizar
    else {
      console.log('📊 Atualizando status do pagamento para:', newStatus);
      
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: newStatus === 'rejected' ? 'failed' : newStatus,
          metadata: {
            ...payment.metadata,
            pushinpay_status: newStatus,
            webhook_updated_at: new Date().toISOString()
          }
        })
        .eq('id', payment.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar status:', updateError);
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
      }
      
      return NextResponse.json({
        received: true,
        updated: true,
        payment_id: payment.id,
        status: newStatus
      });
    }
    
  } catch (error: any) {
    console.error('❌ Erro no webhook PushinPay:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET para verificar se o webhook está funcionando
 */
export async function GET() {
  return NextResponse.json({
    service: 'PushinPay Webhook',
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Webhook pronto para receber notificações'
  });
} 