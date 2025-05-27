'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart, Users, CreditCard, Settings, Share2, Plus, RefreshCw, Trash2, ArrowUpRight, Copy, Key, ExternalLink, AlertCircle, Activity, TestTube, MessageSquare, CheckCircle } from 'lucide-react';
import { Globe, TicketIcon, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { FiEdit } from 'react-icons/fi';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';

interface Transaction {
  id: string;
  status: string;
  amount: string;
  created_at: string;
}

// Componente para estatísticas
const StatCard = ({ title, value, icon, trend = null, description = null }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string } | null;
  description?: string | null;
}) => (
  <div className="bg-card border border-border-light rounded-xl p-6 hover:border-accent/30 transition-all duration-200">
    <div className="flex justify-between items-start mb-4">
      <div>
        <span className="text-white/60 text-sm font-medium">{title}</span>
        {description && <div className="text-white/40 text-xs mt-1">{description}</div>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
        {icon}
      </div>
    </div>
    <div className="flex items-end gap-3">
      <span className="text-3xl font-bold text-white">{value}</span>
      {trend && (
        <span className={`text-sm pb-1 font-medium ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </span>
      )}
    </div>
  </div>
);

// Componente para um usuário na lista
const UserItem = ({ user }: { user: any }) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light">
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <Image src={user.avatar} width={40} height={40} alt={user.name} className="rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-accent font-medium">{user.name.substring(0, 1)}</span>
          </div>
        )}
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-white/60">{user.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.status === 'active' ? 'bg-green-500/20 text-green-500' : 
          user.status === 'expired' ? 'bg-red-500/20 text-red-500' : 
          'bg-yellow-500/20 text-yellow-500'
        }`}>
          {user.status === 'active' ? 'Ativo' : 
           user.status === 'expired' ? 'Expirado' : 
           'Pendente'}
        </span>
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
          <ArrowUpRight size={16} />
        </Button>
      </div>
    </div>
  );
};

// Componente para um plano na lista
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
    <div className="bg-card border border-border-light rounded-lg p-4 hover:border-accent transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{plan.name}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(plan)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => onDelete(plan)}>
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

// Página principal
export default function BotDashboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);
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
  const [customMessage, setCustomMessage] = useState(bot?.welcome_message || '');
  const [customMedia, setCustomMedia] = useState(bot?.media_url || '');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>(
    bot?.media_type || 'none'
  );
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>('url');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSavingCustomContent, setIsSavingCustomContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Hook para upload direto ao Supabase
  const { uploadFile, isUploading } = useSupabaseUpload();

  // Estados para edição
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
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
    
    // Se veio da ativação e bot está ativado, mostrar sucesso
    if (fromActivation) {
      setShowActivationSuccess(true);
      // Esconder notificação após 5 segundos
      setTimeout(() => setShowActivationSuccess(false), 5000);
    }

    const fetchBotData = async () => {
      try {
        setIsLoading(true);
        
        // Buscar dados do bot diretamente do banco de dados
        console.log('🔍 Buscando bot do banco de dados:', params.id);
        
        try {
          const { data: botData, error: botError } = await supabase
            .from('bots')
            .select(`
              *,
              groups:groups(id, name, telegram_id, description, is_active),
              plans:plans(id, name, price, period_days, description, is_active)
            `)
            .eq('id', params.id)
            .single();
          
          if (botError || !botData) {
            console.log('❌ Bot não encontrado:', botError?.message);
            toast.error('Bot não encontrado');
            router.push('/dashboard/bots');
            return;
          }
          
          console.log('✅ Bot encontrado no banco:', botData);
          setBot(botData);
          
          // Inicializar formulário de edição
          setEditForm({
            name: botData.name || '',
            description: botData.description || '',
            status: botData.status || 'active'
          });
          
          // Atualizar mensagem personalizada se existir
          setCustomMessage(botData.welcome_message || '');
          setCustomMedia(botData.media_url || '');
          setMediaType((botData.media_type || 'none') as 'image' | 'video' | 'none');
          
          // Buscar estatísticas complementares
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
              // Calcular receita total e pagamentos pendentes
              totalRevenue = transactionsData
                .filter((tx: Transaction) => tx.status === 'completed')
                .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount || '0'), 0);
              
              pendingPayments = transactionsData
                .filter((tx: Transaction) => tx.status === 'pending')
                .reduce((sum: number, tx: Transaction) => sum + parseFloat(tx.amount || '0'), 0);
              
              // Salvar transações
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
          
        } catch (dbError) {
          console.error('❌ Erro ao buscar no banco:', dbError);
          toast.error('Erro ao carregar dados do bot');
          router.push('/dashboard/bots');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar bot:', error);
        toast.error('Erro ao carregar dados do bot');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchBotData();
    }
  }, [params.id, router, user, authLoading, searchParams]);

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

  // Função para salvar mensagem e mídia personalizadas
  const saveCustomContent = async () => {
    if (!bot) return;

    setIsSavingCustomContent(true);
    try {
      console.log('💬 Salvando conteúdo personalizado...');
      
      let mediaUrl = customMedia;
      
      // Se for upload de arquivo, primeiro fazer o upload direto ao Supabase
      if (mediaSource === 'upload' && mediaFile) {
        try {
          console.log('🚀 Iniciando upload direto para Supabase Storage...');
          
          const uploadResult = await uploadFile(mediaFile, {
            botId: bot.id,
            mediaType: mediaType as 'image' | 'video',
            onProgress: setUploadProgress
          });
          
          if (uploadResult.success && uploadResult.url) {
            mediaUrl = uploadResult.url;
            console.log('✅ Upload direto realizado com sucesso:', mediaUrl);
            toast.success('Arquivo enviado com sucesso!');
          } else {
            throw new Error(uploadResult.error || 'Erro no upload');
          }
        } catch (uploadError) {
          console.error('❌ Erro no upload direto:', uploadError);
          toast.error('Erro ao enviar arquivo. Tente novamente ou use uma URL.');
          setIsSavingCustomContent(false);
          return;
        }
      }
      
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          welcome_message: customMessage,
          welcome_media_url: mediaUrl,
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Conteúdo personalizado salvo!');
        await loadBot();
      } else {
        toast.error(result.error || 'Erro ao salvar conteúdo.');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar conteúdo:', error);
      toast.error('Erro interno ao salvar conteúdo.');
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
    return (
      <DashboardLayout>
        <div className="h-full w-full flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!bot) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Bot não encontrado</h2>
          <p className="text-white/60 mb-6">O bot que você está procurando não existe ou você não tem permissão para acessá-lo.</p>
          <Link href="/dashboard/bots">
            <Button>Voltar para Meus Bots</Button>
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
      <div className="max-w-6xl mx-auto py-8">
        {/* Cabeçalho do Bot */}
        <div className="bg-card border border-border-light rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
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
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="flex-1">
                {isEditMode ? (
                  /* Modo de Edição */
                  <div className="space-y-3">
                    <div>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        placeholder="Nome do bot"
                        className="text-xl font-bold bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        placeholder="Descrição do bot (opcional)"
                        className="bg-white/5 border-white/20 text-white/80 resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="bot-status" className="text-white/60">Status:</Label>
                      <select
                        id="bot-status"
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        className="bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Modo de Visualização */
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-white">{bot.name}</h1>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
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
        
        {/* Personalização do Bot */}
        <Card className="border-blue-200 bg-blue-50/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <MessageSquare className="h-5 w-5" />
              Personalização de Mensagens
            </CardTitle>
            <CardDescription className="text-blue-600">
              Configure a mensagem e mídia que seu bot enviará aos usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="customMessage" className="text-blue-700">Mensagem de Boas-Vindas</Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Olá {nome}! Bem-vindo ao grupo exclusivo..."
                  className="h-32 bg-white border-blue-200"
                />
                <p className="text-sm text-blue-600 mt-1">
                  Use {'{'}'nome{'}'}' para incluir o nome do usuário na mensagem.
                </p>
              </div>
              
              <div>
                <Label className="text-blue-700">Tipo de Mídia</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mediaType"
                      value="none"
                      checked={mediaType === 'none'}
                      onChange={() => setMediaType('none')}
                      className="w-4 h-4"
                />
                    <span className="text-blue-700">Sem mídia</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mediaType"
                      value="image"
                      checked={mediaType === 'image'}
                      onChange={() => setMediaType('image')}
                      className="w-4 h-4"
                />
                    <span className="text-blue-700">Imagem</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                      name="mediaType"
                      value="video"
                      checked={mediaType === 'video'}
                      onChange={() => setMediaType('video')}
                        className="w-4 h-4"
                      />
                    <span className="text-blue-700">Vídeo</span>
                    </label>
                </div>
              </div>
              
              {mediaType !== 'none' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-blue-700">Fonte da {mediaType === 'image' ? 'Imagem' : 'Vídeo'}</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mediaSource"
                          value="url"
                          checked={mediaSource === 'url'}
                          onChange={() => setMediaSource('url')}
                          className="w-4 h-4"
                        />
                        <span className="text-blue-700">URL</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mediaSource"
                          value="upload"
                          checked={mediaSource === 'upload'}
                          onChange={() => setMediaSource('upload')}
                          className="w-4 h-4"
                        />
                        <span className="text-blue-700">Upload de arquivo</span>
                      </label>
                    </div>
                  </div>

                  {mediaSource === 'url' && (
                    <div>
                      <Label htmlFor="mediaUrl" className="text-blue-700">URL da {mediaType === 'image' ? 'Imagem' : 'Vídeo'}</Label>
                      <Input
                        id="mediaUrl"
                        value={customMedia}
                        onChange={(e) => setCustomMedia(e.target.value)}
                        placeholder={mediaType === 'image' ? 'https://exemplo.com/imagem.jpg' : 'https://exemplo.com/video.mp4'}
                        className="bg-white border-blue-200"
                      />
                      <p className="text-sm text-blue-600 mt-1">
                        {mediaType === 'image' ? 'Forneça o link para uma imagem (JPG, PNG)' : 'Forneça o link para um vídeo (MP4)'}
                      </p>
                    </div>
                  )}

                  {mediaSource === 'upload' && (
                    <div>
                      <Label htmlFor="mediaFile" className="text-blue-700">Faça upload do arquivo</Label>
                      <div className="mt-2">
                        <input
                          type="file"
                          id="mediaFile"
                          accept={mediaType === 'image' ? 'image/jpeg,image/png,image/gif' : 'video/mp4,video/quicktime'}
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setMediaFile(file);
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setMediaPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              setMediaPreview(null);
                            }
                          }}
                          className="block w-full text-sm text-blue-700 
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-medium
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                      </div>
                      {mediaPreview && mediaType === 'image' && (
                        <div className="mt-3 border border-blue-200 rounded-md p-2">
                          <p className="text-sm text-blue-600 mb-2">Pré-visualização:</p>
                          <img 
                            src={mediaPreview} 
                            alt="Pré-visualização" 
                            className="max-h-48 max-w-full object-contain rounded-md"
                          />
                        </div>
                      )}
                      {mediaPreview && mediaType === 'video' && (
                        <div className="mt-3 border border-blue-200 rounded-md p-2">
                          <p className="text-sm text-blue-600 mb-2">Pré-visualização:</p>
                          <video 
                            src={mediaPreview} 
                            controls 
                            className="max-h-48 max-w-full rounded-md"
                          />
                        </div>
                      )}
                      <p className="text-sm text-blue-600 mt-1">
                        {mediaType === 'image' ? 'Selecione uma imagem do seu dispositivo (JPG, PNG, GIF)' : 'Selecione um vídeo do seu dispositivo (MP4)'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
              <Button
                  onClick={saveCustomContent}
                  disabled={isSavingCustomContent}
                  className="bg-blue-600 hover:bg-blue-700"
              >
                  {isSavingCustomContent ? 'Salvando...' : 'Salvar Personalização'}
              </Button>
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