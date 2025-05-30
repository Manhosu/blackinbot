'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, getMyBots } from '@/lib/bot-functions';
import BotCard from '@/components/BotCard';
import PageLoading from '@/components/PageLoading';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// 🚀 Loading otimizado para página de bots
const BotsPageSkeleton = () => (
  <DashboardLayout>
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="space-y-1">
          <div className="h-8 bg-white/10 rounded-lg w-48"></div>
          <div className="h-5 bg-white/10 rounded-lg w-64"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-white/10 rounded-lg w-24"></div>
          <div className="h-10 bg-white/10 rounded-lg w-28"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 bg-white/10 rounded-xl"></div>
        ))}
      </div>
    </div>
  </DashboardLayout>
);

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, refreshAuth, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // 🚀 OTIMIZAÇÃO: Carregamento instantâneo com cache
  useEffect(() => {
    if (!authLoading && !hasInitialized) {
      setHasInitialized(true);
      
      // Tentar carregar do cache primeiro para resposta instantânea
      const cached = loadBotsFromCache();
      if (cached && cached.length > 0) {
        console.log('⚡ Bots carregados do cache:', cached.length);
        setBots(cached);
        setLoading(false);
        
        // Atualizar em background
        setTimeout(() => {
          fetchBots(false);
        }, 100);
      } else {
        // Carregar normalmente se não há cache
        fetchBots(true);
      }
    }
  }, [authLoading, hasInitialized]);

  // 🚀 Função para carregar bots do cache
  const loadBotsFromCache = (): Bot[] => {
    try {
      const cached = localStorage.getItem('my_bots_cache');
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Cache válido por 3 minutos
        if (data.timestamp && (now - data.timestamp) < 3 * 60 * 1000) {
          return data.bots || [];
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar cache de bots:', error);
    }
    return [];
  };

  // 🚀 Função para salvar bots no cache
  const saveBotsToCache = (bots: Bot[]) => {
    try {
      const data = {
        bots,
        timestamp: Date.now()
      };
      localStorage.setItem('my_bots_cache', JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar cache de bots:', error);
    }
  };

  // 🚀 Função otimizada para buscar bots
  const fetchBots = async (showMainLoading = true) => {
    console.log('🔄 Carregando bots...');
    try {
      setError(null);
      
      if (showMainLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // 🔧 CORREÇÃO: Usar fetch direto para a API corrigida
      const response = await fetch('/api/bots', {
        method: 'GET',
        credentials: 'include', // Incluir cookies de sessão
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Resposta da API bots:', data);
      
      if (data.success) {
        const userBots = data.bots || [];
        console.log(`✅ ${userBots.length} bots encontrados para o usuário`);
        setBots(userBots);
        saveBotsToCache(userBots);
      } else {
        throw new Error(data.error || 'Erro desconhecido ao buscar bots');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar bots:', error);
      setError('Erro ao carregar bots. Tente novamente.');
      setBots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Função para atualizar lista de bots (callback para BotCard)
  const handleBotUpdate = async () => {
    console.log('🔄 Atualizando lista de bots...');
    setRefreshing(true);
    
    try {
      setError(null);
      
      // Limpar cache para forçar atualização
      localStorage.removeItem('my_bots_cache');
      
      // Aguardar um pouco para garantir que o banco processou
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 🔧 CORREÇÃO: Usar fetch direto para a API corrigida
      const response = await fetch('/api/bots', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const userBots = data.bots || [];
        console.log(`✅ ${userBots.length} bots encontrados após atualização`);
        setBots(userBots);
        saveBotsToCache(userBots);
      } else {
        throw new Error(data.error || 'Erro desconhecido ao buscar bots');
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar bots:', error);
      setError('Erro ao carregar bots. Tente novamente.');
      setBots([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Função de refresh manual
  const handleRefresh = async () => {
    localStorage.removeItem('my_bots_cache'); // Limpar cache
    await fetchBots(false);
    toast.success('Lista de bots atualizada!');
  };

  // Função para criar um novo bot
  const handleCreateBot = () => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado para criar um bot.');
      router.push('/login');
      return;
    }
    
    router.push('/dashboard/bots/create');
  };

  // Loading inicial
  if (authLoading) {
    return <PageLoading message="Verificando autenticação..." />;
  }

  if (loading) {
    return <BotsPageSkeleton />;
  }
  
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fadeIn">
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
              disabled={refreshing}
              leftIcon={refreshing ? <Loader2 className="animate-spin" /> : <FiRefreshCw />}
              className="transition-all duration-200 hover:scale-105"
            >
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreateBot}
              leftIcon={<FiPlus />}
              className="transition-all duration-200 hover:scale-105"
            >
              Criar Bot
            </Button>
          </div>
        </div>

        {/* Indicador de atualização em background */}
        {refreshing && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg animate-slideDown">
            <div className="flex items-center gap-2 text-accent">
              <Loader2 className="animate-spin h-4 w-4" />
              <span className="text-sm">Atualizando lista de bots...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-slideDown">
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
          <div className="animate-fadeIn">
            <EmptyState
              title="Nenhum bot encontrado"
              description="Você ainda não criou nenhum bot. Crie seu primeiro bot para começar."
              actionLabel="Criar Bot"
              onAction={handleCreateBot}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-staggerChildren">
            {bots.map((bot, index) => (
              <div 
                key={bot.id} 
                className="animate-scaleIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <BotCard bot={bot} onUpdate={handleBotUpdate} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 