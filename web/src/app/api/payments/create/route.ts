import { NextRequest, NextResponse } from 'next/server';
import { createPushinPayment, convertToCents } from '@/lib/pushinpay';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com Service Role Key
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  console.log('🚀 API de criação de pagamento chamada');

  try {
    const { bot_id, plan_id, user_telegram_id, user_name, amount, description } = await request.json();
    
    console.log('📋 Dados recebidos:', { bot_id, plan_id, user_telegram_id, user_name, amount, description });

    if (!bot_id || !user_telegram_id || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: bot_id, user_telegram_id, amount'
      }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Buscar dados do bot e do proprietário
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select(`
        id,
        name,
        owner_id,
        status,
        users:owner_id (
          id,
          name,
          email,
          pushinpay_key
        )
      `)
      .eq('id', bot_id)
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    // Verificar se o proprietário tem chave PushinPay configurada
    const userPushinPayKey = (bot.users as any)?.pushinpay_key;
    if (!userPushinPayKey) {
      console.error('❌ Proprietário sem chave PushinPay:', bot.owner_id);
      return NextResponse.json({
        success: false,
        error: 'Proprietário do bot não possui chave PushinPay configurada'
      }, { status: 400 });
    }

    // Buscar plano se fornecido
    let plan = null;
    if (plan_id) {
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .eq('bot_id', bot_id)
        .single();
      
      if (!planError) {
        plan = planData;
      }
    }
    
    console.log('💰 Criando pagamento PushinPay com chave do usuário');

    // Criar pagamento no PushinPay
    const paymentResult = await createPushinPayment({
      amount: amount,
      description: description || `Pagamento - ${bot.name} - ${plan?.name || 'Plano'}`,
      external_reference: `bot_${bot_id}_user_${user_telegram_id}_${Date.now()}`,
      expires_in_minutes: 15,
      payer: user_name ? { name: user_name } : undefined
    }, userPushinPayKey);

    if (!paymentResult.success) {
      console.error('❌ Erro no PushinPay:', paymentResult.error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao gerar pagamento PIX: ' + paymentResult.error
      }, { status: 500 });
    }

    console.log('✅ Pagamento PushinPay criado:', paymentResult.data);
    
    // Preparar dados para salvar no banco
    const paymentToSave = {
      bot_id: bot_id,
      plan_id: plan_id,
      user_telegram_id: user_telegram_id.toString(),
      user_name: user_name,
      amount: amount,
      status: 'pending',
      method: 'pix',
      pushinpay_id: paymentResult.data.id,
      qr_code: paymentResult.data.qr_code,
      expires_at: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
      metadata: {
        ...(paymentResult.data.split_info || {}),
        bot_owner_id: bot.owner_id,
        user_pushinpay_key_used: userPushinPayKey.substring(0, 10) + '...',
        qr_code_image_url: paymentResult.data.qr_code_image_url // Armazenar no metadata
      }
    };
    
    console.log('💾 Salvando pagamento no banco:', JSON.stringify(paymentToSave, null, 2));
    
    // Salvar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentToSave)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao salvar pagamento:', paymentError);
      console.error('❌ Dados que tentamos salvar:', JSON.stringify(paymentToSave, null, 2));
      return NextResponse.json({
        success: false,
        error: 'Erro ao salvar pagamento: ' + paymentError.message
      }, { status: 500 });
    }

    console.log('✅ Pagamento criado com sucesso:', payment.id);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        pushinpay_id: paymentResult.data.id,
        amount: payment.amount,
        qr_code: paymentResult.data.qr_code,
        qr_code_image_url: paymentResult.data.qr_code_image_url,
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