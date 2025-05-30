import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Armazenamento temporário de pagamentos
let serverPayments: any[] = [];

// URL base para webhooks
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3025';

/**
 * API para listar pagamentos de bots
 * Esta API simula o comportamento do Supabase para testes locais
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Buscar pagamentos dos bots
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        bots (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar pagamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Erro interno nos pagamentos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * API para criar um novo pagamento
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    const body = await request.json();
    const { bot_id, amount, payment_method, customer_data } = body;
    
    if (!bot_id || !amount) {
      return NextResponse.json({ error: 'Bot ID e valor são obrigatórios' }, { status: 400 });
    }
    
    // Criar novo pagamento
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        bot_id,
        amount,
        payment_method: payment_method || 'pix',
        customer_data: customer_data || {},
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar pagamento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Erro interno ao criar pagamento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
} 
