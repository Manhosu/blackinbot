import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPushinWithdrawal } from '@/lib/pushinpay';

/**
 * API para solicitar saque PIX
 */
export async function POST(request: NextRequest) {
  try {
    const { amount, description } = await request.json();
    
    console.log('💸 Solicitação de saque recebida:', {
      amount,
      description: description || 'Saque PIX'
    });
    
    // Validações básicas
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Valor é obrigatório e deve ser numérico'
      }, { status: 400 });
    }
    
    if (amount < 5) {
      return NextResponse.json({
        success: false,
        error: 'Valor mínimo para saque é R$ 5,00'
      }, { status: 400 });
    }
    
    if (amount > 10000) {
      return NextResponse.json({
        success: false,
        error: 'Valor máximo para saque é R$ 10.000,00'
      }, { status: 400 });
    }
    
    // Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não autenticado'
      }, { status: 401 });
    }
    
    // Buscar dados financeiros do usuário
    const { data: userFinances, error: financeError } = await supabase
      .from('user_finances')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (financeError || !userFinances) {
      return NextResponse.json({
        success: false,
        error: 'Dados financeiros não encontrados'
      }, { status: 404 });
    }
    
    // Verificar se tem chave PIX configurada
    if (!userFinances.pix_key || !userFinances.pix_key_type) {
      return NextResponse.json({
        success: false,
        error: 'Configure sua chave PIX antes de solicitar saques',
        redirect: '/dashboard/financeiro/configurar'
      }, { status: 400 });
    }
    
    // Verificar saldo disponível
    if (userFinances.available_balance < amount) {
      return NextResponse.json({
        success: false,
        error: 'Saldo insuficiente',
        available_balance: userFinances.available_balance,
        requested_amount: amount
      }, { status: 400 });
    }
    
    // Processar solicitação de saque usando RPC
    const { data: withdrawalResult, error: withdrawalError } = await supabase
      .rpc('process_withdrawal_request', {
        p_user_id: user.id,
        p_amount: amount,
        p_description: description || 'Saque PIX'
      });
    
    if (withdrawalError) {
      console.error('❌ Erro ao processar saque:', withdrawalError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao processar solicitação de saque'
      }, { status: 500 });
    }
    
    if (!withdrawalResult.success) {
      return NextResponse.json({
        success: false,
        error: withdrawalResult.error || 'Erro ao processar saque'
      }, { status: 400 });
    }
    
    const withdrawalId = withdrawalResult.withdrawal_id;
    
    // Criar saque no PushinPay
    try {
      const pushinWithdrawal = await createPushinWithdrawal({
        amount: amount,
        description: description || `Saque PIX - ${withdrawalId}`,
        pix_key: userFinances.pix_key,
        pix_key_type: userFinances.pix_key_type as any,
        recipient_name: userFinances.account_holder_name || 'Usuário',
        recipient_document: userFinances.account_holder_document || '',
        external_reference: `withdrawal_${withdrawalId}`
      });
      
      if (pushinWithdrawal.success && pushinWithdrawal.data) {
        // Atualizar registro de saque com ID do PushinPay
        const { error: updateError } = await supabase
          .from('withdrawals')
          .update({
            pushinpay_id: pushinWithdrawal.data.id,
            status: 'processing',
            metadata: {
              pushinpay_created_at: new Date().toISOString(),
              pushinpay_data: pushinWithdrawal.data
            }
          })
          .eq('id', withdrawalId);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar saque:', updateError);
        }
        
        console.log('✅ Saque criado no PushinPay:', pushinWithdrawal.data.id);
        
        // Resposta de sucesso
        return NextResponse.json({
          success: true,
          withdrawal_id: withdrawalId,
          pushinpay_id: pushinWithdrawal.data.id,
          amount: amount,
          status: 'processing',
          message: 'Saque solicitado com sucesso! Será processado em até 24 horas.',
          estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          new_available_balance: withdrawalResult.new_available_balance
        });
        
      } else {
        // Erro no PushinPay - reverter saque
        console.error('❌ Erro no PushinPay:', pushinWithdrawal.error);
        
        // Cancelar saque
        await supabase.rpc('cancel_withdrawal', {
          p_withdrawal_id: withdrawalId,
          p_reason: `Erro no processamento: ${pushinWithdrawal.error}`
        });
        
        return NextResponse.json({
          success: false,
          error: 'Erro no processamento do saque. Tente novamente em alguns minutos.',
          details: pushinWithdrawal.error
        }, { status: 500 });
      }
      
    } catch (pushinError: any) {
      console.error('❌ Erro no PushinPay:', pushinError);
      
      // Cancelar saque em caso de erro
      await supabase.rpc('cancel_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_reason: `Erro de conexão: ${pushinError?.message || 'Erro desconhecido'}`
      });
      
      return NextResponse.json({
        success: false,
        error: 'Erro de conexão com o sistema de pagamentos. Tente novamente.'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao processar saque:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * GET para verificar status da API
 */
export async function GET() {
  return NextResponse.json({
    service: 'Withdrawal Request API',
    status: 'online',
    timestamp: new Date().toISOString(),
    limits: {
      min_amount: 5.00,
      max_amount: 10000.00,
      processing_time: '24 hours',
      fee: 'Free'
    }
  });
} 