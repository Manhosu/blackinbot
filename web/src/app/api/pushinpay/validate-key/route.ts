import { NextRequest, NextResponse } from 'next/server';
import { validatePushinPayKey } from '@/lib/pushinpay';

/**
 * API para validar chave PushinPay
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔑 API de validação de chave PushinPay chamada');
    
    const { api_key } = await request.json();
    
    if (!api_key) {
      return NextResponse.json({
        success: false,
        error: 'Chave PushinPay é obrigatória'
      }, { status: 400 });
    }

    console.log('🔍 Validando chave PushinPay:', api_key.substring(0, 10) + '...');
    
    // Validar a chave fazendo uma chamada real para a API do PushinPay
    const validationResult = await validatePushinPayKey(api_key);
    
    if (validationResult.success) {
      console.log('✅ Chave PushinPay válida');
      return NextResponse.json({
        success: true,
        data: {
          valid: true,
          message: validationResult.data?.message || 'Chave PushinPay válida',
          balance: validationResult.data?.balance
        }
      });
    } else {
      console.log('❌ Chave PushinPay inválida:', validationResult.error);
      return NextResponse.json({
        success: false,
        error: validationResult.error || 'Chave PushinPay inválida'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Erro na API de validação:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
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