'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  DollarSign, 
  CreditCard, 
  Percent, 
  TrendingUp, 
  Calendar,
  Settings,
  Save,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  Clock,
  AlertCircle,
  Banknote
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Componente para estatísticas
const StatCard = ({ title, value, icon, description = null, color = "primary" }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string | null;
  color?: string;
}) => {
  const colorClasses = {
    primary: "text-primary",
    green: "text-green-400",
    yellow: "text-yellow-400", 
    red: "text-red-400",
    blue: "text-blue-400"
  };

  return (
    <div className="bg-card border border-border-light rounded-xl p-6 hover:border-accent/30 transition-all duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-white/60 text-sm font-medium">{title}</span>
          {description && <div className="text-white/40 text-xs mt-1">{description}</div>}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
    </div>
  );
};

export default function FinanceiroPage() {
  const { user, isLoading } = useAuth();
  const [userData, setUserData] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: 'corrente',
    cpf: '',
    nomeCompleto: '',
    chavePixTipo: 'cpf',
    chavePix: ''
  });
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({
    saldoDisponivel: 0,
    receitaTotal: 0,
    comissaoPlataforma: 0,
    proximoSaque: null
  });

  // Dados da plataforma - Split: R$1,48 + 5%
  const PLATFORM_FEE_FIXED = 1.48; // Taxa fixa em reais
  const PLATFORM_FEE_PERCENT = 5.0; // Taxa percentual

  useEffect(() => {
    if (user) {
      loadUserData();
      loadFinancialStats();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      if (!user?.id) return;
      
      // Carregar dados financeiros do banco de dados
      const { data, error } = await supabase
        .from('user_financial')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Erro ao carregar dados financeiros:', error);
        return;
      }
      
      if (data) {
        setUserData({
          banco: data.banco || '',
          agencia: data.agencia || '',
          conta: data.conta || '',
          tipoConta: data.tipo_conta || 'corrente',
          cpf: data.cpf || '',
          nomeCompleto: data.nome_completo || '',
          chavePixTipo: data.pix_tipo || 'cpf',
          chavePix: data.pix_chave || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }
  };

  const loadFinancialStats = async () => {
    try {
      if (!user?.id) return;
      
      // Buscar transações do banco de dados
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Erro ao carregar transações:', error);
        return;
      }
      
      // Calcular estatísticas
      let receitaTotal = 0;
      let totalTransactions = 0;
      
      // Filtrar transações completadas
      const completedTransactions = transactions?.filter(tx => 
        tx.status === 'completed' || tx.status === 'approved'
      ) || [];
      
      // Calcular receita total
      receitaTotal = completedTransactions.reduce((sum, tx) => 
        sum + (parseFloat(tx.amount) || 0), 0
      );
      
      // Contar transações
      totalTransactions = completedTransactions.length;
      
      // Calcular comissão da plataforma
      const comissaoPlataforma = (PLATFORM_FEE_FIXED * totalTransactions) + (receitaTotal * (PLATFORM_FEE_PERCENT / 100));
      const saldoDisponivel = receitaTotal - comissaoPlataforma;

      // Calcular próximo saque (exemplo: 15 dias a partir de hoje)
      const proximoSaque = new Date();
      proximoSaque.setDate(proximoSaque.getDate() + 15);

      setStats({
        saldoDisponivel,
        receitaTotal,
        comissaoPlataforma,
        proximoSaque: proximoSaque.toISOString()
      });
      
      console.log('📊 Estatísticas financeiras calculadas:', {
        saldoDisponivel,
        receitaTotal,
        comissaoPlataforma,
        totalTransactions
      });
    } catch (error) {
      console.error('Erro ao calcular estatísticas financeiras:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return formatted;
  };

  const validateForm = () => {
    if (!userData.nomeCompleto.trim()) {
      toast.error('Nome completo é obrigatório');
      return false;
    }
    if (!userData.cpf || userData.cpf.length < 14) {
      toast.error('CPF válido é obrigatório');
      return false;
    }
    if (userData.banco && (!userData.agencia || !userData.conta)) {
      toast.error('Para conta bancária, agência e conta são obrigatórios');
      return false;
    }
    if (userData.chavePix && !userData.chavePixTipo) {
      toast.error('Tipo da chave PIX é obrigatório');
      return false;
    }
    if (!userData.banco && !userData.chavePix) {
      toast.error('É necessário informar pelo menos uma forma de recebimento (Conta bancária ou PIX)');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (!user?.id) {
        toast.error('Usuário não identificado');
        return;
      }
      
      // Salvar no banco de dados
      const { error } = await supabase
        .from('user_financial')
        .upsert({
          user_id: user.id,
          banco: userData.banco,
          agencia: userData.agencia,
          conta: userData.conta,
          tipo_conta: userData.tipoConta,
          cpf: userData.cpf,
          nome_completo: userData.nomeCompleto,
          pix_tipo: userData.chavePixTipo,
          pix_chave: userData.chavePix,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
      
      toast.success('Dados financeiros salvos com sucesso!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Erro ao salvar dados financeiros');
      console.error('Erro:', error);
    } finally {
      setIsSaving(false);
    }
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-8">
        {/* Cabeçalho */}
        <div className="bg-card border border-border-light rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Financeiro</h1>
              <p className="text-white/60">Gerencie seus dados financeiros e acompanhe seus ganhos</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                <Settings size={16} />
                {isEditing ? 'Cancelar' : 'Editar Dados'}
              </Button>
              {isEditing && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-accent hover:bg-accent/90"
                >
                  <Save size={16} />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Saldo Disponível"
            value={`R$ ${stats.saldoDisponivel.toFixed(2).replace('.', ',')}`}
            icon={<DollarSign size={20} />}
            description={"Valor líquido para saque"}
            color="green"
          />
          <StatCard
            title="Receita Total"
            value={`R$ ${stats.receitaTotal.toFixed(2).replace('.', ',')}`}
            icon={<TrendingUp size={20} />}
            description={"Valor bruto das vendas"}
            color="blue"
          />
          <StatCard
            title="Comissão Plataforma"
            value={`R$ ${stats.comissaoPlataforma.toFixed(2).replace('.', ',')}`}
            icon={<Percent size={20} />}
            description={`R$${PLATFORM_FEE_FIXED} + ${PLATFORM_FEE_PERCENT}% por venda`}
            color="yellow"
          />
          <StatCard
            title="Próximo Saque"
            value={stats.proximoSaque || "Não agendado"}
            icon={<Calendar size={20} />}
            description={"Data do próximo saque"}
            color="primary"
          />
        </div>

        {/* Informações sobre Split */}
        <div className="bg-card border border-border-light rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Info size={24} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Informações sobre Comissões</h3>
              <div className="space-y-2 text-white/70">
                <p>• A plataforma cobra uma comissão de <strong className="text-yellow-400">R${PLATFORM_FEE_FIXED} + {PLATFORM_FEE_PERCENT}%</strong> sobre cada venda realizada</p>
                <p>• Esta comissão cobre os custos de infraestrutura, processamento de pagamentos e suporte</p>
                <p>• O valor líquido que você recebe é calculado descontando a taxa fixa e percentual de cada transação</p>
                <p>• Os saques são processados em até 3 dias úteis após a solicitação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dados Bancários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dados Pessoais */}
          <div className="bg-card border border-border-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Dados Pessoais
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={userData.nomeCompleto}
                  onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white placeholder-white/50 focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">CPF</label>
                <input
                  type="text"
                  value={userData.cpf}
                  onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                  disabled={!isEditing}
                  maxLength={14}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white placeholder-white/50 focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          {/* Conta Bancária */}
          <div className="bg-card border border-border-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Banknote size={20} />
              Conta Bancária
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Banco</label>
                <input
                  type="text"
                  value={userData.banco}
                  onChange={(e) => handleInputChange('banco', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white placeholder-white/50 focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="Nome do banco"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Agência</label>
                  <input
                    type="text"
                    value={userData.agencia}
                    onChange={(e) => handleInputChange('agencia', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white placeholder-white/50 focus:border-accent focus:outline-none disabled:opacity-50"
                    placeholder="0000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Conta</label>
                  <div className="relative">
                    <input
                      type={showAccountNumber ? "text" : "password"}
                      value={userData.conta}
                      onChange={(e) => handleInputChange('conta', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 pr-10 rounded-lg bg-background border border-border-light text-white placeholder-white/50 focus:border-accent focus:outline-none disabled:opacity-50"
                      placeholder="00000-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Tipo de Conta</label>
                <select
                  value={userData.tipoConta}
                  onChange={(e) => handleInputChange('tipoConta', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white focus:border-accent focus:outline-none disabled:opacity-50"
                >
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Conta Poupança</option>
                </select>
              </div>
            </div>
          </div>

          {/* PIX */}
          <div className="bg-card border border-border-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              PIX (Alternativo)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Tipo da Chave</label>
                <select
                  value={userData.chavePixTipo}
                  onChange={(e) => handleInputChange('chavePixTipo', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white focus:border-accent focus:outline-none disabled:opacity-50"
                >
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Chave PIX</label>
                <input
                  type="text"
                  value={userData.chavePix}
                  onChange={(e) => handleInputChange('chavePix', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border-light text-white placeholder-white/50 focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder={
                    userData.chavePixTipo === 'cpf' ? 'Seu CPF' :
                    userData.chavePixTipo === 'email' ? 'seu@email.com' :
                    userData.chavePixTipo === 'telefone' ? '(11) 99999-9999' :
                    'Chave aleatória'
                  }
                />
              </div>
            </div>
          </div>

          {/* Status e Histórico */}
          <div className="bg-card border border-border-light rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              Status e Histórico
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 font-medium">Dados Validados</span>
                </div>
                <span className="text-xs text-green-400/70">Atualizado hoje</span>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-white/80">Histórico de Saques</h4>
                <div className="text-center py-8 text-white/40">
                  <Clock size={24} className="mx-auto mb-2" />
                  <p className="text-sm">Nenhum saque realizado ainda</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 