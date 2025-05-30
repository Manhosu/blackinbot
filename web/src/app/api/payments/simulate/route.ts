import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Armazenamento temporário de transações simuladas
let simulatedPayments: Record<string, any> = {};

// URL base para webhooks
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3025';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  
  try {
    // Obter dados da requisição
    const { transactionId, amount } = await request.json();
    
    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'ID da transação não fornecido' 
      }, { status: 400 });
    }
    
    console.log('🔍 Simulando pagamento para transação:', transactionId);
    
    // Verificar transação nos dados locais
    let localTransaction = null;
    
    try {
      // Buscar nos bots do localStorage
      const localBotsJSON = global.localStorage?.getItem('demo_bots') || '[]';
      const localBots = JSON.parse(localBotsJSON);
      
      // Procurar a transação em todos os bots
      for (const bot of localBots) {
        if (bot.transactions && Array.isArray(bot.transactions)) {
          const transaction = bot.transactions.find((tx: any) => tx.id === transactionId);
          
          if (transaction) {
            localTransaction = transaction;
            localTransaction.bot = bot;
            break;
          }
        }
      }
    } catch (localStorageError) {
      console.warn('⚠️ Erro ao buscar transação no localStorage:', localStorageError);
      }
      
    if (!localTransaction) {
        return NextResponse.json({
          success: false,
          error: 'Transação não encontrada'
        }, { status: 404 });
      }
    
    console.log('✅ Transação encontrada, atualizando status...');
      
    // Atualizar status da transação no localStorage
    try {
      const localBotsJSON = global.localStorage?.getItem('demo_bots') || '[]';
      const localBots = JSON.parse(localBotsJSON);
      
      // Encontrar o bot da transação
      const botIndex = localBots.findIndex((b: any) => b.id === localTransaction.bot_id);
      
      if (botIndex !== -1) {
        // Encontrar a transação
        const transactionIndex = localBots[botIndex].transactions?.findIndex(
          (tx: any) => tx.id === transactionId
        );
        
        if (transactionIndex !== -1 && transactionIndex !== undefined) {
          // Atualizar status da transação
          localBots[botIndex].transactions[transactionIndex].status = 'completed';
          localBots[botIndex].transactions[transactionIndex].paid_at = new Date().toISOString();
          
          // Atualizar estatísticas do bot
          const currentSales = parseInt(localBots[botIndex].totalSales || '0');
          const currentRevenue = parseFloat(localBots[botIndex].totalRevenue || '0');
          
          localBots[botIndex].totalSales = (currentSales + 1).toString();
          localBots[botIndex].totalRevenue = (currentRevenue + parseFloat(amount)).toFixed(2);
          
          // Salvar de volta no localStorage
          global.localStorage?.setItem('demo_bots', JSON.stringify(localBots));
          
          console.log('💰 Pagamento simulado com sucesso!');
          console.log('📊 Estatísticas atualizadas:', {
            sales: localBots[botIndex].totalSales,
            revenue: localBots[botIndex].totalRevenue
          });
          
          // Registrar o pagamento simulado
          simulatedPayments[transactionId] = {
            id: transactionId,
            status: 'completed',
            amount: parseFloat(amount),
            bot_id: localTransaction.bot_id,
            paid_at: new Date().toISOString()
          };
      
          // Simular webhook para o telegram
          try {
            console.log('📲 Enviando webhook para o Telegram...');
            
            // Enviar notificação para o usuário via webhook
            fetch(`${BASE_URL}/api/bots/webhook/${localTransaction.bot.token || 'dummy-token'}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                update_id: Date.now(),
                message: {
                  message_id: Date.now(),
                  from: {
                    id: localTransaction.user_id,
                    first_name: localTransaction.user_name.split(' ')[0],
                    last_name: localTransaction.user_name.split(' ').slice(1).join(' '),
                    username: localTransaction.user_name.toLowerCase().replace(/\s+/g, '_')
                  },
                  chat: {
                    id: localTransaction.chat_id,
                    type: 'private'
                  },
                  date: Math.floor(Date.now() / 1000),
                  text: '/start', // Simular comando de start
                  entities: [{ type: 'bot_command', offset: 0, length: 6 }]
                },
                _internal_payment_success: {
                  transaction_id: transactionId,
                  plan_id: localTransaction.plan_id,
                  amount: parseFloat(amount)
                }
              })
            }).catch(e => console.error('❌ Erro ao enviar webhook:', e));
            
          } catch (webhookError) {
            console.error('❌ Erro ao preparar webhook:', webhookError);
          }
          
    return NextResponse.json({
      success: true,
            message: 'Pagamento simulado com sucesso',
            transaction: {
              id: transactionId,
              status: 'completed',
              amount: parseFloat(amount),
              paid_at: new Date().toISOString()
            }
          });
        }
      }
      
      // Se chegou aqui, não encontrou a transação específica
      console.warn('⚠️ Transação encontrada, mas não pôde ser atualizada');
      
      return NextResponse.json({
        success: false,
        error: 'Não foi possível atualizar a transação'
      }, { status: 500 });
      
    } catch (updateError) {
      console.error('❌ Erro ao atualizar transação:', updateError);
      
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar transação'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro na simulação de pagamento:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno na simulação de pagamento'
    }, { status: 500 });
  }
}

// Rota para verificar status de pagamentos simulados
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id');
  
  if (!transactionId) {
    return NextResponse.json({
      success: false,
      error: 'ID da transação não fornecido'
    }, { status: 400 });
  }
  
  // Verificar se a transação existe e foi paga
  const payment = simulatedPayments[transactionId];
  
  if (payment) {
    return NextResponse.json({
      success: true,
      transaction: payment
    });
  }
  
  // Verificar no localStorage
  try {
    const localBotsJSON = global.localStorage?.getItem('demo_bots') || '[]';
    const localBots = JSON.parse(localBotsJSON);
    
    for (const bot of localBots) {
      if (bot.transactions && Array.isArray(bot.transactions)) {
        const transaction = bot.transactions.find((tx: any) => tx.id === transactionId);
        
        if (transaction) {
  return NextResponse.json({ 
            success: true,
            transaction: {
              id: transaction.id,
              status: transaction.status,
              amount: transaction.amount,
              paid_at: transaction.paid_at
            }
          });
        }
      }
    }
  } catch (localStorageError) {
    console.warn('⚠️ Erro ao buscar transação no localStorage:', localStorageError);
  }
  
  // Não encontrou
  return NextResponse.json({
    success: false,
    error: 'Transação não encontrada ou não processada'
  }, { status: 404 });
} 
