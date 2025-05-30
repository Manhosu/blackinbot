'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  RefreshCw,
  Link as LinkIcon,
  Edit,
  CheckCircle,
  AlertCircle,
  Settings,
  Save,
  Key,
  Bot,
  Copy,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';

interface Bot {
  id: string;
  name: string;
  status: string;
  plan?: string;
}

interface FinancialStats {
  total_sales: number;
  total_revenue: number;
  active_bots: number;
  pending_revenue: number;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  pushinpay_key?: string;
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<Bot[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    total_sales: 0,
    total_revenue: 0,
    active_bots: 0,
    pending_revenue: 0
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pushinpayKey, setPushinpayKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Carregar dados dos bots e estatísticas
  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Carregar perfil do usuário com chave PushinPay
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, pushinpay_key')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;
      setUserProfile(userData);
      setPushinpayKey(userData.pushinpay_key || '');

      // Carregar bots do usuário
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('id, name, status, plan')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (botsError) throw botsError;
      setBots(botsData || []);

      // Carregar estatísticas financeiras
      const { data: salesData, error: salesError } = await supabase
        .from('payments')
        .select('amount, status')
        .in('bot_id', (botsData || []).map((bot: any) => bot.id));

      if (!salesError && salesData) {
        const approvedSales = salesData.filter((sale: any) => sale.status === 'approved');
        const pendingSales = salesData.filter((sale: any) => sale.status === 'pending');
        
        const totalRevenue = approvedSales.reduce((sum: number, sale: any) => sum + Number(sale.amount), 0);
        const pendingRevenue = pendingSales.reduce((sum: number, sale: any) => sum + Number(sale.amount), 0);
        
        setStats({
          total_sales: approvedSales.length,
          total_revenue: totalRevenue,
          active_bots: (botsData || []).filter((bot: any) => bot.status === 'active').length,
          pending_revenue: pendingRevenue
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
      
  // Abrir modal para configurar chave
  const openKeyModal = () => {
    setShowKeyModal(true);
    setError('');
    setSuccess('');
    setShowKey(false);
  };

  // Fechar modal
  const closeKeyModal = () => {
    setShowKeyModal(false);
    setError('');
    setSuccess('');
    setShowKey(false);
  };

  // Copiar chave para clipboard
  const copyKey = async () => {
    if (userProfile?.pushinpay_key) {
      await navigator.clipboard.writeText(userProfile.pushinpay_key);
      setSuccess('Chave copiada para o clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  // Salvar chave PushinPay
  const handleSaveKey = async () => {
    if (!userProfile) return;
    
    if (!pushinpayKey.trim()) {
      setError('Chave PushinPay é obrigatória');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      // 1. Primeiro validar a chave PushinPay
      console.log('🔍 Validando chave PushinPay...');
      const validationResponse = await fetch('/api/pushinpay/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ api_key: pushinpayKey.trim() }),
      });
      
      const validationData = await validationResponse.json();
      
      if (!validationData.success) {
        setError(validationData.error || 'Chave PushinPay inválida');
        return;
      }

      console.log('✅ Chave PushinPay válida, salvando no banco...');

      // 2. Se a validação passou, salvar no banco de dados
      const { error: updateError } = await supabase
        .from('users')
        .update({ pushinpay_key: pushinpayKey.trim() })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      console.log('✅ Chave PushinPay salva no banco com sucesso');

      setSuccess(`Chave PushinPay configurada com sucesso! ${validationData.data?.message || ''}`);
      
      // Atualizar perfil
      setUserProfile(prev => prev ? { ...prev, pushinpay_key: pushinpayKey.trim() } : null);

      setTimeout(() => {
        closeKeyModal();
        loadData(); // Recarregar estatísticas
      }, 2000);

    } catch (error: any) {
      console.error('❌ Erro ao configurar chave PushinPay:', error);
      setError('Erro ao salvar chave PushinPay: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="heading-2">Área Financeira</h1>
          <p className="text-white/60 mt-2">
            Gerencie seus pagamentos, configure sua chave PushinPay e acompanhe suas vendas.
            Todos os valores são depositados automaticamente na sua conta quando aprovados.
          </p>
        </div>
          
        {/* Estatísticas financeiras */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">Total de Vendas</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_sales}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium">Receita Confirmada</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm font-medium">Receita Pendente</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.pending_revenue)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-medium">Bots Ativos</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.active_bots}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Configuração PushinPay */}
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/pushinpay-logo.png"
                alt="PushinPay"
                width={120}
                height={40}
                className="h-8 w-auto"
                onError={(e) => {
                  // Fallback para texto se logo não carregar
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) {
                    nextElement.style.display = 'block';
                  }
                }}
              />
              <div style={{ display: 'none' }} className="text-xl font-bold text-accent">
                PushinPay
              </div>
              <a 
                href="https://pushinpay.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-auto text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
              >
                Acessar PushinPay <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <h2 className="heading-3 mb-2">Configuração de Pagamentos</h2>
            <p className="text-white/60">
              Configure sua chave PushinPay global. Esta chave será utilizada para todos os seus bots automaticamente.
              Todos os depósitos são feitos imediatamente após a aprovação do pagamento.
            </p>
          </div>

          <div className="bg-secondary/50 border border-border-light rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-accent rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Chave PushinPay Global</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {userProfile?.pushinpay_key ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Chave configurada</span>
                        <span className="text-sm text-white/40 ml-2 font-mono">
                          {showKey ? userProfile.pushinpay_key : `${userProfile.pushinpay_key.substring(0, 10)}...`}
                        </span>
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="text-blue-400 hover:text-blue-300 text-xs ml-2"
                        >
                          {showKey ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button
                          onClick={copyKey}
                          className="text-blue-400 hover:text-blue-300 ml-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-orange-400">Chave não configurada</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Válida para todos os {bots.length} bots da sua conta
                  </p>
                </div>
              </div>
              
              <button
                onClick={openKeyModal}
                className="button-primary flex items-center gap-2"
              >
                {userProfile?.pushinpay_key ? (
                  <>
                    <Edit className="w-4 h-4" />
                    Alterar
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Vincular
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Informações sobre split automático */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-200 mb-1">Split Automático</h4>
                <p className="text-sm text-blue-300/80">
                  O sistema aplica automaticamente um split de <strong>R$ 1,48 + 5%</strong> em todas as vendas.
                  O valor restante é depositado diretamente na sua conta PushinPay configurada.
                </p>
                <div className="mt-2 text-xs text-blue-300/60">
                  <strong>Exemplo:</strong> Em uma venda de R$ 10,00, você recebe R$ 8,02 e a plataforma fica com R$ 1,98.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de bots */}
        <div className="card">
          <div className="mb-6">
            <h2 className="heading-3 mb-2">Seus Bots</h2>
            <p className="text-white/60">
              Todos os bots utilizam automaticamente a sua chave PushinPay global configurada acima.
            </p>
          </div>

          {bots.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/50 mb-2">Nenhum bot encontrado</p>
              <p className="text-white/30 text-sm">Crie seu primeiro bot para começar a receber pagamentos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bots.map((bot) => (
                <div key={bot.id} className="flex items-center justify-between p-4 bg-secondary/50 border border-border-light rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-accent rounded-xl flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">{bot.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{bot.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {userProfile?.pushinpay_key ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-400">Pagamentos configurados</span>
                            {bot.plan && (
                              <span className="text-xs text-white/40 ml-2">Plano: {bot.plan}</span>
                            )}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-orange-400" />
                            <span className="text-sm text-orange-400">Configure a chave global acima</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-white/60">
                      {userProfile?.pushinpay_key ? 'Pronto para receber' : 'Aguardando configuração'}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Status: {bot.status === 'active' ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensagem de sucesso global */}
        {success && !showKeyModal && (
          <div className="fixed bottom-4 right-4 p-4 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg shadow-lg z-50">
            {success}
          </div>
        )}
      </div>

      {/* Modal para configurar chave */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-card rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="heading-3 mb-4">
              {userProfile?.pushinpay_key ? 'Alterar' : 'Configurar'} Chave PushinPay
            </h3>
            
            <p className="text-white/70 mb-4">
              Esta chave será utilizada para <strong>todos os seus bots</strong> automaticamente.
              Configure apenas uma vez e todos os pagamentos serão processados.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg">
                {success}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Chave PushinPay Global
              </label>
              <input
                type="text"
                value={pushinpayKey}
                onChange={(e) => setPushinpayKey(e.target.value)}
                placeholder="Digite sua chave PushinPay (ex: 30054|WAhgfJ...)"
                className="input"
                disabled={saving}
              />
              <p className="text-xs text-white/50 mt-2">
                Esta chave será aplicada automaticamente para todos os seus {bots.length} bots
              </p>
              <div className="mt-2 text-xs text-blue-300/80">
                <strong>💡 Dica:</strong> Você pode encontrar sua chave na{' '}
                <a 
                  href="https://pushinpay.com.br/dashboard/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  página de API do PushinPay
                </a>
              </div>
              {saving && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-sm text-blue-400">
                      Validando chave PushinPay...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeKeyModal}
                className="button-outline flex-1"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveKey}
                disabled={saving || !pushinpayKey.trim()}
                className="button-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 