import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Verifica se um usuário tem acesso a um bot
 */
export async function POST(request: NextRequest) {
  try {
    const { bot_id, telegram_user_id } = await request.json();
    
    if (!bot_id || !telegram_user_id) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios: bot_id, telegram_user_id'
      }, { status: 400 });
    }
    
    // Verificar acesso do usuário através de pagamentos aprovados
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        plans!inner(name, period_days)
      `)
      .eq('bot_id', bot_id)
      .eq('telegram_user_id', telegram_user_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Erro ao verificar acesso:', error);
      return NextResponse.json({
        has_access: false,
        error: 'Erro ao verificar acesso'
      }, { status: 500 });
    }
    
    if (!payments || payments.length === 0) {
      return NextResponse.json({
        has_access: false
      });
    }
    
    const payment = payments[0];
    const plan = payment.plans;
    
    // Calcular data de expiração baseada no pagamento
    const paymentDate = new Date(payment.paid_at || payment.created_at);
    const expirationDate = new Date(paymentDate);
    expirationDate.setDate(expirationDate.getDate() + (plan.period_days || 30));
    
    // Verificar se ainda está válido
    const now = new Date();
    if (expirationDate < now) {
      return NextResponse.json({
        has_access: false
      });
    }
    
    return NextResponse.json({
      has_access: true,
      access_info: {
        plan_name: plan.name,
        expires_at: expirationDate.toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('Erro ao verificar acesso:', error);
    return NextResponse.json({
      has_access: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 