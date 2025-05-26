import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPushinPayment } from '@/lib/pushinpay';

/**
 * API para criar pagamento PIX quando usuário seleciona plano no Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_token, plan_id, user_id, user_name } = await request.json();
    
    console.log('💳 Solicitação de pagamento recebida:', {
      bot_token: bot_token?.substring(0, 10) + '...',
      plan_id,
      user_id,
      user_name
    });
    
    if (!bot_token || !plan_id || !user_id) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios: bot_token, plan_id, user_id'
      }, { status: 400 });
    }
    
    // Buscar bot pelo token
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select(`
        id,
        name,
        token,
        owner_id,
        status
      `)
      .eq('token', bot_token)
      .eq('status', 'active')
      .single();
    
    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError?.message);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado ou inativo'
      }, { status: 404 });
    }
    
    // Buscar plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('bot_id', bot.id)
      .eq('is_active', true)
      .single();
    
    if (planError || !plan) {
      console.error('❌ Plano não encontrado:', planError?.message);
      return NextResponse.json({
        success: false,
        error: 'Plano não encontrado ou inativo'
      }, { status: 404 });
    }
    
    // Calcular split (R$ 1,48 + 5%)
    const totalAmount = plan.price;
    const platformFee = 1.48 + (totalAmount * 0.05);
    const ownerAmount = totalAmount - platformFee;
    
    console.log('💰 Cálculo do split:', {
      totalAmount,
      platformFee: platformFee.toFixed(2),
      ownerAmount: ownerAmount.toFixed(2)
    });
    
    // Criar pagamento no PushinPay
    const paymentResult = await createPushinPayment({
      amount: totalAmount,
      description: `${plan.name} - ${bot.name}`,
      external_reference: `bot_${bot.id}_plan_${plan.id}_user_${user_id}`,
      expires_in_minutes: 15
    });
    
    if (!paymentResult.success) {
      console.error('❌ Erro ao criar pagamento no PushinPay:', paymentResult.error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao gerar pagamento PIX'
      }, { status: 500 });
    }
    
    // Salvar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        bot_id: bot.id,
        plan_id: plan.id,
        user_telegram_id: user_id.toString(),
        user_name: user_name,
        amount: totalAmount,
        status: 'pending',
        pushinpay_id: paymentResult.data.id,
        qr_code: paymentResult.data.qr_code,
        pix_code: paymentResult.data.pix_code,
        expires_at: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // 15 minutos
        metadata: {
          platform_fee: platformFee,
          owner_amount: ownerAmount,
          split_calculated: true,
          bot_owner_id: bot.owner_id
        }
      })
      .select()
      .single();
    
    if (paymentError) {
      console.error('❌ Erro ao salvar pagamento:', paymentError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao registrar pagamento'
      }, { status: 500 });
    }
    
    console.log('✅ Pagamento criado com sucesso:', payment.id);
    
    // Resposta para o bot
    const response = {
      success: true,
      payment_id: payment.id,
      pushinpay_id: paymentResult.data.id,
      amount: totalAmount,
      plan_name: plan.name,
      bot_name: bot.name,
      expires_minutes: 15,
      pix_code: paymentResult.data.pix_code,
      qr_code_url: paymentResult.data.qr_code_image_url,
      metadata: {
        platform_fee: platformFee.toFixed(2),
        owner_amount: ownerAmount.toFixed(2)
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erro ao processar pagamento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * GET para teste
 */
export async function GET() {
  return NextResponse.json({
    service: 'Telegram Payment Creation API',
    status: 'online',
    timestamp: new Date().toISOString()
  });
} 