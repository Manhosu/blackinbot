import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API para buscar detalhes de um pagamento específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = id;
    
    console.log('🔍 Buscando detalhes do pagamento:', paymentId);
    
    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'ID do pagamento é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        plans (
          name,
          price,
          period_days
        ),
        bots (
          name,
          owner_id
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
    
    // Verificar se pagamento não expirou
    const isExpired = payment.expires_at && new Date(payment.expires_at) < new Date();
    
    if (isExpired && payment.status === 'pending') {
      // Atualizar status para expirado
      await supabase
        .from('payments')
        .update({ status: 'expired' })
        .eq('id', paymentId);
      
      return NextResponse.json({
        success: false,
        error: 'Pagamento expirado',
        status: 'expired'
      }, { status: 410 });
    }
    
    // Preparar resposta
    const response = {
      success: true,
      payment_id: payment.id,
      amount: payment.amount,
      status: payment.status,
      pix_code: payment.pix_code,
      qr_code_url: payment.qr_code, // URL da imagem do QR code
      plan_name: payment.plans?.name,
      bot_name: payment.bots?.name,
      created_at: payment.created_at,
      expires_at: payment.expires_at,
      expired: isExpired,
      metadata: payment.metadata
    };
    
    console.log('✅ Detalhes do pagamento enviados');
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar detalhes do pagamento:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 