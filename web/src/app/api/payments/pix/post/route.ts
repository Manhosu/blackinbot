import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Storage temporário no servidor
let serverTransactions: any[] = [];

// URL base para webhooks e pagamentos
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3025';

export async function POST(request: Request) {
  try {
    // Simular usuário local para desenvolvimento
    const user = { id: `local_${Date.now()}` };
    console.log('🔧 Usando usuário local para POST específico de PIX');
    
    // Obter dados da requisição
    const requestData = await request.json();
    const { botId, planIndex, userId, userName, chatId, botData } = requestData;
    
    if (!botId || planIndex === undefined || !userId || !userName || !chatId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Parâmetros incompletos' 
      }, { status: 400 });
    }
    
    console.log('🧪 Gerando pagamento PIX no endpoint específico POST');
    console.log('📊 Bot ID:', botId);
    console.log('👤 Usuário:', userName, `(${userId})`);
    console.log('💬 Chat ID:', chatId);
    
    // Usar sempre o botData do request (modo local)
    const finalBotData = botData;
    
    if (!finalBotData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dados do bot não fornecidos no request' 
      }, { status: 400 });
    }
    
    // Obter planos do bot
    let botPlans = [];
    
    if (finalBotData.plans && Array.isArray(finalBotData.plans)) {
      // Usar planos no formato de array
      botPlans = finalBotData.plans;
    } else if (finalBotData.plan_name && finalBotData.plan_price) {
      // Criar array de planos a partir dos campos antigos
      botPlans = [{
        id: 'main_plan',
        name: finalBotData.plan_name,
        price: parseFloat(finalBotData.plan_price) || 0,
        days_access: parseInt(finalBotData.plan_days) || 30,
        period_label: `${parseInt(finalBotData.plan_days) || 30} dias`,
        is_active: true,
        bot_id: finalBotData.id
      }];
      
      // Adicionar planos adicionais se existirem
      if (finalBotData.additional_plans && Array.isArray(finalBotData.additional_plans)) {
        botPlans = [
          ...botPlans,
          ...finalBotData.additional_plans.map((plan: any, index: number) => ({
            id: plan.id || `additional_plan_${index}`,
            name: plan.name,
            price: parseFloat(plan.price) || 0,
            days_access: parseInt(plan.days_access) || 30,
            period_label: `${parseInt(plan.days_access) || 30} dias`,
            is_active: true,
            bot_id: finalBotData.id
          }))
        ];
      }
    }
    
    // Verificar se o índice do plano é válido
    if (planIndex >= botPlans.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Plano não encontrado' 
      }, { status: 404 });
    }
    
    // Obter o plano selecionado
    const selectedPlan = botPlans[planIndex];
    const planPrice = parseFloat(selectedPlan.price.toString());
    
    if (planPrice < 4.90) {
      return NextResponse.json({ 
        success: false, 
        error: 'O valor mínimo por plano é R$ 4,90' 
      }, { status: 400 });
    }
    
    console.log('💲 Plano selecionado:', selectedPlan.name, `(R$ ${planPrice.toFixed(2)})`);
    
    // Gerar ID único para a transação
    const transactionId = `pix_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    
    // Simular criação de dados PIX
    const pixData = {
      transactionId,
      amount: planPrice,
      qrCode: `00020101021226870014br.gov.bcb.pix2565qrcodepix-h.bb.com.br/pix/v2/4eb35a76-8c9b-4491-a079-8ebb32b24afe5204000053039865802BR5925NOME EMPRESA TESTE6008BRASILIA62070503***6304${(Math.random() * 10000).toFixed(0).padStart(4, '0')}`,
      copiaECola: `00020101021226870014br.gov.bcb.pix2565qrcodepix-h.bb.com.br/pix/v2/4eb35a76-8c9b-4491-a079-8ebb32b24afe5204000053039865802BR5925NOME EMPRESA TESTE6008BRASILIA62070503***6304${(Math.random() * 10000).toFixed(0).padStart(4, '0')}`,
      userId,
      userName,
      chatId,
      botId: finalBotData.id,
      planId: selectedPlan.id,
      plan: selectedPlan,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    };
    
    // Adicionar a transação à memória do servidor
    try {
      // Salvar na lista de transações do servidor
      serverTransactions.push({
        id: transactionId,
        bot_id: finalBotData.id,
        user_id: userId,
        user_name: userName,
        chat_id: chatId,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        amount: planPrice,
        status: 'pending',
        pix_code: pixData.copiaECola,
        pix_qrcode: pixData.qrCode,
        created_at: pixData.createdAt,
        expires_at: pixData.expiresAt
      });
      
      console.log('✅ Transação salva no servidor:', transactionId);
    } catch (error) {
      console.error('❌ Erro ao salvar transação:', error);
      // Continuar mesmo com erro
    }
    
    // Retornar dados do PIX
    return NextResponse.json({
      success: true,
      transactionId,
      botId: finalBotData.id,
      userId,
      userName,
      chatId,
      plan: selectedPlan,
      amount: planPrice,
      qrCode: pixData.qrCode,
      copiaECola: pixData.copiaECola,
      expiresAt: pixData.expiresAt
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno ao gerar PIX'
    }, { status: 500 });
  }
} 