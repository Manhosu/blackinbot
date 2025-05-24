"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Bot, MessageCircle, Loader2 } from "lucide-react";

export default function TestBotPage() {
  const { user, isAuthenticated } = useAuth();
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [chatId, setChatId] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBots();
    }
  }, [user]);

  const loadBots = async () => {
    try {
      setLoading(true);
      
      // Buscar bots do banco de dados via API
      const response = await fetch('/api/bots');
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar bots: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBots(data.bots || []);
        console.log('🤖 Bots carregados para teste:', data.bots?.length || 0);
      } else {
        throw new Error(data.error || 'Erro ao carregar bots');
      }
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      toast.error('Erro ao carregar bots');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!selectedBot || !chatId) {
      toast.error('Selecione um bot e informe um Chat ID');
      return;
    }

    setSending(true);
    try {
      console.log('🧪 Testando bot:', selectedBot.name);
      console.log('📱 Chat ID:', chatId);
      
      const response = await fetch('/api/telegram/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: selectedBot.token,
          chatId: chatId,
          welcomeMessage: selectedBot.welcome_message || 'Olá! Bem-vindo ao nosso bot! 🎉',
          welcomeMediaUrl: selectedBot.welcome_media_url,
          plans: [
            {
              name: 'Acesso VIP ao grupo',
              price: '1,00',
              period: '30'
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('✅ Mensagem enviada com sucesso!');
        console.log('✅ Resposta do Telegram:', data.telegram_response);
      } else {
        toast.error(`❌ Erro: ${data.error}`);
        console.error('❌ Erro do Telegram:', data.telegram_error);
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="heading-2 mb-2">Testar Bots</h1>
          <p className="text-white/60">Teste o funcionamento dos seus bots enviando mensagens manualmente.</p>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border-light">
          <div className="space-y-6">
            {/* Seleção do Bot */}
            <div>
              <label className="block text-white/70 mb-2">Selecionar Bot</label>
              {bots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bots.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => setSelectedBot(bot)}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedBot?.id === bot.id
                          ? 'border-accent bg-accent/10'
                          : 'border-border-light bg-primary/5 hover:bg-primary/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <Bot size={20} className="text-accent" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{bot.name}</div>
                          <div className="text-sm text-white/60">
                            {bot.status === 'demo' ? '🟡 Demo' : '🟢 Ativo'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  Nenhum bot encontrado. Crie um bot primeiro.
                </div>
              )}
            </div>

            {/* Informações do Bot Selecionado */}
            {selectedBot && (
              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <h3 className="font-medium mb-2">Bot Selecionado: {selectedBot.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Token:</span>
                    <div className="font-mono bg-black/20 p-2 rounded mt-1">
                      {selectedBot.token?.substring(0, 20)}...
                    </div>
                  </div>
                  <div>
                    <span className="text-white/60">Status:</span>
                    <div className={`mt-1 ${selectedBot.status === 'demo' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {selectedBot.status === 'demo' ? 'Modo Demonstração' : 'Ativo'}
                    </div>
                  </div>
                </div>
                
                {selectedBot.welcome_message && (
                  <div className="mt-3">
                    <span className="text-white/60">Mensagem de Boas-vindas:</span>
                    <div className="bg-black/20 p-3 rounded mt-1 whitespace-pre-wrap">
                      {selectedBot.welcome_message}
                    </div>
                  </div>
                )}
                
                {selectedBot.welcome_media_url && (
                  <div className="mt-3">
                    <span className="text-white/60">Mídia:</span>
                    <div className="text-accent text-sm mt-1">✓ Mídia de boas-vindas configurada</div>
                  </div>
                )}
              </div>
            )}

            {/* Chat ID */}
            <div>
              <label className="block text-white/70 mb-2">
                Chat ID para Teste 
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="input-auth w-full"
                placeholder="Ex: 123456789 ou @username"
              />
              <p className="text-xs text-white/40 mt-1">
                Digite seu próprio chat ID ou de um grupo de teste. Para obter seu chat ID, envie /start para @userinfobot
              </p>
            </div>

            {/* Botão de Teste */}
            <div className="flex justify-end">
              <Button
                onClick={sendTestMessage}
                disabled={!selectedBot || !chatId || sending}
                className="flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Testar Bot
                  </>
                )}
              </Button>
            </div>

            {/* Instruções */}
            <div className="bg-info/10 border border-info/30 rounded-lg p-4">
              <h4 className="font-medium text-info mb-2">📋 Como usar este teste:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-white/70">
                <li>Selecione um bot criado</li>
                <li>Obtenha seu Chat ID enviando /start para @userinfobot no Telegram</li>
                <li>Cole o Chat ID no campo acima</li>
                <li>Clique em "Testar Bot" para enviar a mensagem de boas-vindas</li>
                <li>Verifique se recebeu a mensagem com a imagem e os planos</li>
              </ol>
              
              <div className="mt-3 pt-3 border-t border-info/20">
                <p className="text-xs text-white/60">
                  💡 <strong>Dica:</strong> Este teste simula o que aconteceria quando alguém envia /start para seu bot.
                  Em produção, isso aconteceria automaticamente via webhook.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 