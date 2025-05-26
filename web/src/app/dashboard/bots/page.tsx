'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, getMyBots, setupMissingWebhooks } from '@/lib/bot-functions';
import BotCard from '@/components/BotCard';
import PageLoading from '@/components/PageLoading';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, refreshAuth, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Função para mostrar toast customizado
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'warning' = 'error') => {
    // Implementação simples de toast
    console.log(`${type.toUpperCase()}: ${title} - ${description}`);
  };

  // Função para buscar bots
  const fetchBots = async () => {
    console.log('🔄 Carregando bots...');
    try {
      setError(null);
      const userBots = await getMyBots();
      console.log(`✅ ${userBots.length} bots encontrados para o usuário`);
      setBots(userBots);
    } catch (error: any) {
      console.error('❌ Erro ao buscar bots:', error);
      setError('Erro ao carregar bots. Tente novamente.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar lista de bots (callback para BotCard)
  const handleBotUpdate = async () => {
    console.log('🔄 Atualizando lista de bots...');
    await fetchBots();
  };

  // Configuração automática de webhooks com reload
  const setupWebhooksAndRefresh = async () => {
    try {
      console.log('🔧 Iniciando configuração automática de webhooks...');
      const results = await setupMissingWebhooks();
      
      if (results && results.length > 0) {
        console.log('✅ Configuração de webhooks concluída, recarregando lista...');
        // Aguardar um momento para o banco processar as atualizações
        setTimeout(async () => {
          await fetchBots();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Erro na configuração automática de webhooks:', error);
    }
  };

  // Inicialização quando o contexto de autenticação estiver pronto
  if (!authLoading && !hasInitialized) {
    setHasInitialized(true);
    fetchBots().then(() => {
      // Após carregar os bots, verificar e configurar webhooks automaticamente
      setupWebhooksAndRefresh();
    });
  }

  // Função de refresh manual
  const handleRefresh = async () => {
    setLoading(true);
    await fetchBots();
  };

  // Função para criar um novo bot
  const handleCreateBot = () => {
    if (!isAuthenticated) {
      showToast(
        'Erro de autenticação',
        'Você precisa estar logado para criar um bot.'
      );
      router.push('/login');
      return;
    }
    
    router.push('/dashboard/bots/create');
  };

  // Enquanto verifica autenticação, mostrar loading
  if (authLoading) {
    return <PageLoading message="Verificando autenticação..." />;
  }

  if (loading) {
    return <PageLoading message="Carregando seus bots..." />;
  }
  
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white">Seus Bots</h1>
            <p className="text-white/60">
              Gerencie seus bots de Telegram e configure integrações
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              leftIcon={<FiRefreshCw className={loading ? 'animate-spin' : ''} />}
            >
              Atualizar
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreateBot}
              leftIcon={<FiPlus />}
            >
              Criar Bot
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">!</span>
              </div>
              <div>
                <h3 className="text-red-400 font-medium">Erro!</h3>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!error && bots.length === 0 ? (
          <EmptyState
            title="Nenhum bot encontrado"
            description="Você ainda não criou nenhum bot. Crie seu primeiro bot para começar."
            actionLabel="Criar Bot"
            onAction={handleCreateBot}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <BotCard key={bot.id} bot={bot} onUpdate={handleBotUpdate} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 