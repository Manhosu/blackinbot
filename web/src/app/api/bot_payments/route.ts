import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('created_at');
    const botId = searchParams.get('bot_id');
    
    console.log('🔍 Buscando pagamentos com filtros:', { status, startDate, botId });
    
    // Buscar dados do localStorage
    let allPayments: any[] = [];
    
    try {
      // Não podemos acessar localStorage diretamente do servidor
      // Vamos simular os dados com os pagamentos em memória
      allPayments = [...serverPayments];
      
      console.log(`✅ Encontrados ${allPayments.length} pagamentos (servidor)`);
      
      // Aplicar filtros
      let filteredPayments = [...allPayments];
      
      // Filtrar por status
      if (status) {
        filteredPayments = filteredPayments.filter(p => p.status === status);
      }
      
      // Filtrar por data
      if (startDate) {
        const dateFilter = new Date(startDate);
        filteredPayments = filteredPayments.filter(p => new Date(p.created_at) >= dateFilter);
      }
      
      // Filtrar por bot_id
      if (botId) {
        filteredPayments = filteredPayments.filter(p => p.bot_id === botId);
      }
      
      // Ordenar por data (mais recente primeiro)
      filteredPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return NextResponse.json({
        data: filteredPayments,
        error: null
      });
    } catch (localError) {
      console.error('❌ Erro ao processar pagamentos:', localError);
      
      // Retornar array vazio em caso de erro
      return NextResponse.json({
        data: [],
        error: null
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar pagamentos:', error);
    
    return NextResponse.json({
      data: null,
      error: {
        message: 'Erro interno ao buscar pagamentos',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}

/**
 * API para criar um novo pagamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, userId, amount, status = 'pending', planId, planName, userName } = body;
    
    if (!botId || !userId || !amount) {
      return NextResponse.json({
        data: null,
        error: {
          message: 'Dados incompletos'
        }
      }, { status: 400 });
    }
    
    // Criar novo pagamento
    const newPayment = {
      id: `payment_${uuidv4().substring(0, 8)}`,
      bot_id: botId,
      user_id: userId,
      amount: parseFloat(amount),
      status,
      created_at: new Date().toISOString(),
      payout_status: null,
      plan_id: planId || 'default_plan',
      plan_name: planName || 'Plano Padrão',
      user_name: userName || 'Usuário'
    };
    
    // Adicionar ao armazenamento do servidor
    serverPayments.push(newPayment);
    console.log('✅ Pagamento criado e armazenado no servidor:', newPayment.id);
    
    return NextResponse.json({
      data: newPayment,
      error: null
    });
  } catch (error) {
    console.error('❌ Erro ao criar pagamento:', error);
    
    return NextResponse.json({
      data: null,
      error: {
        message: 'Erro interno ao criar pagamento',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
} 