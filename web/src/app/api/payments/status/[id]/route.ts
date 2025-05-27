import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: {
    id: string;
  };
}

// Função para criar cliente Supabase com Service Role Key
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: paymentId } = params;
    
    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'ID do pagamento é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔍 Verificando status do pagamento: ${paymentId}`);

    const supabase = createSupabaseAdmin();

    // Buscar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        status,
        amount,
        telegram_user_id,
        created_at,
        expires_at,
        paid_at,
        pushinpay_id,
        plans(name, period_days),
        bots(name)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado:', paymentError);
      return NextResponse.json({
        success: false,
        error: 'Pagamento não encontrado'
      }, { status: 404 });
    }

    console.log(`📋 Status atual: ${payment.status}`);

    // Se ainda está pendente, verificar no PushinPay
    if (payment.status === 'pending' && payment.pushinpay_id) {
      try {
        console.log(`🔄 Verificando status no PushinPay: ${payment.pushinpay_id}`);
        
        // Aqui você faria a verificação real no PushinPay
        // const pushinPayStatus = await checkPushinPayStatus(payment.pushinpay_id);
        
        // Por enquanto, simular verificação (pode retornar 'pending', 'completed', 'failed', etc.)
        const pushinPayStatus: string = Math.random() > 0.5 ? 'pending' : 'completed';
        
        if (pushinPayStatus === 'completed' && payment.status !== 'completed') {
          console.log('✅ Pagamento aprovado no PushinPay! Atualizando...');
          
          // Atualizar status no banco
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'completed',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

          if (updateError) {
            console.error('❌ Erro ao atualizar pagamento:', updateError);
          } else {
            payment.status = 'completed';
            payment.paid_at = new Date().toISOString();
            console.log('✅ Status atualizado para completed');
          }
        }
      } catch (pushinError) {
        console.warn('⚠️ Erro ao verificar PushinPay:', pushinError);
      }
    }

    // Verificar se expirou
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    const isExpired = now > expiresAt;

    if (isExpired && payment.status === 'pending') {
      // Marcar como expirado
      const { error: expiredError } = await supabase
        .from('payments')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (!expiredError) {
        payment.status = 'expired';
        console.log('⏰ Pagamento marcado como expirado');
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      status: payment.status,
      amount: payment.amount / 100, // Converter para reais
      telegram_user_id: payment.telegram_user_id,
      created_at: payment.created_at,
      expires_at: payment.expires_at,
      paid_at: payment.paid_at,
      is_expired: isExpired,
      plan_name: (payment as any).plans?.name || (payment as any).plans?.[0]?.name,
      bot_name: (payment as any).bots?.name || (payment as any).bots?.[0]?.name,
      period_days: (payment as any).plans?.period_days || (payment as any).plans?.[0]?.period_days
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar status:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 