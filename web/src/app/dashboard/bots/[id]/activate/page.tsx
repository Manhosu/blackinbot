'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Key, 
  Clock, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Bot,
  Users,
  Shield
} from 'lucide-react';

interface BotData {
  id: string;
  name: string;
  token: string;
  is_activated: boolean;
  activated_at?: string;
  activated_by_telegram_id?: string;
}

interface ActivationCode {
  activation_code: string;
  expires_at: string;
  expires_in_minutes: number;
  instructions: string;
}

export default function ActivateBotPage() {
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bot, setBot] = useState<BotData | null>(null);
  const [activationCode, setActivationCode] = useState<ActivationCode | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [autoRenewing, setAutoRenewing] = useState(false);

  // Carregar dados do bot
  const loadBotData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Buscar bot
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('owner_id', user.id)
        .single();

      if (botError || !botData) {
        console.error('Bot não encontrado:', botError);
        router.push('/dashboard/bots');
        return;
      }

      setBot(botData);

      // Se bot não está ativado, verificar se há código ativo usando GET correto
      if (!botData.is_activated) {
        const response = await fetch(`/api/bots/generate-activation-code?bot_id=${botId}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.active_code) {
          setActivationCode({
            activation_code: data.active_code.activation_code,
            expires_at: data.active_code.expires_at,
            expires_in_minutes: Math.max(0, Math.floor((new Date(data.active_code.expires_at).getTime() - Date.now()) / (1000 * 60))),
            instructions: `Copie o código ${data.active_code.activation_code} e cole no grupo onde o bot está como administrador para ativá-lo.`
          });
        }
      }

    } catch (error) {
      console.error('Erro ao carregar bot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar código de ativação
  const generateActivationCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/bots/generate-activation-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ bot_id: botId }),
      });

      const data = await response.json();

      if (data.success) {
        setActivationCode(data);
        setTimeRemaining(data.expires_in_minutes * 60); // em segundos
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      alert('Erro ao gerar código de ativação');
    } finally {
      setGenerating(false);
    }
  };

  // Copiar código
  const copyCode = async () => {
    if (activationCode) {
      try {
        await navigator.clipboard.writeText(activationCode.activation_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  // Verificar status de ativação
  const checkActivationStatus = async () => {
    try {
      // Verificar diretamente no banco via Supabase
      const { data: botData, error } = await supabase
        .from('bots')
        .select('id, name, is_activated, activated_at')
        .eq('id', botId)
        .single();
      
      if (error) {
        console.error('Erro ao verificar status:', error);
        return;
      }
      
      if (botData && botData.is_activated) {
        setBot(prev => prev ? { ...prev, is_activated: true, activated_at: botData.activated_at } : null);
        setActivationCode(null);
        
        // Mostrar mensagem de sucesso
        setShowSuccessMessage(true);
        
        // Aguardar 2 segundos e redirecionar para a página de detalhes do bot
        setTimeout(() => {
          router.push(`/dashboard/bots/${botId}?from=activation`);
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  // Timer para expiração com renovação automática
  useEffect(() => {
    if (activationCode && timeRemaining > 0) {
      const timer = setInterval(() => {
                  setTimeRemaining(prev => {
            if (prev <= 1) {
              // Código expirou - gerar novo automaticamente
              console.log('🔄 Código expirado, gerando novo automaticamente...');
              setAutoRenewing(true);
              generateActivationCode();
              setTimeout(() => setAutoRenewing(false), 2000); // Remover indicador após 2s
              return 0;
            }
            return prev - 1;
          });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activationCode, timeRemaining]);

  // Auto-verificar ativação a cada 3 segundos (mais frequente)
  useEffect(() => {
    if (bot && !bot.is_activated) {
      const interval = setInterval(checkActivationStatus, 3000); // Mudado de 10000 para 3000
      return () => clearInterval(interval);
    }
  }, [bot]);

  useEffect(() => {
    loadBotData();
  }, [botId]);

  // Formatação de tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bot não encontrado</h1>
          <button
            onClick={() => router.push('/dashboard/bots')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar aos Bots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notificação de Sucesso */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">🎉 Bot ativado com sucesso!</p>
            <p className="text-sm opacity-90">Redirecionando para detalhes...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/bots/${botId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Bot
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔑 Ativar Bot
          </h1>
          <p className="text-gray-600">
            Gere um código de ativação para o bot "{bot.name}"
          </p>
        </div>

        {/* Status do Bot */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{bot.name}</h3>
              <p className="text-gray-600">Token: {bot.token.substring(0, 20)}...</p>
            </div>
            <div className="text-right">
              {bot.is_activated ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Ativado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Não Ativado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {bot.is_activated ? (
          /* Bot Ativado */
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">✅ Bot Ativado com Sucesso!</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p>• Seu bot está funcionando e pode receber usuários</p>
                  <p>• Usuários podem usar /start para ver os planos</p>
                  <p>• Acompanhe as vendas no dashboard financeiro</p>
                  {bot.activated_at && (
                    <p>• Ativado em: {new Date(bot.activated_at).toLocaleString('pt-BR')}</p>
                  )}
                </div>
                
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => router.push(`/dashboard/bots/${botId}`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    Ver Configurações
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/financeiro')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Ver Vendas
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Bot Não Ativado */
          <div className="space-y-6">
            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Como Ativar seu Bot
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>1.</strong> Gere um código de ativação clicando no botão abaixo</p>
                <p><strong>2.</strong> Adicione seu bot a um grupo do Telegram como administrador</p>
                <p><strong>3.</strong> Envie o código de ativação no grupo</p>
                <p><strong>4.</strong> O bot será ativado automaticamente</p>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  ⚠️ <strong>Importante:</strong> O código expira em 10 minutos e deve ser usado em um grupo onde o bot é administrador.
                </p>
              </div>
            </div>

            {/* Geração de Código */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🔑 Código de Ativação
              </h3>

              {activationCode ? (
                /* Código Gerado */
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Código de Ativação:</p>
                        <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                          {activationCode.activation_code}
                        </p>
                      </div>
                      <button
                        onClick={copyCode}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">
                      Expira em: {formatTime(timeRemaining)}
                    </span>
                    {autoRenewing && (
                      <span className="text-blue-600 text-sm flex items-center gap-1">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Renovando...
                      </span>
                    )}
                  </div>

                  {/* Instruções */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      📋 {activationCode.instructions}
                    </p>
                  </div>

                  {/* Aviso sobre renovação automática */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      🔄 <strong>Renovação Automática:</strong> Quando este código expirar, um novo será gerado automaticamente para sua conveniência.
                    </p>
                  </div>

                  {/* Botão para gerar novo código */}
                  <button
                    onClick={generateActivationCode}
                    disabled={generating}
                    className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {generating ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Gerando...
                      </div>
                    ) : (
                      'Gerar Novo Código'
                    )}
                  </button>
                </div>
              ) : (
                /* Gerar Código */
                <div className="text-center py-8">
                  <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6">
                    Clique no botão abaixo para gerar um código de ativação temporário
                  </p>
                  
                  <button
                    onClick={generateActivationCode}
                    disabled={generating}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {generating ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Gerando Código...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Gerar Código de Ativação
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Dicas */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-3">💡 Dicas Importantes</h4>
              <div className="text-sm text-gray-700 space-y-2">
                <p>• <strong>Grupos recomendados:</strong> Use grupos ou supergrupos para melhor funcionamento</p>
                <p>• <strong>Permissões:</strong> O bot deve ser administrador do grupo</p>
                <p>• <strong>Renovação automática:</strong> Novos códigos são gerados automaticamente quando expiram</p>
                <p>• <strong>Verificação:</strong> O status é atualizado automaticamente a cada 3 segundos</p>
                <p>• <strong>Redirecionamento:</strong> Após ativar, você será redirecionado automaticamente</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 