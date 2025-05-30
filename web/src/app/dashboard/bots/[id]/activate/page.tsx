'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Bot,
  Users,
  Shield,
  ExternalLink,
  Info
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

interface BotData {
  id: string;
  name: string;
  token: string;
  is_activated: boolean;
  activated_at?: string;
  activated_by_telegram_id?: string;
}

export default function ActivateBotPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const params = React.use(paramsPromise);
  const botId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [bot, setBot] = useState<BotData | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [groupLink, setGroupLink] = useState('');
  const [validatingGroup, setValidatingGroup] = useState(false);
  const [groupValidationError, setGroupValidationError] = useState('');

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

    } catch (error) {
      console.error('Erro ao carregar bot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ativação via link do grupo
  const activateViaLink = async () => {
    if (!groupLink.trim()) {
      setGroupValidationError('Por favor, insira o link ou ID do grupo');
      return;
    }

    setValidatingGroup(true);
    setGroupValidationError('');

    try {
      // Obter o token de acesso atual
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Adicionar token no header se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/bots/auto-activate', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          botId: botId,
          groupLink: groupLink.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Bot ativado com sucesso
        setBot(prev => prev ? { ...prev, is_activated: true } : null);
        setShowSuccessMessage(true);
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push(`/dashboard/bots/${botId}?from=activation`);
        }, 2000);
      } else {
        setGroupValidationError(data.error || 'Erro ao ativar bot via link');
      }
    } catch (error) {
      console.error('Erro ao ativar via link:', error);
      setGroupValidationError('Erro interno. Tente novamente.');
    } finally {
      setValidatingGroup(false);
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
      
      if (!error && botData && botData.is_activated) {
        setBot(prev => prev ? { ...prev, is_activated: true, activated_at: botData.activated_at } : null);
        setShowSuccessMessage(true);
        
        // Redirecionar após mostrar sucesso
        setTimeout(() => {
          router.push(`/dashboard/bots/${botId}?from=activation`);
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  useEffect(() => {
    loadBotData();
  }, [botId]);

  // Verificar status a cada 5 segundos se não estiver ativado
  useEffect(() => {
    if (bot && !bot.is_activated) {
      const interval = setInterval(checkActivationStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [bot?.is_activated]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-white/60">Carregando dados do bot...</p>
          </div>
      </div>
      </DashboardLayout>
    );
  }

  if (!bot) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Bot não encontrado</h2>
          <p className="text-white/60 mb-6">O bot que você está procurando não existe ou foi removido.</p>
          <Button onClick={() => router.push('/dashboard/bots')} variant="outline">
            Voltar aos Bots
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Ativar Bot</h1>
            <p className="text-white/60">Configure seu bot {bot.name} para funcionar em grupos</p>
          </div>
        </div>

        {/* Mensagem de sucesso */}
        {showSuccessMessage && (
          <Card className="mb-8 bg-green-500/10 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                  <h3 className="text-green-400 font-semibold">Bot Ativado com Sucesso!</h3>
                  <p className="text-green-300 text-sm">Redirecionando para o painel do bot...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status do Bot */}
        <Card className="mb-8 bg-card border-border-light">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Bot className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">{bot.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${bot.is_activated ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                  <span className={`text-sm ${bot.is_activated ? 'text-green-400' : 'text-orange-400'}`}>
                    {bot.is_activated ? 'Ativado' : 'Aguardando Ativação'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!bot.is_activated ? (
          <div className="space-y-6">
            {/* Instruções */}
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-blue-400 font-semibold mb-2">Como ativar seu bot</h3>
                    <ol className="text-blue-300 text-sm space-y-2">
                      <li>1. Adicione seu bot ao grupo do Telegram como administrador</li>
                      <li>2. Copie o link do grupo ou obtenha o ID do grupo</li>
                      <li>3. Cole o link/ID no campo abaixo e clique em "Ativar Bot"</li>
                    </ol>
                  </div>
                  </div>
              </CardContent>
            </Card>

            {/* Ativação via Link */}
            <Card className="bg-card border-border-light">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-green-400" />
                  </div>
                  <CardTitle className="text-white">Ativar via Link do Grupo</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                  <div>
                  <Label htmlFor="groupLink" className="text-white/80 mb-2 block">
                      Link ou ID do Grupo
                    </Label>
                  <Input
                      id="groupLink"
                      type="text"
                      value={groupLink}
                    onChange={(e) => setGroupLink(e.target.value)}
                    placeholder="https://t.me/seugrupo ou -100123456789"
                    className="bg-white/5 border-white/20 text-white placeholder-white/50 focus:border-accent"
                    disabled={validatingGroup}
                  />
                  <p className="text-white/50 text-sm mt-1">
                    Aceita links públicos (t.me/grupo) ou IDs numéricos (-100123456789)
                  </p>
                </div>

                    {groupValidationError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                      <div className="text-red-300 text-sm whitespace-pre-line">
                        {groupValidationError}
                  </div>
                    </div>
                  </div>
                )}

                <Button
                    onClick={activateViaLink}
                  disabled={validatingGroup || !groupLink.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600"
                  >
                    {validatingGroup ? (
                      <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Validando e ativando...
                      </div>
                    ) : (
                    'Ativar Bot'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Dicas adicionais */}
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="text-yellow-400 font-semibold mb-2">Dicas importantes</h3>
                    <ul className="text-yellow-300 text-sm space-y-1">
                      <li>• O bot deve estar no grupo como administrador antes da ativação</li>
                      <li>• Para grupos privados, use o ID numérico (ex: -100123456789)</li>
                      <li>• Para obter o ID, adicione @userinfobot ao seu grupo</li>
                      <li>• Links de convite privados (+ABC123) não são suportados</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
                      </div>
                    ) : (
          <Card className="bg-card border-border-light">
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Bot Ativado!</h2>
              <p className="text-white/60 mb-6">
                Seu bot está funcionando e pronto para receber comandos no grupo.
              </p>
              <Button
                onClick={() => router.push(`/dashboard/bots/${botId}`)}
                className="bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90"
              >
                Ir para o Painel do Bot
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 