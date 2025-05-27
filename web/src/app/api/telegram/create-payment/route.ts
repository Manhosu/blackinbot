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
    
    // Buscar bot pelo token (incluindo dados do proprietário)
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select(`
        id,
        name,
        token,
        owner_id,
        status,
        users:owner_id (
          id,
          name,
          email,
          pushinpay_key
        )
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

    // Verificar se o proprietário do bot tem chave PushinPay configurada
    if (!bot.users?.pushinpay_key) {
      console.error('❌ Proprietário do bot sem chave PushinPay configurada:', bot.owner_id);
      return NextResponse.json({
        success: false,
        error: 'Proprietário do bot não possui chave PushinPay configurada. Configure em Financeiro > Contas bancárias.'
      }, { status: 400 });
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
    
    console.log('💰 Criando pagamento com split automático:', {
      bot_id: bot.id,
      plan_price: plan.price,
      bot_owner: bot.owner_id,
      user_pushinpay_key: bot.users.pushinpay_key.substring(0, 10) + '...'
    });
    
    // Criar pagamento no PushinPay com chave do usuário e split automático
    const paymentResult = await createPushinPayment({
      amount: plan.price,
      description: `${plan.name} - ${bot.name}`,
      external_reference: `bot_${bot.id}_plan_${plan.id}_user_${user_id}`,
      expires_in_minutes: 15
    }, bot.users.pushinpay_key);
    
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
        amount: plan.price,
        status: 'pending',
        pushinpay_id: paymentResult.data.id,
        qr_code: paymentResult.data.qr_code,
        pix_code: paymentResult.data.pix_code,
        expires_at: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // 15 minutos
        metadata: {
          ...(paymentResult.data.split_info || {}),
          split_calculated: true,
          bot_owner_id: bot.owner_id,
          user_pushinpay_key_used: bot.users.pushinpay_key.substring(0, 10) + '...' // Log parcial para auditoria
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao salvar pagamento:', paymentError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao salvar dados do pagamento'
      }, { status: 500 });
    }

    console.log('✅ Pagamento criado com sucesso:', payment.id);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        qr_code: paymentResult.data.qr_code,
        qr_code_image_url: paymentResult.data.qr_code_image_url,
        pix_code: paymentResult.data.pix_code,
        expires_at: payment.expires_at,
        split_info: paymentResult.data.split_info
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na API de pagamento:', error);
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