'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import supabase from '@/lib/supabase';
import { toast } from 'sonner';
import { DollarSign, Settings, Save, AlertCircle, Calculator, TrendingUp, CreditCard, Loader2 } from 'lucide-react';

// Tipos para os dados bancários
type BankAccountType = 'checking' | 'savings';
type PixKeyType = 'cpf' | 'email' | 'phone' | 'random';

interface BankAccountForm {
  bankName: string;
  accountType: BankAccountType;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  pixKeyType: PixKeyType;
  pixKey: string;
}

interface Bot {
  id: string;
  name: string;
}

interface Payment {
  amount: string;
}

// Componente para cálculo visual das taxas
const FeeCalculator = ({ config }: { config: any }) => {
  const [amount, setAmount] = useState(100);
  
  const calculateFees = (value: number) => {
    const fixedFee = config.fixed_fee;
    const percentageFee = value * config.percentage_fee;
    const totalFee = fixedFee + percentageFee;
    const netAmount = value - totalFee;

    return {
      original: value,
      fixed: fixedFee,
      percentage: percentageFee,
      total: totalFee,
      net: netAmount
    };
  };

  const fees = calculateFees(amount);

  return (
    <div className="bg-card border border-border-light rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={20} className="text-accent" />
        <h3 className="text-lg font-semibold">Simulador de Comissões</h3>
      </div>

      <div className="mb-4">
        <label className="block text-white/70 mb-2">Valor da venda (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="input w-full"
          placeholder="Digite um valor para simular"
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
          <span className="text-white/70">Valor original:</span>
          <span className="font-semibold">R$ {fees.original.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg">
          <span className="text-white/70">Taxa fixa:</span>
          <span className="font-semibold text-yellow-500">- R$ {fees.fixed.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-orange-500/10 rounded-lg">
          <span className="text-white/70">Taxa percentual ({(config.percentage_fee * 100).toFixed(1)}%):</span>
          <span className="font-semibold text-orange-500">- R$ {fees.percentage.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
          <span className="text-white/70">Total de taxas:</span>
          <span className="font-semibold text-red-500">- R$ {fees.total.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <span className="text-white/70">Você recebe:</span>
          <span className="font-bold text-green-500 text-lg">R$ {fees.net.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default function FinancePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSavedAccount, setHasSavedAccount] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  
  // Estado para os dados do formulário
  const [formData, setFormData] = useState<BankAccountForm>({
    bankName: '',
    accountType: 'checking',
    agency: '',
    accountNumber: '',
    accountDigit: '',
    pixKeyType: 'cpf',
    pixKey: ''
  });

  // Estado para dados financeiros
  const [stats, setStats] = useState({
    pendingBalance: 0,
    accountBalance: 0
  });

  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    fixed_fee: 1.48,
    percentage_fee: 0.05,
    platform_name: 'PushinPay',
    description: 'Comissão automática descontada na API da PushinPay',
    active: true
  });
  const [isDefault, setIsDefault] = useState(true);

  // Carregar dados bancários e saldos ao iniciar
  useEffect(() => {
    if (user) {
      loadBankAccount();
      loadFinancialData();
      fetchSplitConfig();
    }
  }, [user]);

  // Função para carregar dados bancários do usuário
  const loadBankAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error) {
        console.error('Erro ao carregar dados bancários:', error);
        return;
      }
      
      if (data) {
        setHasSavedAccount(true);
        setFormData({
          bankName: data.bank_name || '',
          accountType: data.account_type || 'checking',
          agency: data.agency || '',
          accountNumber: data.account_number || '',
          accountDigit: data.account_digit || '',
          pixKeyType: data.pix_key_type || 'cpf',
          pixKey: data.pix_key || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados bancários:', error);
    }
  };

  // Função para carregar dados financeiros
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // 1. Buscar todos os bots do usuário
      const { data: bots, error: botsError } = await supabase
        .from('bots')
        .select('id')
        .eq('owner_id', user?.id);
      
      if (botsError) throw botsError;
      
      if (!bots || bots.length === 0) {
        setLoading(false);
        return; // Usuário não tem bots
      }
      
      const botIds = bots.map((bot: Bot) => bot.id);
      
      // 2. Buscar saldo pendente
      const { data: pendingPayments, error: pendingError } = await supabase
        .from('bot_payments')
        .select('amount')
        .in('bot_id', botIds)
        .eq('status', 'approved')
        .is('payout_status', null);
      
      if (pendingError) throw pendingError;
      
      // 3. Buscar saldo disponível para saque
      const { data: availableBalance, error: balanceError } = await supabase
        .from('bot_payments')
        .select('amount')
        .in('bot_id', botIds)
        .eq('status', 'approved')
        .eq('payout_status', 'available');
      
      if (balanceError) throw balanceError;
      
      // 4. Calcular saldos
      const pendingAmount = pendingPayments?.reduce((sum: number, payment: Payment) => sum + parseFloat(payment.amount), 0) || 0;
      const availableAmount = availableBalance?.reduce((sum: number, payment: Payment) => sum + parseFloat(payment.amount), 0) || 0;
      
      // 5. Atualizar estado
      setStats({
        pendingBalance: pendingAmount,
        accountBalance: availableAmount
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast.error('Não foi possível carregar os dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const fetchSplitConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finance/split?user_id=${user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setIsDefault(data.is_default);
      } else {
        console.error('Erro ao buscar configuração do split');
        // Usar configuração padrão em caso de erro
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      // Usar configuração padrão em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com alterações nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para salvar os dados bancários
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Salvar ou atualizar os dados bancários
      const { error } = await supabase
        .from('user_bank_accounts')
        .upsert({
          user_id: user?.id,
          bank_name: formData.bankName,
          account_type: formData.accountType,
          agency: formData.agency,
          account_number: formData.accountNumber,
          account_digit: formData.accountDigit,
          pix_key_type: formData.pixKeyType,
          pix_key: formData.pixKey,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        });
      
      if (error) throw error;
      
      setHasSavedAccount(true);
      setIsEditing(false);
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSaveSuccess(null);
      }, 5000);
      
    } catch (error) {
      console.error('Erro ao salvar dados bancários:', error);
      setSaveSuccess(false);
      
      setTimeout(() => {
        setSaveSuccess(null);
      }, 5000);
    }
  };

  const handleWithdraw = async () => {
    if (stats.accountBalance <= 0) {
      toast.error('Não há saldo disponível para saque');
      return;
    }
    
    if (!hasSavedAccount) {
      toast.error('Adicione seus dados bancários antes de realizar um saque');
      return;
    }
    
    try {
      // Simular solicitação de saque
      toast.success('Solicitação de saque enviada com sucesso! Em breve entraremos em contato.');
      
      // Em uma implementação real, aqui seria feita a integração com API de pagamento
      // e atualização do status dos pagamentos no banco de dados
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      toast.error('Não foi possível processar sua solicitação de saque');
    }
  };

  const handleSave = async () => {
    if (config.fixed_fee < 0 || config.percentage_fee < 0 || config.percentage_fee > 1) {
      toast.error('Valores de taxa inválidos');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/finance/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          fixed_fee: config.fixed_fee,
          percentage_fee: config.percentage_fee,
          active: config.active
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Configuração salva com sucesso!');
        setIsDefault(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setConfig({
      fixed_fee: 1.48,
      percentage_fee: 0.05,
      platform_name: 'PushinPay',
      description: 'Comissão automática descontada na API da PushinPay',
      active: true
    });
    toast.info('Configuração resetada para os valores padrão');
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="heading-2">Configurações Financeiras</h1>
          <p className="text-white/60">Configure o split de comissões da PushinPay</p>
        </div>
        
        <div className="flex gap-3">
            <button 
            onClick={resetToDefault}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
            <Settings size={16} />
            Padrão
            </button>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar
              </>
            )}
          </button>
        </div>
            </div>
            
      {/* Informações sobre o Split */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-500 mb-2">Como funciona o Split</h3>
            <p className="text-white/80 text-sm">
              O split de comissões é descontado automaticamente na API da PushinPay quando um usuário realiza uma compra. 
              A configuração atual é de <strong>R$ {config.fixed_fee.toFixed(2)} + {(config.percentage_fee * 100).toFixed(1)}%</strong> sobre cada venda.
              Esses valores são descontados antes de você receber o pagamento.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações do Split */}
        <div className="bg-card border border-border-light rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard size={20} className="text-accent" />
            <h2 className="text-lg font-semibold">Configuração do Split</h2>
            {isDefault && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                Padrão
              </span>
            )}
          </div>
          
          <div className="space-y-4">
              <div>
              <label className="block text-white/70 mb-2">Taxa fixa (R$)</label>
                <input
                type="number"
                min="0"
                step="0.01"
                value={config.fixed_fee}
                onChange={(e) => setConfig(prev => ({ ...prev, fixed_fee: parseFloat(e.target.value) || 0 }))}
                className="input w-full"
                placeholder="Taxa fixa em reais"
              />
              <p className="text-white/60 text-xs mt-1">
                Valor fixo descontado de cada venda (recomendado: R$ 1,48)
              </p>
              </div>
              
              <div>
              <label className="block text-white/70 mb-2">Taxa percentual (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(config.percentage_fee * 100).toFixed(1)}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  percentage_fee: parseFloat(e.target.value) / 100 || 0 
                }))}
                className="input w-full"
                placeholder="Percentual da venda"
              />
              <p className="text-white/60 text-xs mt-1">
                Percentual sobre o valor da venda (recomendado: 5%)
              </p>
            </div>
            
              <div>
              <label className="block text-white/70 mb-2">Plataforma</label>
                <input
                  type="text"
                value={config.platform_name}
                className="input w-full"
                disabled
                placeholder="Nome da plataforma"
              />
              <p className="text-white/60 text-xs mt-1">
                Plataforma responsável pelo processamento dos pagamentos
              </p>
              </div>
              
              <div>
              <label className="block text-white/70 mb-2">Descrição</label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                className="input w-full h-20 resize-none"
                placeholder="Descrição da configuração do split"
                />
              </div>
              
            <div className="flex items-center gap-2">
                <input
                type="checkbox"
                id="active"
                checked={config.active}
                onChange={(e) => setConfig(prev => ({ ...prev, active: e.target.checked }))}
                className="rounded border-border-light text-accent focus:ring-accent"
              />
              <label htmlFor="active" className="text-white/80">
                Split ativo
              </label>
                </div>
              </div>
            </div>
            
        {/* Calculadora de Taxas */}
        <FeeCalculator config={config} />
                  </div>
                  
      {/* Estatísticas de exemplo */}
      <div className="mt-6 bg-card border border-border-light rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Resumo Mensal (Exemplo)</h3>
                </div>
                
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold mb-1">R$ 2.500,00</div>
            <div className="text-white/60 text-sm">Total de vendas</div>
                  </div>
                  
          <div className="text-center p-4 bg-red-500/10 rounded-lg">
            <div className="text-2xl font-bold mb-1 text-red-500">
              R$ {(config.fixed_fee * 10 + 2500 * config.percentage_fee).toFixed(2)}
                  </div>
            <div className="text-white/60 text-sm">Total de taxas</div>
                </div>
                
          <div className="text-center p-4 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold mb-1 text-green-500">
              R$ {(2500 - (config.fixed_fee * 10 + 2500 * config.percentage_fee)).toFixed(2)}
                </div>
            <div className="text-white/60 text-sm">Você recebe</div>
          </div>
        </div>

        <p className="text-white/60 text-xs mt-4 text-center">
          * Exemplo baseado em 10 vendas de R$ 250,00 cada
        </p>
      </div>
    </DashboardLayout>
  );
} 