import { NextRequest, NextResponse } from 'next/server';
import { pushinPayAPI, convertToCents } from '@/lib/pushinpay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Iniciando criação de pagamento PIX');

    const body = await request.json();
    console.log('📋 Dados recebidos:', { ...body, telegram_user_id: body.telegram_user_id ? 'XXX' : 'null' });

    const {
      bot_id,
      plan_id,
      telegram_user_id,
      telegram_username,
      user_name,
      value_reais, // Valor em reais (ex: 19.90)
    } = body;

    // Validação básica
    if (!bot_id || !plan_id || !telegram_user_id || !value_reais) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios: bot_id, plan_id, telegram_user_id, value_reais'
      }, { status: 400 });
    }

    // Converter valor para centavos
    const valueInCents = convertToCents(value_reais);
    console.log(`💰 Valor: R$ ${value_reais} = ${valueInCents} centavos`);

    // Buscar informações do bot e plano
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', bot_id)
      .single();

    if (botError || !bot) {
      console.error('❌ Bot não encontrado:', botError);
      return NextResponse.json({
        success: false,
        error: 'Bot não encontrado'
      }, { status: 404 });
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('❌ Plano não encontrado:', planError);
      return NextResponse.json({
        success: false,
        error: 'Plano não encontrado'
      }, { status: 404 });
    }

    // Gerar ID único para o pagamento
    const paymentId = `payment_${Date.now()}_${telegram_user_id}`;

    // Criar PIX no PushinPay
    const pixResponse = await pushinPayAPI.createPushinPayment({
      amount: value_reais,
      description: `Pagamento - ${bot.name} - ${plan.name}`,
      external_reference: paymentId,
      expires_in_minutes: 30
    });

    if (!pixResponse.success || !pixResponse.data) {
      console.error('❌ Erro ao criar PIX:', pixResponse.error);
      return NextResponse.json({
        success: false,
        error: pixResponse.error || 'Erro ao gerar PIX'
      }, { status: 500 });
    }

    console.log('✅ PIX criado com sucesso:', pixResponse.data.id);

    // Salvar pagamento no banco de dados
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        bot_id,
        plan_id,
        telegram_user_id,
        telegram_username: telegram_username || null,
        user_name: user_name || null,
        amount: valueInCents,
        currency: 'BRL',
        status: 'pending',
        payment_method: 'pix',
        pushinpay_id: pixResponse.data.id,
        qr_code: pixResponse.data.qr_code,
        qr_code_base64: pixResponse.data.qr_code_base64,
        expires_at: pixResponse.data.expires_at,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao salvar pagamento:', paymentError);
      
      // Log do erro - PIX será cancelado automaticamente por expiração

      return NextResponse.json({
        success: false,
        error: 'Erro ao processar pagamento'
      }, { status: 500 });
    }

    console.log('✅ Pagamento salvo no banco:', payment.id);

    // Retornar dados do pagamento
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        qr_code: payment.qr_code,
        qr_code_base64: payment.qr_code_base64,
        amount: payment.amount,
        amount_formatted: (payment.amount / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        expires_at: payment.expires_at,
        status: payment.status,
        bot_name: bot.name,
        plan_name: plan.name,
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na criação de pagamento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 