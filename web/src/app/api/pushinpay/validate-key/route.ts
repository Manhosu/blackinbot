import { NextRequest, NextResponse } from 'next/server';
import { validatePushinPayKey } from '@/lib/pushinpay';

/**
 * API para validar chave PushinPay
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔑 API de validação de chave PushinPay chamada');
    
    const body = await request.json();
    const { api_key } = body;
    
    if (!api_key) {
      console.log('❌ Chave PushinPay não fornecida');
      return NextResponse.json({
        success: false,
        error: 'Chave PushinPay é obrigatória'
      }, { status: 400 });
    }

    if (typeof api_key !== 'string' || api_key.trim().length === 0) {
      console.log('❌ Chave PushinPay inválida (vazia ou tipo incorreto)');
      return NextResponse.json({
        success: false,
        error: 'Chave PushinPay deve ser uma string válida'
      }, { status: 400 });
    }

    const keyPreview = api_key.substring(0, 10) + '...';
    console.log('🔍 Validando chave PushinPay:', keyPreview);
    
    // Validar a chave fazendo uma chamada real para a API do PushinPay
    const validationResult = await validatePushinPayKey(api_key.trim());
    
    if (validationResult.success) {
      console.log('✅ Chave PushinPay válida');
      return NextResponse.json({
        success: true,
        data: {
          valid: true,
          message: validationResult.data?.message || 'Chave PushinPay válida e conectada com sucesso',
          key_preview: keyPreview,
          test_payment_id: validationResult.data?.test_payment_id,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ Chave PushinPay inválida:', validationResult.error);
      
      // Mapear erros comuns para mensagens mais amigáveis
      let friendlyError = validationResult.error;
      if (validationResult.error?.includes('unauthenticated')) {
        friendlyError = 'Chave PushinPay inválida. Verifique se a chave está correta e ativa.';
      } else if (validationResult.error?.includes('unauthorized')) {
        friendlyError = 'Chave PushinPay sem permissões necessárias. Verifique se tem permissão para criar pagamentos.';
      } else if (validationResult.error?.includes('network') || validationResult.error?.includes('connection')) {
        friendlyError = 'Erro de conexão com PushinPay. Tente novamente em alguns segundos.';
      }
      
      return NextResponse.json({
        success: false,
        error: friendlyError,
        original_error: validationResult.error,
        key_preview: keyPreview
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Erro na API de validação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * GET para informações sobre a API
 */
export async function GET() {
  return NextResponse.json({
    service: 'PushinPay Key Validation API',
    status: 'active',
    description: 'Validates PushinPay API keys before saving to database',
    timestamp: new Date().toISOString()
  });
} 