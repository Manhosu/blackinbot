import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkPushinPaymentStatus } from '@/lib/pushinpay';

/**
 * API para verificar status de pagamento e processar se aprovado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;
    
    console.log('🔄 Verificando status do pagamento:', paymentId);
    
    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'ID do pagamento é obrigatório'
      }, { status: 400 });
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
      .eq('id', paymentId)
      .single();
    
    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado:', paymentError?.message);
      return NextResponse.json({
        success: false,
        error: 'Pagamento não encontrado'
      }, { status: 404 });
    }
    
    // Se já foi processado, retornar status atual
    if (payment.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'Pagamento já foi processado',
        payment_id: paymentId
      });
    }
    
    // Se expirou, retornar status
    const isExpired = payment.expires_at && new Date(payment.expires_at) < new Date();
    if (isExpired && payment.status === 'pending') {
      await supabase
        .from('payments')
        .update({ status: 'expired' })
        .eq('id', paymentId);
      
      return NextResponse.json({
        success: false,
        status: 'expired',
        message: 'Pagamento expirado'
      });
    }
    
    // Verificar status no PushinPay
    const statusResult = await checkPushinPaymentStatus(payment.pushinpay_id);
    
    if (!statusResult.success) {
      console.error('❌ Erro ao verificar status no PushinPay:', statusResult.error);
      return NextResponse.json({
        success: false,
        status: payment.status,
        error: 'Erro ao verificar status do pagamento'
      }, { status: 500 });
    }
    
    const pushinPayStatus = statusResult.data.status;
    console.log('📊 Status no PushinPay:', pushinPayStatus);
    
    // Se foi aprovado no PushinPay, processar
    if (pushinPayStatus === 'approved' && payment.status !== 'completed') {
      console.log('✅ Pagamento aprovado! Processando...');
      
      try {
        // Atualizar pagamento
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            metadata: {
              ...payment.metadata,
              pushinpay_status: pushinPayStatus,
              processed_at: new Date().toISOString()
            }
          })
          .eq('id', paymentId);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar pagamento:', updateError);
          throw updateError;
        }
        
        // Processar split financeiro
        const splitResult = await supabase
          .rpc('process_payment_split', {
            p_payment_id: paymentId,
            p_bot_owner_id: payment.bots.owner_id,
            p_total_amount: payment.amount
          });
        
        if (splitResult.error) {
          console.error('❌ Erro ao processar split:', splitResult.error);
        } else {
          console.log('💰 Split processado:', splitResult.data);
        }
        
        // Registrar acesso do usuário
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + payment.plans.period_days);
        
        const { error: accessError } = await supabase
          .from('bot_user_access')
          .upsert({
            bot_id: payment.bot_id,
            user_telegram_id: payment.user_telegram_id,
            plan_id: payment.plan_id,
            payment_id: paymentId,
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
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            bot_id: payment.bot_id,
            plan_id: payment.plan_id,
            payment_id: paymentId,
            customer_telegram_id: payment.user_telegram_id,
            customer_name: payment.user_name,
            amount: payment.amount,
            status: 'completed',
            sale_date: new Date().toISOString()
          });
        
        if (saleError) {
          console.error('❌ Erro ao registrar venda:', saleError);
        } else {
          console.log('📈 Venda registrada');
        }
        
        console.log('🎉 Pagamento processado com sucesso!');
        
        return NextResponse.json({
          success: true,
          status: 'completed',
          message: 'Pagamento confirmado e processado',
          payment_id: paymentId,
          access_granted: true,
          plan_name: payment.plans?.name,
          expires_at: expiresAt.toISOString()
        });
        
      } catch (processError) {
        console.error('❌ Erro ao processar pagamento aprovado:', processError);
        return NextResponse.json({
          success: false,
          status: 'processing_error',
          error: 'Erro ao processar pagamento'
        }, { status: 500 });
      }
    }
    
    // Retornar status atual
    let statusMessage = 'Aguardando pagamento';
    if (pushinPayStatus === 'pending') {
      statusMessage = 'Pagamento pendente';
    } else if (pushinPayStatus === 'expired') {
      statusMessage = 'Pagamento expirado';
    } else if (pushinPayStatus === 'cancelled') {
      statusMessage = 'Pagamento cancelado';
    }
    
    return NextResponse.json({
      success: true,
      status: pushinPayStatus || payment.status,
      message: statusMessage,
      payment_id: paymentId
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar status do pagamento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 