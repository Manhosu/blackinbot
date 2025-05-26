/**
 * Biblioteca PushinPay para integração com pagamentos PIX
 * Versão atualizada com suporte a saques
 */

const PUSHINPAY_API_KEY = process.env.PUSHINPAY_API_KEY;
const PUSHINPAY_BASE_URL = 'https://api.pushinpay.com.br/api/v1';

interface PushinPayPaymentData {
  amount: number;
  description: string;
  external_reference?: string;
  expires_in_minutes?: number;
  payer?: {
    name?: string;
    email?: string;
    document?: string;
  };
}

interface PushinPayWithdrawalData {
  amount: number;
  description: string;
  pix_key: string;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  recipient_name: string;
  recipient_document: string;
  external_reference?: string;
}

interface PushinPayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Realizar requisição para API do PushinPay
 */
async function makeRequest(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<PushinPayResponse> {
  try {
    if (!PUSHINPAY_API_KEY) {
      throw new Error('API Key do PushinPay não configurada');
    }

    const url = `${PUSHINPAY_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${PUSHINPAY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    console.log(`📡 PushinPay ${method} ${endpoint}:`, data ? JSON.stringify(data, null, 2) : 'no data');

    const response = await fetch(url, config);
    const responseData = await response.json();

    console.log(`📨 PushinPay Response [${response.status}]:`, responseData);

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || responseData.error || 'Erro na API do PushinPay',
        data: responseData
      };
    }

    return {
      success: true,
      data: responseData
    };

  } catch (error: any) {
    console.error('❌ Erro na requisição PushinPay:', error);
    return {
      success: false,
      error: error.message || 'Erro de conexão com PushinPay'
    };
  }
}

/**
 * Criar pagamento PIX
 */
export async function createPushinPayment(paymentData: PushinPayPaymentData): Promise<PushinPayResponse> {
  console.log('💳 Criando pagamento PIX via PushinPay...');
  
  const data = {
    amount: Math.round(paymentData.amount * 100), // Converter para centavos
    description: paymentData.description,
    external_reference: paymentData.external_reference,
    expires_in: paymentData.expires_in_minutes ? paymentData.expires_in_minutes * 60 : 900, // Default 15 min
    payment_method: 'pix',
    payer: paymentData.payer,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pushinpay`
  };

  const result = await makeRequest('/payments', 'POST', data);
  
  if (result.success && result.data) {
    console.log('✅ Pagamento PIX criado:', result.data.id);
    
    // Formatar resposta para consistência
    result.data = {
      ...result.data,
      amount: result.data.amount / 100, // Converter de volta para reais
      qr_code_image_url: result.data.qr_code_image || result.data.qr_code_url,
      expires_at: result.data.expires_at || new Date(Date.now() + (data.expires_in * 1000)).toISOString()
    };
  }

  return result;
}

/**
 * Consultar status de um pagamento
 */
export async function checkPushinPaymentStatus(paymentId: string): Promise<PushinPayResponse> {
  console.log('🔍 Consultando status do pagamento:', paymentId);
  
  const result = await makeRequest(`/payments/${paymentId}`);
  
  if (result.success && result.data) {
    console.log('📊 Status do pagamento:', result.data.status);
    
    // Normalizar status
    if (result.data.status === 'paid') {
      result.data.status = 'approved';
    }
    
    // Formatar valores
    if (result.data.amount) {
      result.data.amount = result.data.amount / 100;
    }
  }

  return result;
}

/**
 * Criar saque PIX
 */
export async function createPushinWithdrawal(withdrawalData: PushinPayWithdrawalData): Promise<PushinPayResponse> {
  console.log('💸 Criando saque PIX via PushinPay...');
  
  const data = {
    amount: Math.round(withdrawalData.amount * 100), // Converter para centavos
    description: withdrawalData.description,
    external_reference: withdrawalData.external_reference,
    pix_key: withdrawalData.pix_key,
    pix_key_type: withdrawalData.pix_key_type,
    recipient: {
      name: withdrawalData.recipient_name,
      document: withdrawalData.recipient_document.replace(/\D/g, '') // Apenas números
    },
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pushinpay/withdrawal`
  };

  const result = await makeRequest('/transfers', 'POST', data);
  
  if (result.success && result.data) {
    console.log('✅ Saque PIX criado:', result.data.id);
    
    // Formatar resposta
    result.data = {
      ...result.data,
      amount: result.data.amount / 100, // Converter de volta para reais
    };
  }

  return result;
}

/**
 * Consultar status de um saque
 */
export async function checkPushinWithdrawalStatus(withdrawalId: string): Promise<PushinPayResponse> {
  console.log('🔍 Consultando status do saque:', withdrawalId);
  
  const result = await makeRequest(`/transfers/${withdrawalId}`);
  
  if (result.success && result.data) {
    console.log('📊 Status do saque:', result.data.status);
    
    // Formatar valores
    if (result.data.amount) {
      result.data.amount = result.data.amount / 100;
    }
  }

  return result;
}

/**
 * Listar saques
 */
export async function listPushinWithdrawals(params?: {
  page?: number;
  limit?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}): Promise<PushinPayResponse> {
  console.log('📋 Listando saques...');
  
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  
  const endpoint = `/transfers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const result = await makeRequest(endpoint);
  
  if (result.success && result.data?.data) {
    // Formatar valores em todos os saques
    result.data.data = result.data.data.map((withdrawal: any) => ({
      ...withdrawal,
      amount: withdrawal.amount / 100
    }));
  }

  return result;
}

/**
 * Obter saldo disponível para saque
 */
export async function getPushinBalance(): Promise<PushinPayResponse> {
  console.log('💰 Consultando saldo PushinPay...');
  
  const result = await makeRequest('/account/balance');
  
  if (result.success && result.data) {
    console.log('💰 Saldo disponível:', result.data.balance / 100);
    
    // Formatar valores
    result.data = {
      ...result.data,
      balance: result.data.balance / 100,
      available_balance: result.data.available_balance ? result.data.available_balance / 100 : result.data.balance / 100,
      pending_balance: result.data.pending_balance ? result.data.pending_balance / 100 : 0
    };
  }

  return result;
}

/**
 * Validar chave PIX
 */
export async function validatePixKey(pixKey: string, pixKeyType: string): Promise<PushinPayResponse> {
  console.log('🔍 Validando chave PIX:', pixKeyType, pixKey.substring(0, 5) + '...');
  
  const data = {
    pix_key: pixKey,
    pix_key_type: pixKeyType
  };

  const result = await makeRequest('/pix/validate', 'POST', data);
  
  if (result.success) {
    console.log('✅ Chave PIX válida');
  } else {
    console.log('❌ Chave PIX inválida:', result.error);
  }

  return result;
}

/**
 * Webhook para receber notificações de transferência/saque
 */
export function createWithdrawalWebhookHandler() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      
      console.log('📨 Webhook de saque recebido:', {
        event: body.event,
        transfer_id: body.data?.id,
        status: body.data?.status
      });

      // Verificar se é um evento de transferência
      if (body.event !== 'transfer.status_changed') {
        console.log('ℹ️ Evento de saque ignorado:', body.event);
        return { received: true };
      }

      const transferId = body.data?.id;
      const newStatus = body.data?.status;
      
      if (!transferId || !newStatus) {
        console.error('❌ Dados do webhook de saque incompletos');
        return { error: 'Dados incompletos' };
      }

      // Aqui você processaria a atualização do status do saque
      // Exemplo: atualizar tabela withdrawals no Supabase
      
      return {
        received: true,
        processed: true,
        transfer_id: transferId,
        status: newStatus
      };

    } catch (error) {
      console.error('❌ Erro no webhook de saque:', error);
      return { error: 'Erro interno' };
    }
  };
}

/**
 * Utilitários para formatação
 */
export const PushinPayUtils = {
  /**
   * Formatar valor em reais
   */
  formatCurrency: (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  },

  /**
   * Traduzir status para português
   */
  translateStatus: (status: string): string => {
    const translations: Record<string, string> = {
      'pending': 'Pendente',
      'processing': 'Processando',
      'approved': 'Aprovado',
      'paid': 'Pago',
      'completed': 'Completo',
      'failed': 'Falhou',
      'cancelled': 'Cancelado',
      'expired': 'Expirado',
      'refunded': 'Reembolsado'
    };
    
    return translations[status] || status;
  },

  /**
   * Validar CPF
   */
  validateCPF: (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleaned)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cleaned.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    
    return checkDigit === parseInt(cleaned.charAt(10));
  },

  /**
   * Formatar chave PIX para exibição
   */
  formatPixKey: (pixKey: string, pixKeyType: string): string => {
    switch (pixKeyType) {
      case 'cpf':
        return pixKey.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      case 'cnpj':
        return pixKey.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      case 'phone':
        const cleaned = pixKey.replace(/\D/g, '');
        if (cleaned.length === 11) {
          return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
          return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return pixKey;
      case 'email':
        return pixKey.toLowerCase();
      case 'random':
        return pixKey.substring(0, 8) + '...' + pixKey.substring(pixKey.length - 4);
      default:
        return pixKey;
    }
  }
};

export const convertToCents = (value: number): number => Math.round(value * 100);

/**
 * Objeto principal da API PushinPay
 */
export const pushinPayAPI = {
  createPushinPayment,
  checkPushinPaymentStatus,
  createPushinWithdrawal,
  checkPushinWithdrawalStatus,
  listPushinWithdrawals,
  getPushinBalance,
  validatePixKey,
  createWithdrawalWebhookHandler,
  Utils: PushinPayUtils
};

export default {
  createPushinPayment,
  checkPushinPaymentStatus,
  createPushinWithdrawal,
  checkPushinWithdrawalStatus,
  listPushinWithdrawals,
  getPushinBalance,
  validatePixKey,
  createWithdrawalWebhookHandler,
  Utils: PushinPayUtils
}; 