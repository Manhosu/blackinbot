'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart, Users, CreditCard, Settings, Share2, Plus, RefreshCw, Trash2, ArrowUpRight, Copy, Key, ExternalLink, AlertCircle, Activity, TestTube, MessageSquare, CheckCircle, Eye, Edit3, ImageIcon, Save, Loader2 } from 'lucide-react';
import { Globe, TicketIcon, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { FiEdit } from 'react-icons/fi';
import { useDirectSupabaseUpload } from '@/hooks/useDirectSupabaseUpload';
import DirectVideoUpload from '@/components/DirectVideoUpload';

interface Transaction {
  id: string;
  status: string;
  amount: string;
  created_at: string;
}

// 🚀 Componente com animações fluidas
const StatCard = ({ title, value, icon, trend = null, description = null, isLoading = false }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string } | null;
  description?: string | null;
  isLoading?: boolean;
}) => (
  <div className="bg-card border border-border-light rounded-xl p-6 hover:border-accent/30 transition-all duration-300 hover:scale-105 transform">
    <div className="flex justify-between items-start mb-4">
      <div>
        <span className="text-white/60 text-sm font-medium">{title}</span>
        {description && <div className="text-white/40 text-xs mt-1">{description}</div>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent transition-all duration-300">
        {icon}
      </div>
    </div>
    <div className="flex items-end gap-3">
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin h-6 w-6 text-accent" />
          <span className="text-lg text-white/60">Carregando...</span>
        </div>
      ) : (
        <>
          <span className="text-3xl font-bold text-white transition-all duration-300">{value}</span>
          {trend && (
            <span className={`text-sm pb-1 font-medium transition-all duration-300 ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          )}
        </>
      )}
    </div>
  </div>
);

// Componente para um usuário na lista com animações
const UserItem = ({ user }: { user: any }) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light transition-all duration-200 hover:bg-white/5 rounded-lg px-2">
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <Image src={user.avatar} width={40} height={40} alt={user.name} className="rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center transition-all duration-200 hover:bg-accent/20">
            <span className="text-accent font-medium">{user.name.substring(0, 1)}</span>
          </div>
        )}
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-white/60">{user.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
          user.status === 'active' ? 'bg-green-500/20 text-green-500' : 
          user.status === 'expired' ? 'bg-red-500/20 text-red-500' : 
          'bg-yellow-500/20 text-yellow-500'
        }`}>
          {user.status === 'active' ? 'Ativo' : 
           user.status === 'expired' ? 'Expirado' : 
           'Pendente'}
        </span>
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white transition-all duration-200">
          <ArrowUpRight size={16} />
        </Button>
      </div>
    </div>
  );
};

// Componente para um plano na lista com animações
const PlanItem = ({ plan, onEdit, onDelete }: { 
  plan: any; 
  onEdit: (plan: any) => void; 
  onDelete: (plan: any) => void; 
}) => {
  // Formatação do período para exibição
  const getPeriodLabel = (plan: any) => {
    const days = plan.days_access || plan.period_days || 30;
    if (days >= 9000) return "Vitalício";
    if (days >= 365) return `${Math.floor(days/365)} ano${days >= 730 ? 's' : ''}`;
    if (days >= 30) return `${Math.floor(days/30)} ${days >= 60 ? 'meses' : 'mês'}`;
    return `${days} dias`;
  };

  return (
    <div className="bg-card border border-border-light rounded-lg p-4 hover:border-accent transition-all duration-300 hover:scale-105 transform">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{plan.name}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-all duration-200 hover:scale-110" onClick={() => onEdit(plan)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 transition-all duration-200 hover:scale-110" onClick={() => onDelete(plan)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-2xl font-bold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
        <span className="px-2 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent">
          {plan.period_label || getPeriodLabel(plan)}
        </span>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-sm text-white/60">{plan.sales || 0} {plan.sales === 1 ? 'venda' : 'vendas'}</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-300'}`}>
          {plan.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </div>
    </div>
  );
};

// 🚀 Loading otimizado
const PageSkeleton = () => (
  <DashboardLayout>
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-white/10 rounded-lg w-64"></div>
        <div className="h-10 bg-white/10 rounded-lg w-32"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/10 rounded-xl"></div>
        ))}
      </div>
      <div className="h-96 bg-white/10 rounded-xl"></div>
    </div>
  </DashboardLayout>
);

// Página principal OTIMIZADA
export default function BotDashboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);
  const hasInitialized = useRef(false);
  
  // Estados para stats com loading independente
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Estado para mensagem e mídia personalizadas
  const [customMessage, setCustomMessage] = useState('');
  const [customMedia, setCustomMedia] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSavingCustomContent, setIsSavingCustomContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Hook para upload direto ao Supabase
  const { uploadFile, isUploading } = useDirectSupabaseUpload();

  // Estados para edição
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  // 🚀 OTIMIZAÇÃO: Carregamento instantâneo com cache local
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      // Limpar cache antigo com campos incorretos
      const cacheKey = `bot_${params.id}`;
      const oldCached = localStorage.getItem(cacheKey);
      if (oldCached) {
        try {
          const botData = JSON.parse(oldCached);
          // Se tem campos antigos, remover do cache
          if (botData.media_url || botData.media_type) {
            localStorage.removeItem(cacheKey);
            console.log('🧹 Cache antigo com campos incorretos removido');
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }
      
      // Verificar parâmetros de query
      const editParam = searchParams.get('edit');
      const tabParam = searchParams.get('tab');
      const fromActivation = searchParams.get('from') === 'activation';
      
      if (editParam === 'true') {
        setIsEditMode(true);
      }
      
      if (tabParam) {
        setActiveTab(tabParam);
      }
      
      if (fromActivation) {
        setShowActivationSuccess(true);
        setTimeout(() => setShowActivationSuccess(false), 5000);
      }

      // 🚀 SUPER OTIMIZAÇÃO: Carregamento instantâneo
      console.log('🚀 Iniciando carregamento super otimizado...');
      
      // 1. Primeiro tentar cache instantâneo
      const cached = loadBotFromCacheSync();
      if (cached) {
        console.log('⚡⚡ Bot carregado INSTANTANEAMENTE do cache!');
        setIsLoading(false);
        
        // 🚀 Feedback visual para o usuário
        toast.success('⚡ Bot carregado instantaneamente!', {
          description: 'Cache local funcionando perfeitamente',
          duration: 2000,
        });
        
        // Carregar dados adicionais em background após um tempo
        setTimeout(() => {
          fetchBotData(false);
        }, 200);
        return;
      }
      
      // 2. Se não há cache, carregar o mais rápido possível
      console.log('📦 Cache não encontrado, carregando do servidor...');
      fetchBotDataFast();
    }
  }, []);

  // 🚀 Função síncrona para carregamento instantâneo do cache
  const loadBotFromCacheSync = (): boolean => {
    try {
      const cacheKey = `bot_${params.id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const botData = JSON.parse(cached);
        const now = Date.now();
        const cacheTime = botData._cached_at || 0;
        
        // Cache válido por 10 minutos (aumentei para reduzir requests)
        if (now - cacheTime < 10 * 60 * 1000) {
          // Configurar tudo imediatamente
          setBot(botData);
          setEditForm({
            name: botData.name || '',
            description: botData.description || '',
            status: botData.status || 'active'
          });
          setCustomMessage(botData.welcome_message || '');
          setCustomMedia(botData.welcome_media_url || '');
          // Mapear 'photo' do banco para 'image' no frontend
          const mappedMediaType = botData.welcome_media_type === 'photo' ? 'image' : botData.welcome_media_type || 'none';
          setMediaType(mappedMediaType as 'image' | 'video' | 'none');
          
          // Configurar stats com dados do cache se existirem
          if (botData.cachedStats) {
            setStats(botData.cachedStats);
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Erro ao carregar cache síncrono:', error);
      return false;
    }
  };

  // 🚀 Função ultra rápida para buscar dados essenciais do bot
  const fetchBotDataFast = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Busca rápida do bot:', params.id);
      
      // Buscar apenas dados essenciais primeiro
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('id, name, description, status, username, created_at, welcome_message, welcome_media_url, welcome_media_type, avatar_url, is_activated')
        .eq('id', params.id)
        .single();
      
      if (botError || !botData) {
        console.log('❌ Bot não encontrado:', botError?.message);
        toast.error('Bot não encontrado');
        router.push('/dashboard/bots');
        return;
      }
      
      console.log('✅ Dados essenciais carregados em tempo recorde!');
      
      // Configurar interface imediatamente
      setBot(botData);
      setEditForm({
        name: botData.name || '',
        description: botData.description || '',
        status: botData.status || 'active'
      });
                setCustomMessage(botData.welcome_message || '');
          setCustomMedia(botData.welcome_media_url || '');
          // Mapear 'photo' do banco para 'image' no frontend
          const mappedMediaType2 = botData.welcome_media_type === 'photo' ? 'image' : botData.welcome_media_type || 'none';
          setMediaType(mappedMediaType2 as 'image' | 'video' | 'none');
      
      // Cache os dados essenciais
      const cacheKey = `bot_${params.id}`;
      const cachedData = { ...botData, _cached_at: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      
      setIsLoading(false);
      
      // Buscar dados complementares em background
      setTimeout(() => {
        fetchFullBotData(botData);
      }, 300);
      
    } catch (error) {
      console.error('❌ Erro na busca rápida:', error);
      toast.error('Erro ao carregar dados do bot');
      setIsLoading(false);
    }
  };

  // 🚀 Função para buscar dados complementares em background
  const fetchFullBotData = async (baseBot: any) => {
    try {
      console.log('📊 Carregando dados complementares...');
      
      // Buscar dados completos
      const { data: fullBotData, error } = await supabase
        .from('bots')
        .select(`
          *,
          groups:groups(id, name, telegram_id, description, is_active),
          plans:plans(id, name, price, period_days, description, is_active)
        `)
        .eq('id', params.id)
        .single();
      
      if (!error && fullBotData) {
        setBot(fullBotData);
        
        // Salvar dados completos no cache
        const cacheKey = `bot_${params.id}`;
        const cachedData = { ...fullBotData, _cached_at: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(cachedData));
        
        console.log('✅ Dados completos carregados e cacheados');
      }
      
      // Carregar estatísticas em paralelo
      setTimeout(() => {
        fetchStatsInBackground();
      }, 100);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados completos:', error);
    }
  };

  // 🚀 Função de compatibilidade para atualizações
  const fetchBotData = async (showMainLoading = true) => {
    if (!showMainLoading) {
      // Apenas atualizar em background
      const { data: botData, error } = await supabase
        .from('bots')
        .select(`
          *,
          groups:groups(id, name, telegram_id, description, is_active),
          plans:plans(id, name, price, period_days, description, is_active)
        `)
        .eq('id', params.id)
        .single();
      
      if (!error && botData) {
        setBot(botData);
        const cacheKey = `bot_${params.id}`;
        const cachedData = { ...botData, _cached_at: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      }
    } else {
      // Chamar a função rápida
      fetchBotDataFast();
    }
  };

  // 🚀 Função para carregar estatísticas em background
  const fetchStatsInBackground = async () => {
    try {
      // Contagem de usuários (simulado por enquanto)
      const totalUsers = 0;
      const activeUsers = 0;
      
      // Receita total (calculada a partir das transações)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('bot_id', params.id);
      
      let totalRevenue = 0;
      let pendingPayments = 0;
      
      if (!transactionsError && transactionsData) {
        totalRevenue = transactionsData
          .filter((tx: Transaction) => tx.status === 'completed')
          .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount || '0'), 0);
        
        pendingPayments = transactionsData
          .filter((tx: Transaction) => tx.status === 'pending')
          .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount || '0'), 0);
        
        setTransactions(transactionsData);
      }
      
      // Atualizar estatísticas
      setStats({
        totalUsers,
        activeUsers,
        totalRevenue,
        pendingPayments
      });
      
      // Buscar usuários do bot (simulado por enquanto)
      setUsers([]);
      
      // Buscar planos
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('bot_id', params.id);
      
      if (!plansError && plansData) {
        setPlans(plansData);
      } else {
        setPlans([]);
      }
      
    } catch (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError);
    }
  };

  // Função para editar um plano
  const handleEditPlan = async (plan: any) => {
    try {
      // Implementação da edição do plano aqui
      // Por enquanto, apenas um alerta
      toast.info('Funcionalidade em desenvolvimento');
      
      // Atualizar o bot e a contagem de planos
      await loadBot();
    } catch (error) {
      console.error('Erro ao editar plano:', error);
      toast.error('Erro ao editar plano');
    }
  };

  // Função para excluir um plano
  const handleDeletePlan = async (plan: any) => {
    try {
      // Confirmar exclusão
      if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
        return;
      }
      
      // Se for o plano principal, não permitir exclusão
      if (plan.id === 'main_plan') {
        toast.error('Não é possível excluir o plano principal');
        return;
      }
      
      // Implementar exclusão
      // 1. Remover plano do bot.plans ou bot.additional_plans
      const updatedBot = {...bot};
      
      if (Array.isArray(updatedBot.plans)) {
        updatedBot.plans = updatedBot.plans.filter((p: any) => p.id !== plan.id);
      }
      
      if (Array.isArray(updatedBot.additional_plans)) {
        updatedBot.additional_plans = updatedBot.additional_plans.filter((p: any) => p.id !== plan.id);
      }
      
      // 2. Atualizar contagem de planos
      const totalPlans = (Array.isArray(updatedBot.plans) ? updatedBot.plans.length : 0) || 
                         (Array.isArray(updatedBot.additional_plans) ? updatedBot.additional_plans.length + 1 : 1);
      
      updatedBot._count_plans = [{ count: totalPlans }];
      
      // 3. Atualizar bot no estado
      setBot(updatedBot);
      
      // 4. Preparar planos para exibição
      const updatedPlans = getBotPlans();
      setPlans(updatedPlans);
      
      // 5. Enviar para API
      try {
        const response = await fetch(`/api/bots/${bot.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedBot),
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('Bot atualizado na API com sucesso');
        } else {
          console.error('Erro ao atualizar bot na API:', data.error);
        }
      } catch (apiError) {
        console.error('Erro ao comunicar com API:', apiError);
      }
      
      toast.success('Plano excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  // Função para entrar no modo de edição
  const handleEditBot = () => {
    setIsEditMode(true);
    setEditForm({
      name: bot?.name || '',
      description: bot?.description || '',
      status: bot?.status || 'active'
    });
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm({
      name: '',
      description: '',
      status: 'active'
    });
    
    // Remover query param
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    router.replace(url.pathname + url.search);
  };

  // Função para salvar edições do bot
  const handleSaveBot = async () => {
    if (!editForm.name.trim()) {
      toast.error('Nome do bot é obrigatório');
      return;
    }

    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          status: editForm.status
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar bot no estado
        setBot(result.data);
        setIsEditMode(false);
        
        // Remover query param
        const url = new URL(window.location.href);
        url.searchParams.delete('edit');
        router.replace(url.pathname + url.search);
        
        toast.success('Bot atualizado com sucesso');
      } else {
        throw new Error(result.error || 'Erro ao atualizar bot');
      }
    } catch (error: any) {
      console.error('Erro ao salvar bot:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    }
  };

  // Função para adicionar novo plano
  const handleAddPlan = async () => {
    try {
      // Dados do novo plano
      const newPlanName = prompt('Nome do plano:');
      if (!newPlanName) return;
      
      const newPlanPrice = prompt('Preço (R$):');
      if (!newPlanPrice) return;
      
      // Validar preço
      const price = parseFloat(newPlanPrice.replace(',', '.'));
      if (isNaN(price) || price < 4.90) {
        toast.error('O preço mínimo por plano é R$ 4,90');
        return;
      }
      
      // Período predefinido (30 dias)
      const days_access = 30;
      
      // Criar novo plano
      const newPlan = {
        id: `plan_${Date.now()}`,
        name: newPlanName,
        price: price,
        days_access: days_access,
        period_label: `${days_access} dias`,
        sales: 0,
        is_active: true,
        bot_id: bot.id,
      };
      
      // Atualizar bot
      const updatedBot = {...bot};
      
      // Adicionar à lista de planos apropriada
      if (!Array.isArray(updatedBot.plans)) {
        updatedBot.plans = [];
      }
      
      updatedBot.plans.push(newPlan);
      
      // Adicionar à lista de planos adicionais também (compatibilidade)
      if (!Array.isArray(updatedBot.additional_plans)) {
        updatedBot.additional_plans = [];
      }
      
      // Não adicionar o plano principal aos adicionais
      if (updatedBot.plans.length > 1) {
        updatedBot.additional_plans = updatedBot.plans.slice(1);
      }
      
      // Atualizar contagem de planos
      updatedBot._count_plans = [{ count: updatedBot.plans.length }];
      
      // Atualizar bot no estado
      setBot(updatedBot);
      
      // Atualizar planos para exibição
      const updatedPlans = getBotPlans();
      setPlans(updatedPlans);
      
      // Enviar para API
      try {
        const response = await fetch(`/api/bots/${bot.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedBot),
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('Bot atualizado na API com sucesso');
        } else {
          console.error('Erro ao atualizar bot na API:', data.error);
        }
      } catch (apiError) {
        console.error('Erro ao comunicar com API:', apiError);
      }
      
      toast.success('Plano adicionado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar plano:', error);
      toast.error('Erro ao adicionar plano');
    }
  };

  const handleShareBot = () => {
    if (bot?.username) {
      const url = `https://t.me/${bot.username}`;
      navigator.clipboard.writeText(url);
      toast.success('Link do bot copiado para a área de transferência');
    }
  };

  // Função para recarregar dados do bot
  const loadBot = async () => {
    try {
      console.log('🔄 Recarregando dados do bot após pagamento...');
      const response = await fetch(`/api/bots/${params.id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // A API GET retorna data.data, não data.bot
        const botData = data.data;
        console.log('✅ Bot recarregado com sucesso:', botData);
        setBot(botData);
        
        // Atualizar estatísticas de forma segura
        setStats(prevStats => ({
          ...prevStats,
          totalRevenue: parseFloat(botData?.totalRevenue || '0'),
        }));
        
        // Atualizar transações se existirem
        if (botData?.transactions && Array.isArray(botData.transactions)) {
          setTransactions(botData.transactions);
        }
        
        // Atualizar planos de forma segura
        const updatedPlans: any[] = [];
        
        // Primeiro verificar se temos planos no formato novo
        if (botData?.plans && Array.isArray(botData.plans) && botData.plans.length > 0) {
          // Usar planos no formato novo
          updatedPlans.push(...botData.plans);
        } 
        // Depois verificar o plano principal no formato antigo
        else if (botData?.plan_name && botData?.plan_price) {
          updatedPlans.push({
            id: 'main_plan',
            name: botData.plan_name,
            price: parseFloat(botData.plan_price) || 0,
            days_access: parseInt(botData.plan_days_access) || 30,
            period_label: `${parseInt(botData.plan_days_access) || 30} dias`,
            sales: parseInt(botData.totalSales || '0'),
            is_active: true,
            bot_id: botData.id
          });
        }
        
        setPlans(updatedPlans);
        
        toast.success('Dados atualizados com sucesso!');
      } else {
        console.warn('❌ Falha ao recarregar bot:', data.error);
        toast.error('Erro ao recarregar dados do bot');
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar bot:', error);
      toast.error('Erro ao atualizar dados');
    }
  };

  // Função para salvar mensagem e mídia personalizadas - SIMPLIFICADA
  const saveCustomContent = async () => {
    // Validações básicas
    if (!bot) {
      toast.error('❌ Bot não encontrado');
      return;
    }

    if (!customMessage.trim()) {
      toast.error('❌ A mensagem de boas-vindas é obrigatória');
      return;
    }

    console.log('💾 Iniciando salvamento da personalização...');
    setIsSavingCustomContent(true);
    
    try {
      let finalMediaUrl = '';
      let finalMediaType = 'none';

      // ETAPA 1: Usar URL de mídia se já foi feito upload
      if (mediaType !== 'none' && customMedia.trim()) {
        finalMediaUrl = customMedia.trim();
        finalMediaType = mediaType;
        console.log('📎 Usando URL de mídia:', finalMediaUrl);
      }

      // ETAPA 2: Preparar dados para enviar
      const updateData = {
        welcome_message: customMessage.trim(),
        welcome_media_url: finalMediaUrl,
        welcome_media_type: finalMediaType === 'image' ? 'photo' : finalMediaType
      };

      console.log('📡 Enviando dados para API:', updateData);

      // ETAPA 3: Enviar para API
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 Resposta da API:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Resposta inválida da API');
      }

      // ETAPA 4: Atualizar estado local
      setBot((prevBot: any) => ({
        ...prevBot,
        welcome_message: updateData.welcome_message,
        welcome_media_url: updateData.welcome_media_url,
        welcome_media_type: updateData.welcome_media_type
      }));

      // ETAPA 5: Feedback de sucesso
      toast.success('🎉 Personalização salva!', {
        description: '✅ Mensagem de boas-vindas atualizada com sucesso',
        duration: 4000
      });

      // Adicionar toast adicional com mais detalhes
      setTimeout(() => {
        toast.info('🤖 Bot atualizado!', {
          description: 'As alterações já estão ativas no Telegram',
          duration: 3000
        });
      }, 1500);

      console.log('✅ Personalização salva com sucesso!');

      // ETAPA 6: Limpar estados de upload
      setMediaFile(null);
      setMediaPreview(null);

    } catch (error: any) {
      console.error('❌ Erro ao salvar personalização:', error);
      toast.error('❌ Erro ao salvar personalização', {
        description: error.message || 'Tente novamente em alguns momentos',
        duration: 5000
      });
    } finally {
      setIsSavingCustomContent(false);
    }
  };

  const getBotPlans = () => {
    if (!bot) return [];

    const plans: any[] = [];
    
    // Plano principal
    if (bot.plan_name && bot.plan_price) {
      plans.push({
        id: 'main_plan',
        name: bot.plan_name,
        price: parseFloat(bot.plan_price) || 0,
        days_access: parseInt(bot.plan_days_access) || 30,
        is_active: true
      });
    }
    
    // Planos adicionais
    if (bot.plans && Array.isArray(bot.plans)) {
      plans.push(...bot.plans.map((plan: any) => ({
        ...plan,
        price: parseFloat(plan.price || '0') || 0,
        days_access: parseInt(plan.days_access || plan.period_days || '30') || 30,
        is_active: plan.is_active !== false
      })));
    }
    
    return plans;
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!bot) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 animate-fadeIn">
          <h2 className="text-xl font-bold mb-2">Bot não encontrado</h2>
          <p className="text-white/60 mb-6">O bot que você está procurando não existe ou você não tem permissão para acessá-lo.</p>
          <Link href="/dashboard/bots">
            <Button className="transition-all duration-200 hover:scale-105">Voltar para Meus Bots</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Obter planos do bot para exibição
  const availablePlans = getBotPlans();
  const currentRevenue = parseFloat(bot.totalRevenue || '0');
  const currentSales = parseInt(bot.totalSales || '0');

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-8 animate-fadeIn">
        {/* Notificação de sucesso da ativação */}
        {showActivationSuccess && (
          <div className="mb-6 animate-slideDown">
            <Alert className="bg-green-500/20 border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">
                🎉 Bot ativado com sucesso! Agora você pode configurar e personalizar seu bot.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Cabeçalho do Bot com animações */}
        <div className="bg-card border border-border-light rounded-xl p-6 mb-8 transition-all duration-300 hover:border-accent/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent/10 flex items-center justify-center border border-accent/20">
                  {bot.avatar_url ? (
                    <Image 
                      src={bot.avatar_url} 
                      alt={bot.name} 
                      width={64} 
                      height={64} 
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-accent text-2xl">🤖</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-card flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="flex-1">
                {isEditMode ? (
                  /* Modo de Edição com animações */
                  <div className="space-y-3 animate-slideDown">
                    <div>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        placeholder="Nome do bot"
                        className="text-xl font-bold bg-white/5 border-white/20 text-white transition-all duration-200 focus:border-accent"
                      />
                    </div>
                    <div>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        placeholder="Descrição do bot (opcional)"
                        className="bg-white/5 border-white/20 text-white/80 resize-none transition-all duration-200 focus:border-accent"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="bot-status" className="text-white/60">Status:</Label>
                      <select
                        id="bot-status"
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        className="bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-white text-sm transition-all duration-200 focus:border-accent"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Modo de Visualização com animações */
                  <div className="animate-fadeIn">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-white">{bot.name}</h1>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                        bot.status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      }`}>
                        ● {bot.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-white/60">
                      <span className="flex items-center gap-2">
                        <span className="text-accent">@</span>
                        {bot.username || 'sem_username'}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-accent">•</span>
                        Criado em {new Date(bot.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {bot.description && (
                      <p className="text-white/60 mt-2 text-sm">{bot.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 self-end md:self-auto">
              {isEditMode ? (
                /* Botões do Modo de Edição */
                <>
                  <Button 
                    onClick={handleCancelEdit}
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveBot}
                    variant="default" 
                    className="flex items-center gap-2 bg-accent hover:bg-accent/90"
                  >
                    Salvar
                  </Button>
                </>
              ) : (
                /* Botões do Modo de Visualização */
                <>
                  {/* Botão de Ativação - só aparece se bot não estiver ativado */}
                  {!bot.is_activated && (
                    <Button 
                      onClick={() => router.push(`/dashboard/bots/${params.id}/activate`)}
                      variant="default" 
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-all"
                    >
                      <Key size={16} />
                      Ativar Bot
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleEditBot}
                    variant="outline" 
                    className="flex items-center gap-2 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
                  >
                    <FiEdit size={16} />
                    Editar
                  </Button>
                  <Button 
                    onClick={handleShareBot}
                    variant="outline" 
                    className="flex items-center gap-2 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
                  >
                    <Share2 size={16} />
                    Compartilhar
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex items-center gap-2 bg-accent hover:bg-accent/90 transition-all"
                    onClick={() => router.push(`/dashboard/bots/${params.id}/settings`)}
                  >
                    <Settings size={16} />
                    Configurações
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Notificação de ativação bem-sucedida */}
        {showActivationSuccess && bot.is_activated && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="text-green-500 w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-green-500 font-medium mb-1">🎉 Bot Ativado com Sucesso!</h3>
                <div className="text-green-500/80 text-sm space-y-1">
                  <p>• Seu bot <strong>{bot.name}</strong> está agora funcionando e pode receber usuários</p>
                  <p>• Usuários podem usar /start para ver os planos disponíveis</p>
                  <p>• Configure mensagens personalizadas abaixo para melhor experiência</p>
                  {bot.activated_at && (
                    <p>• Ativado em: {new Date(bot.activated_at).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Alerta para bot não ativado */}
        {!bot.is_activated && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="text-orange-500 w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-orange-500 font-medium mb-1">🔑 Bot Não Ativado</h3>
                <p className="text-orange-500/80 text-sm mb-3">
                  Seu bot foi criado com sucesso, mas ainda precisa ser ativado para começar a funcionar. 
                  A ativação é feita através de um código temporário que deve ser enviado em um grupo do Telegram.
                </p>
                <Button 
                  onClick={() => router.push(`/dashboard/bots/${params.id}/activate`)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Ativar Agora
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Notificação para bots demo */}
        {false && bot.status === 'demo' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-yellow-500 text-sm">ℹ️</span>
              </div>
              <div>
                <h3 className="text-yellow-500 font-medium mb-1">Bot em Modo Demonstração</h3>
                <p className="text-yellow-500/80 text-sm">
                  Este bot foi criado em modo demonstração devido a problemas temporários com o banco de dados. 
                  Os dados exibidos são simulados para fins de teste. Entre em contato com o suporte para ativar o bot.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Usuários Totais" 
            value={stats.totalUsers.toString()} 
            icon={<Users size={20} />}
            description="Usuários cadastrados" 
          />
          <StatCard 
            title="Grupos Conectados" 
            value={(bot.groups?.length || 0).toString()} 
            icon={<Globe size={20} />}
            description="Grupos do Telegram" 
          />
          <StatCard 
            title="Planos Ativos" 
            value={availablePlans.filter(p => p.is_active !== false).length.toString()} 
            icon={<TicketIcon size={20} />}
            description="Planos configurados" 
          />
          <StatCard 
            title="Receita Total" 
            value={`R$ ${parseFloat(stats.totalRevenue.toString() || '0').toFixed(2).replace('.', ',')}`} 
            icon={<DollarSign size={20} />}
            description="Todas as vendas" 
          />
        </div>
        
        {/* Personalização do Bot - MELHORADA */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 backdrop-blur-sm mb-8">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    Mensagem de Boas-vindas
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">Personalizar</span>
                  </CardTitle>
                  <p className="text-blue-200/80 text-sm">Configure a primeira impressão do seu bot</p>
                </div>
              </div>
              
              {/* Indicador de status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${customMessage ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
                <span className="text-sm text-white/70">
                  {customMessage ? 'Configurado' : 'Padrão'}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Preview da mensagem */}
            {customMessage && (
              <div className="bg-white/5 border border-blue-400/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Pré-visualização da mensagem</span>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-white/90 text-sm leading-relaxed">
                  {customMessage}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Campo de mensagem */}
              <div className="space-y-3">
                <Label htmlFor="customMessage" className="text-white font-medium flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Mensagem Personalizada
                </Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Olá! 👋 Bem-vindo ao nosso bot! Como posso te ajudar hoje?"
                  rows={4}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                />
                <div className="flex items-center justify-between text-xs">
                  <p className="text-blue-200/70">
                    💡 Use emojis e seja acolhedor para criar uma boa primeira impressão
                  </p>
                  <span className="text-white/60">{customMessage.length} caracteres</span>
                </div>
              </div>

              {/* Seleção de tipo de mídia */}
              <div className="space-y-4">
                <Label className="text-white font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Mídia de acompanhamento
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'none', label: 'Apenas texto', icon: '📝' },
                    { value: 'image', label: 'Com imagem', icon: '🖼️' },
                    { value: 'video', label: 'Com vídeo', icon: '🎬' }
                  ].map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="mediaType"
                        value={option.value}
                        checked={mediaType === option.value}
                        onChange={() => setMediaType(option.value as any)}
                        className="sr-only"
                      />
                      <div className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                        mediaType === option.value
                          ? 'bg-blue-500/20 border-blue-400 text-white'
                          : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                      }`}>
                        <div className="text-2xl mb-2">{option.icon}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Configuração de mídia */}
              {mediaType !== 'none' && (
                <div className="space-y-6 bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="space-y-4">
                    <Label className="text-white font-medium flex items-center gap-2">
                      <span className="text-2xl">📤</span>
                      Fazer upload da {mediaType === 'image' ? 'imagem' : 'vídeo'}
                    </Label>
                    <p className="text-sm text-blue-200/70">
                      {mediaType === 'image' 
                        ? '🖼️ Imagens até 10MB - JPG, PNG, GIF, WebP' 
                        : '🎬 Vídeos até 25MB - MP4, MOV, AVI, MKV, WebM'
                      }
                    </p>
                  </div>

                  <DirectVideoUpload
                    botId={bot.id}
                    mediaType={mediaType as 'image' | 'video'}
                    onUploadSuccess={(url) => {
                      setCustomMedia(url);
                      setMediaFile(null);
                      setMediaPreview(url);
                      toast.success('✅ Arquivo enviado com sucesso!');
                    }}
                    onUploadError={(error) => {
                      console.error('❌ Erro no upload:', error);
                      toast.error('❌ Erro ao enviar arquivo', {
                        description: error,
                        duration: 5000
                      });
                    }}
                    className="border-2 border-dashed border-white/20 rounded-xl hover:border-blue-400/50 transition-colors duration-200"
                  />
                  
                  {/* Preview do arquivo */}
                  {mediaPreview && (
                    <div className="bg-white/5 border border-blue-400/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">Pré-visualização do arquivo</span>
                      </div>
                      {mediaType === 'image' ? (
                        <img 
                          src={mediaPreview} 
                          alt="Pré-visualização" 
                          className="max-h-48 max-w-full object-contain rounded-lg mx-auto"
                        />
                      ) : (
                        <video 
                          src={mediaPreview} 
                          controls 
                          className="max-h-48 max-w-full rounded-lg mx-auto"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Botão de salvar simplificado */}
              <div className="flex justify-between items-center pt-6 border-t border-white/10">
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-white/60">
                    {customMessage.trim() 
                      ? '✅ Mensagem configurada' 
                      : '⏳ Configure sua mensagem'
                    }
                  </div>
                  {mediaType !== 'none' && (
                    <div className="text-xs text-blue-300/70">
                      {customMedia.trim() 
                        ? '📎 Arquivo carregado e pronto para salvar'
                        : '📝 Faça upload do arquivo ou deixe em branco'
                      }
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={saveCustomContent}
                    disabled={
                      isSavingCustomContent || 
                      !customMessage.trim()
                    }
                    className={`px-8 py-3 text-white font-medium rounded-xl shadow-lg transition-all duration-200 ${
                      isSavingCustomContent
                        ? 'bg-gray-600 cursor-not-allowed'
                        : customMessage.trim()
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isSavingCustomContent ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Salvando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        <span>Salvar personalização</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Abas */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-card border border-border-light">
            <TabsTrigger value="overview" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">
              <BarChart size={16} className="mr-2" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">
              <Users size={16} className="mr-2" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="plans" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">
              <CreditCard size={16} className="mr-2" /> Planos
            </TabsTrigger>
          </TabsList>
          
          {/* Conteúdo da aba Visão Geral */}
          <TabsContent value="overview" className="space-y-8">
            {/* Estatísticas Detalhadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Total de Usuários" 
                value={stats.totalUsers.toString()} 
                icon={<Users size={20} />} 
                description="Usuários únicos"
              />
              <StatCard 
                title="Usuários Ativos" 
                value={stats.activeUsers.toString()} 
                icon={<Users size={20} />} 
                description="Últimos 30 dias" 
              />
              <StatCard 
                title="Receita Acumulada" 
                value={`R$ ${parseFloat(stats.totalRevenue.toString()).toFixed(2).replace('.', ',')}`} 
                icon={<CreditCard size={20} />} 
                description="Todas as vendas"
              />
              <StatCard 
                title="Pagamentos Pendentes" 
                value={`R$ ${parseFloat(stats.pendingPayments.toString()).toFixed(2).replace('.', ',')}`} 
                icon={<CreditCard size={20} />}
                description="Aguardando confirmação"
              />
            </div>
            
            {/* Resumo dos Planos */}
            {availablePlans.length > 0 && (
              <div className="bg-card border border-border-light rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Planos de Acesso</h2>
                  <span className="text-sm text-white/60">{availablePlans.length} plano{availablePlans.length > 1 ? 's' : ''} configurado{availablePlans.length > 1 ? 's' : ''}</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left py-4 px-2 font-medium text-white/70 text-sm">NOME DO PLANO</th>
                        <th className="text-left py-4 px-2 font-medium text-white/70 text-sm">PERÍODO</th>
                        <th className="text-right py-4 px-2 font-medium text-white/70 text-sm">PREÇO</th>
                        <th className="text-center py-4 px-2 font-medium text-white/70 text-sm">VENDAS</th>
                        <th className="text-right py-4 px-2 font-medium text-white/70 text-sm">RECEITA</th>
                        <th className="text-center py-4 px-2 font-medium text-white/70 text-sm">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availablePlans.map((plan, index) => {
                        // Calcular receita real do plano
                        const planSales = plan.sales || 0;
                        const planPrice = parseFloat(plan.price?.toString() || '0') || 0;
                        const planRevenue = planSales * planPrice;
                        
                        const periodLabel = plan.period_label || (
                          plan.days_access >= 9000 ? 'Vitalício' : 
                          plan.days_access >= 365 ? `${Math.floor(plan.days_access/365)} ano(s)` : 
                          `${plan.days_access || 30} dias`
                        );
                        
                        return (
                          <tr key={plan.id} className={`border-b border-border-light/10 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-white/[0.04] transition-colors`}>
                            <td className="py-4 px-2">
                              <div className="font-medium text-white">{plan.name}</div>
                              <div className="text-xs text-white/50 mt-1">ID: {plan.id?.slice(-8) || 'sem-id'}</div>
                            </td>
                            <td className="py-4 px-2">
                              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium">
                                {periodLabel}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <span className="font-semibold text-lg">R$ {planPrice.toFixed(2).replace('.', ',')}</span>
                            </td>
                            <td className="py-4 px-2 text-center">
                              <span className="bg-white/5 px-3 py-1 rounded-full font-medium">{planSales}</span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <span className="font-semibold text-green-400">R$ {planRevenue.toFixed(2).replace('.', ',')}</span>
                            </td>
                            <td className="py-4 px-2 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                plan.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {plan.is_active !== false ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Resumo dos totais */}
                <div className="mt-6 pt-4 border-t border-border-light/20">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60">Total de vendas:</span>
                    <span className="font-medium">
                      {availablePlans.reduce((acc, plan) => acc + (parseInt(plan.sales?.toString() || '0') || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-white/60">Receita total dos planos:</span>
                    <span className="font-semibold text-green-400">
                      R$ {availablePlans.reduce((acc, plan) => {
                        const sales = parseInt(plan.sales?.toString() || '0') || 0;
                        const price = parseFloat(plan.price?.toString() || '0') || 0;
                        return acc + (sales * price);
                      }, 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Transações Recentes */}
            <div className="bg-card border border-border-light rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Transações Recentes</h2>
                <span className="text-sm text-white/60">{transactions.length} transaç{transactions.length === 1 ? 'ão' : 'ões'}</span>
              </div>
              
              {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-light">
                        <th className="text-left py-4 px-2 font-medium text-white/70 text-sm">USUÁRIO</th>
                        <th className="text-left py-4 px-2 font-medium text-white/70 text-sm">PLANO</th>
                        <th className="text-right py-4 px-2 font-medium text-white/70 text-sm">VALOR</th>
                        <th className="text-center py-4 px-2 font-medium text-white/70 text-sm">STATUS</th>
                        <th className="text-center py-4 px-2 font-medium text-white/70 text-sm">DATA</th>
                    </tr>
                  </thead>
                  <tbody>
                      {transactions.slice(0, 10).map((tx: any, index: number) => (
                        <tr key={tx.id} className={`border-b border-border-light/10 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-white/[0.04] transition-colors`}>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                                <span className="text-accent text-sm font-medium">{tx.user_name.slice(-1)}</span>
                              </div>
                              <div>
                                <div className="font-medium">{tx.user_name}</div>
                                <div className="text-xs text-white/50">ID: {tx.user_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm">
                              {tx.plan_name}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <span className="font-semibold text-lg">R$ {parseFloat(tx.amount).toFixed(2).replace('.', ',')}</span>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                              'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {tx.status === 'completed' ? 'Concluído' : 'Pendente'}
                          </span>
                        </td>
                          <td className="py-4 px-2 text-center text-white/60">
                            <div className="text-sm">
                              {tx.display_date || new Date(tx.date).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-white/40">
                              {new Date(tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  
                  {transactions.length > 10 && (
                    <div className="mt-4 text-center">
                      <button className="text-accent hover:text-accent/80 text-sm font-medium">
                        Ver todas as {transactions.length} transações
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={24} className="text-white/30" />
              </div>
                  <h3 className="text-white/60 font-medium mb-2">Nenhuma transação encontrada</h3>
                  <p className="text-white/40 text-sm mb-4">As vendas aparecerão aqui quando começarem a acontecer</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Conteúdo da aba Usuários */}
          <TabsContent value="users">
            <div className="bg-card border border-border-light rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Usuários ({users.length})</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar usuário..."
                      className="input-auth px-4 py-2 text-sm"
                    />
                  </div>
                  <select className="input-auth py-2 text-sm">
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="expired">Expirados</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1">
                {users.length > 0 ? (
                  users.map((user: any) => <UserItem key={user.id} user={user} />)
                ) : (
                  <div className="py-8 text-center text-white/40">
                    Nenhum usuário encontrado
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Conteúdo da aba Planos */}
          <TabsContent value="plans">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Planos de Assinatura</h2>
                <p className="text-white/60 text-sm mt-1">
                  Gerencie os planos que os usuários podem comprar para acessar seu bot
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => router.push(`/dashboard/bots/${params.id}/settings?tab=plans`)}
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <Settings size={16} />
                  Configurar Planos
                </Button>
                <Button onClick={handleAddPlan} className="flex items-center gap-2">
                  <Plus size={16} />
                  Adicionar Plano
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePlans.map((plan) => (
                <PlanItem 
                  key={plan.id} 
                  plan={plan} 
                  onEdit={handleEditPlan}
                  onDelete={handleDeletePlan}
                />
              ))}
              
              {availablePlans.length === 0 && (
                <div className="col-span-full py-12 text-center bg-card border border-border-light rounded-xl p-6">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={24} className="text-white/30" />
                  </div>
                  <h3 className="text-white/60 font-medium mb-2">Nenhum plano configurado</h3>
                  <p className="text-white/40 text-sm mb-6">
                    Configure planos para que os usuários possam comprar acesso ao seu bot
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={() => router.push(`/dashboard/bots/${params.id}/settings?tab=plans`)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Configurar Planos
                    </Button>
                    <Button onClick={handleAddPlan} className="flex items-center gap-2">
                      <Plus size={16} />
                      Criar Primeiro Plano
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 