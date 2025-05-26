'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Download,
  PiggyBank,
  ArrowUpRight,
  Eye,
  Calendar,
  Filter,
  Users,
  Bot,
  RefreshCw
} from 'lucide-react';

interface FinancialData {
  total_revenue: number;
  available_balance: number;
  pending_balance: number;
  total_withdrawals: number;
  pix_key?: string;
  pix_key_type?: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  bot_name?: string;
  status?: string;
}

interface Sale {
  id: string;
  amount: number;
  customer_name: string;
  bot_name: string;
  plan_name: string;
  sale_date: string;
  status: string;
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState('30'); // dias
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Estados do modal de saque
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Carregar dados financeiros com cache otimizado
  const loadFinancialData = useCallback(async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      if (skipLoading) setRefreshing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Carregar dados em paralelo para melhor performance
      const [financeResult, transactionResult, salesResult] = await Promise.all([
        // Dados financeiros principais
        supabase
          .from('user_finances')
        .select('*')
        .eq('user_id', user.id)
          .single(),
        
        // Transações recentes (limitadas para performance)
        supabase
          .from('financial_transactions')
          .select(`
            *,
            bots (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Vendas do período (com filtro otimizado)
        (() => {
          const dateFilter = new Date();
          dateFilter.setDate(dateFilter.getDate() - parseInt(period));
          
          return supabase
            .from('sales')
            .select(`
              *,
              bots (name),
              plans (name)
            `)
            .gte('sale_date', dateFilter.toISOString())
            .order('sale_date', { ascending: false })
            .limit(50); // Limitar para performance
        })()
      ]);

      // Processar resultados
      if (financeResult.data) {
        setFinancialData(financeResult.data);
      } else {
        // Criar registro financeiro se não existir
        const { data: newFinance } = await supabase
          .from('user_finances')
          .insert({
            user_id: user.id,
            total_revenue: 0,
            available_balance: 0,
            pending_balance: 0,
            total_withdrawals: 0
          })
          .select()
        .single();
      
        setFinancialData(newFinance);
      }
      
      if (transactionResult.data) {
        setTransactions(transactionResult.data.map(t => ({
          ...t,
          bot_name: t.bots?.name
        })));
      }

      if (salesResult.data) {
        setSales(salesResult.data.map(s => ({
          ...s,
          bot_name: s.bots?.name || 'Bot Removido',
          plan_name: s.plans?.name || 'Plano Removido'
        })));
      }

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, router]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);
      
  // Refresh manual dos dados
  const handleRefresh = useCallback(() => {
    loadFinancialData(true);
  }, [loadFinancialData]);

  // Função para solicitar saque
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    // Validações
    if (!amount || amount <= 0) {
      setWithdrawError('Valor deve ser maior que zero');
        return;
      }
      
    if (amount < 5) {
      setWithdrawError('Valor mínimo para saque é R$ 5,00');
      return;
    }
    
    if (amount > 10000) {
      setWithdrawError('Valor máximo para saque é R$ 10.000,00');
      return;
    }
    
    if (!financialData || amount > financialData.available_balance) {
      setWithdrawError('Saldo insuficiente');
      return;
    }
    
    setWithdrawLoading(true);
    setWithdrawError('');
    
    try {
      const response = await fetch('/api/financeiro/solicitar-saque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          description: withdrawDescription || 'Saque PIX'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Saque solicitado com sucesso!\n\nValor: R$ ${amount.toFixed(2)}\nStatus: ${data.status}\n\nSeu saque será processado em até 24 horas.`);

        // Fechar modal e recarregar dados
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawDescription('');
        loadFinancialData();
      } else {
        if (data.redirect) {
          const confirmRedirect = confirm(`${data.error}\n\nDeseja configurar sua chave PIX agora?`);
          if (confirmRedirect) {
            router.push(data.redirect);
          }
        } else {
          setWithdrawError(data.error || 'Erro ao processar saque');
        }
      }
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      setWithdrawError('Erro de conexão. Tente novamente.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Memoized formatters para melhor performance
  const formatCurrency = useMemo(() => (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }, []);

  const formatWithdrawAmount = (value: string) => {
    // Remove caracteres não numéricos exceto vírgula e ponto
    let cleaned = value.replace(/[^\d,\.]/g, '');
    
    // Substitui vírgula por ponto
    cleaned = cleaned.replace(',', '.');
    
    // Garante apenas um ponto decimal
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts[1];
    }
    
    // Limita a 2 casas decimais
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const formatDate = useMemo(() => (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'fee':
        return <CreditCard className="w-4 h-4 text-red-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
      }
  };

  // Cálculos otimizados
  const salesStats = useMemo(() => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    return { totalSales, totalRevenue, avgTicket };
  }, [sales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header com botão de refresh */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💰 Área Financeira
            </h1>
            <p className="text-gray-600">
              Gerencie seus ganhos, saques e acompanhe o desempenho dos seus bots
            </p>
          </div>
          
          {/* Botão de refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {/* Cards de Resumo com melhor organização */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-green-100 text-sm font-medium">Saldo Disponível</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(financialData?.available_balance || 0)}
                </p>
              </div>
              <div className="h-14 w-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <PiggyBank className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="w-full bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium backdrop-blur-sm"
                disabled={!financialData?.available_balance || financialData.available_balance < 5}
              >
                💸 Solicitar Saque
              </button>
              {financialData?.available_balance && financialData.available_balance < 5 && (
                <p className="text-green-100 text-xs mt-1">Valor mínimo para saque: R$ 5,00</p>
              )}
          </div>
        </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(financialData?.total_revenue || 0)}
                </p>
        </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 Valor líquido já descontadas as taxas
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saques Realizados</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(financialData?.total_withdrawals || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              ⏰ Processados em até 24h
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendas ({period} dias)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {salesStats.totalSales}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
                  </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              📊 Ticket médio: {formatCurrency(salesStats.avgTicket)}
            </p>
                </div>
              </div>
              
        {/* Filtros e Configurações */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="365">Último ano</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard/financeiro/configurar')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <CreditCard className="w-4 h-4" />
                Configurar PIX
              </button>
              <button
                onClick={() => router.push('/dashboard/financeiro/historico')}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <Eye className="w-4 h-4" />
                Ver Histórico
              </button>
            </div>
          </div>
        </div>

        {/* Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vendas Recentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📈 Vendas Recentes</h3>
              <p className="text-sm text-gray-600">Últimas vendas dos seus bots</p>
            </div>
            <div className="p-6">
              {sales.length > 0 ? (
                <div className="space-y-4">
                  {sales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Bot className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sale.customer_name}</p>
                          <p className="text-sm text-gray-600">{sale.bot_name} • {sale.plan_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(sale.sale_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(sale.amount)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(sale.status)}`}>
                          {sale.status === 'completed' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma venda no período selecionado</p>
                </div>
              )}
            </div>
          </div>

          {/* Transações Recentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">💳 Transações Recentes</h3>
              <p className="text-sm text-gray-600">Histórico de movimentações</p>
            </div>
            <div className="p-6">
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          {transaction.bot_name && (
                            <p className="text-sm text-gray-600">{transaction.bot_name}</p>
                          )}
                          <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações Importantes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">
            ℹ️ Informações Importantes sobre Saques
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-2">⏰ Prazos de Processamento:</p>
              <ul className="space-y-1 ml-4">
                <li>• PIX: Processado em até 24 horas</li>
                <li>• Dias úteis: Segunda a Sexta</li>
                <li>• Saques solicitados no fim de semana são processados na segunda-feira</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">💰 Taxas e Limites:</p>
              <ul className="space-y-1 ml-4">
                <li>• Valor mínimo: R$ 5,00</li>
                <li>• Valor máximo: R$ 10.000,00 por dia</li>
                <li>• Taxa de saque: Gratuito</li>
                <li>• Unlimited saques por mês</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Saque - Versão Funcional */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">💸 Solicitar Saque PIX</h3>
            
            <div className="space-y-4">
              {/* Informações do saldo */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Saldo disponível:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(financialData?.available_balance || 0)}
                  </span>
                </div>
              </div>

              {/* Campo valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Saque *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(formatWithdrawAmount(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0,00"
                    disabled={withdrawLoading}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mínimo: R$ 5,00</span>
                  <span>Máximo: R$ 10.000,00</span>
                </div>
              </div>
              
              {/* Campo descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={withdrawDescription}
                  onChange={(e) => setWithdrawDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Saque para despesas"
                  disabled={withdrawLoading}
                  maxLength={100}
                />
              </div>

              {/* Informações importantes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 text-sm mb-2">📋 Informações do Saque</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Processamento: até 24 horas úteis</li>
                  <li>• Taxa: Gratuito</li>
                  <li>• Cancelamento: até 1 hora após solicitação</li>
                  <li>• Chave PIX: {financialData?.pix_key ? '✅ Configurada' : '❌ Não configurada'}</li>
                </ul>
          </div>

              {/* Erro */}
              {withdrawError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">❌ {withdrawError}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                    setWithdrawDescription('');
                    setWithdrawError('');
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  disabled={withdrawLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading || !withdrawAmount || !financialData?.pix_key}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {withdrawLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processando...
                    </>
                  ) : (
                    'Confirmar Saque'
                  )}
                </button>
              </div>
              
              {/* Link configurar PIX */}
              {!financialData?.pix_key && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => router.push('/dashboard/financeiro/configurar')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    🔧 Configurar Chave PIX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
  );
} 