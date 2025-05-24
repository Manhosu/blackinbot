import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Armazenamento temporário de pagamentos no servidor
let serverPayments: any[] = [];

// Rota para lidar com solicitações gerais de pagamento
export async function POST(request: Request) {
  try {
    // Simular um usuário local para desenvolvimento
    const user = { id: `local_${Date.now()}` };
    console.log('🔧 Usando usuário local para API de pagamentos');
    
    // Obter dados da requisição
    const requestData = await request.json();
    
    // Verificar se é um redirecionamento para PIX
    const { paymentType, botId, userId, amount, status, planId, planName, userName } = requestData;
    
    // Se for pagamento PIX, redirecionar para o endpoint específico
    if (paymentType === 'pix') {
      // Redirecionar para o endpoint específico de PIX
      const response = await fetch(`${new URL(request.url).origin}/api/payments/pix/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // Retornar a resposta do endpoint específico
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
    
    // Processamento de pagamento genérico
    if (!botId || !userId || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Dados incompletos para o pagamento'
      }, { status: 400 });
    }
    
    console.log('📊 Processando pagamento para:', {
      botId,
      userId,
      userName,
      amount
    });
    
    // Criar novo pagamento
    const paymentId = `payment_${uuidv4().substring(0, 8)}`;
    const newPayment = {
      id: paymentId,
      bot_id: botId,
      user_id: userId,
      amount: parseFloat(amount),
      status: status || 'pending',
      created_at: new Date().toISOString(),
      payout_status: null,
      plan_id: planId || 'default_plan',
      plan_name: planName || 'Plano Padrão',
      user_name: userName || 'Usuário',
      pix_code: `00020101021226870014br.gov.bcb.pix2565qrcodepix-h.bb.com.br/pix/v2/4eb35a76-8c9b-4491-a079-8ebb32b24afe5204000053039865802BR5925NOME EMPRESA TESTE6008BRASILIA62070503***6304${(Math.random() * 10000).toFixed(0).padStart(4, '0')}`,
      pix_qrcode: `00020101021226870014br.gov.bcb.pix2565qrcodepix-h.bb.com.br/pix/v2/4eb35a76-8c9b-4491-a079-8ebb32b24afe5204000053039865802BR5925NOME EMPRESA TESTE6008BRASILIA62070503***6304${(Math.random() * 10000).toFixed(0).padStart(4, '0')}`
    };
    
    // Adicionar ao armazenamento do servidor
    serverPayments.push(newPayment);
    console.log('✅ Pagamento criado com sucesso:', paymentId);
    
    return NextResponse.json({
      success: true,
      payment: newPayment
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno ao processar pagamento'
    }, { status: 500 });
  }
}

// Rota para verificar o status do serviço
export async function GET() {
  return NextResponse.json({
    status: 'API de Pagamentos ativa',
    supportedPaymentTypes: ['pix', 'generic'],
    timestamp: new Date().toISOString()
  });
} 