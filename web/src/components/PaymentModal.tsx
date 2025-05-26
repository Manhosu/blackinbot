'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Clock, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import Image from 'next/image';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  planId: string;
  planName: string;
  planPrice: number;
  botName: string;
  telegramUserId?: string;
  telegramUsername?: string;
  userName?: string;
}

interface PaymentData {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  amount: number;
  amount_formatted: string;
  expires_at: string;
  status: string;
  bot_name: string;
  plan_name: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  botId,
  planId,
  planName,
  planPrice,
  botName,
  telegramUserId,
  telegramUsername,
  userName
}: PaymentModalProps) {
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Criar pagamento quando modal abrir
  useEffect(() => {
    if (isOpen && !payment) {
      createPayment();
    }
  }, [isOpen]);

  // Timer para expiração
  useEffect(() => {
    if (payment?.expires_at) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expires = new Date(payment.expires_at).getTime();
        const diff = expires - now;
        
        if (diff > 0) {
          setTimeLeft(Math.floor(diff / 1000));
        } else {
          setTimeLeft(0);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [payment?.expires_at]);

  // Verificar status do pagamento periodicamente
  useEffect(() => {
    if (payment && payment.status === 'pending') {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 5000); // Verificar a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [payment]);

  const createPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('💳 Criando pagamento...');

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          plan_id: planId,
          telegram_user_id: telegramUserId || `demo_${Date.now()}`,
          telegram_username: telegramUsername,
          user_name: userName,
          value_reais: planPrice,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPayment(data.payment);
        console.log('✅ Pagamento criado:', data.payment.id);
      } else {
        setError(data.error || 'Erro ao criar pagamento');
        console.error('❌ Erro:', data.error);
      }
    } catch (err: any) {
      setError('Erro de conexão');
      console.error('❌ Erro ao criar pagamento:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!payment || checkingPayment) return;

    setCheckingPayment(true);
    try {
      const response = await fetch(`/api/payments/${payment.id}/status`);
      const data = await response.json();

      if (data.success && data.payment.status !== payment.status) {
        setPayment(prev => prev ? { ...prev, status: data.payment.status } : null);
        
        if (data.payment.status === 'paid') {
          // Pagamento aprovado!
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      }
    } catch (err) {
      console.error('❌ Erro ao verificar status:', err);
    } finally {
      setCheckingPayment(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'expired': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expired': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'cancelled': return <X className="w-5 h-5 text-gray-600" />;
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagamento Aprovado!';
      case 'expired': return 'Pagamento Expirado';
      case 'cancelled': return 'Pagamento Cancelado';
      default: return 'Aguardando Pagamento';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Finalizar Pagamento</h2>
            <p className="text-sm text-gray-600">{botName} - {planName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Gerando pagamento PIX...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={createPayment}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {payment && (
            <div className="space-y-6">
              {/* Status */}
              <div className={`flex items-center justify-center p-4 rounded-lg ${
                payment.status === 'paid' ? 'bg-green-50' : 
                payment.status === 'expired' ? 'bg-red-50' : 'bg-yellow-50'
              }`}>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(payment.status)}
                  <span className={`font-medium ${getStatusColor(payment.status)}`}>
                    {getStatusText(payment.status)}
                  </span>
                </div>
              </div>

              {payment.status === 'paid' && (
                <div className="text-center py-4">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-green-800 mb-2">
                    Pagamento Confirmado!
                  </h3>
                  <p className="text-green-700">
                    Você receberá as instruções de acesso em breve.
                  </p>
                </div>
              )}

              {payment.status === 'pending' && (
                <>
                  {/* Timer */}
                  {timeLeft > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Tempo restante:</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatTime(timeLeft)}
                      </p>
                    </div>
                  )}

                  {/* Valor */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Valor a pagar:</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {payment.amount_formatted}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Escaneie o QR Code com seu app de banco:
                    </p>
                    
                    {payment.qr_code_base64 ? (
                      <div className="flex justify-center mb-4">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                          <Image
                            src={`data:image/png;base64,${payment.qr_code_base64}`}
                            alt="QR Code PIX"
                            width={200}
                            height={200}
                            className="mx-auto"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center mb-4">
                        <div className="bg-gray-100 p-8 rounded-lg">
                          <QrCode className="w-32 h-32 text-gray-400 mx-auto" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Código PIX */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Ou copie o código PIX:
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={payment.qr_code}
                        readOnly
                        className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(payment.qr_code)}
                        className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                          copied 
                            ? 'bg-green-600 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {copied ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ Código copiado!
                      </p>
                    )}
                  </div>

                  {/* Instruções */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Como pagar:
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Abra o app do seu banco</li>
                      <li>2. Escolha a opção PIX</li>
                      <li>3. Escaneie o QR Code ou cole o código</li>
                      <li>4. Confirme o pagamento</li>
                      <li>5. Aguarde a confirmação automática</li>
                    </ol>
                  </div>

                  {/* Status de verificação */}
                  {checkingPayment && (
                    <div className="text-center">
                      <div className="animate-pulse text-blue-600">
                        🔄 Verificando pagamento...
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Pagamento seguro via PIX</span>
            <span>PushinPay</span>
          </div>
        </div>
      </div>
    </div>
  );
} 