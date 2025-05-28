'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { Plus, CreditCard, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  agency: string;
  holder_name: string;
  document: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface AdvanceRequest {
  id: string;
  amount: number;
  fee: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function FinancialPage() {
  const [balance, setBalance] = useState({
    pending: 0,
    available: 0
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bank_name: '',
    account_type: 'checking',
    account_number: '',
    agency: '',
    holder_name: '',
    document: ''
  });

  // Simula carregamento dos dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Aqui você faria as chamadas reais à API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dados simulados
        setBalance({
          pending: 1500.00,
          available: 3200.00
        });
        
        setBankAccounts([{
          id: '1',
          bank_name: 'Nubank',
          account_type: 'checking',
          account_number: '1234567-8',
          agency: '0001',
          holder_name: 'João Silva',
          document: '123.456.789-00'
        }]);
        
        setWithdrawals([{
          id: '1',
          amount: 1000.00,
          status: 'pending',
          created_at: '2024-03-20T10:00:00Z'
        }]);
        
        setAdvances([{
          id: '1',
          amount: 500.00,
          fee: 50.00,
          status: 'approved',
          created_at: '2024-03-19T15:00:00Z'
        }]);
        
      } catch (error) {
        toast.error('Erro ao carregar dados financeiros');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Simulação de adição de conta
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newBankAccount: BankAccount = {
        id: Date.now().toString(),
        ...newAccount
      };
      
      setBankAccounts(prev => [...prev, newBankAccount]);
      setShowAddAccount(false);
      setNewAccount({
        bank_name: '',
        account_type: 'checking',
        account_number: '',
        agency: '',
        holder_name: '',
        document: ''
      });
      
      toast.success('Conta bancária adicionada com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar conta bancária');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      if (balance.available < 100) {
        toast.error('Saldo mínimo para saque é R$ 100,00');
        return;
      }
      
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newWithdrawal: WithdrawalRequest = {
        id: Date.now().toString(),
        amount: balance.available,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      setWithdrawals(prev => [newWithdrawal, ...prev]);
      setBalance(prev => ({
        ...prev,
        available: 0
      }));
      
      toast.success('Solicitação de saque enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao solicitar saque');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async () => {
    try {
      if (balance.pending < 100) {
        toast.error('Valor mínimo para antecipação é R$ 100,00');
        return;
      }
      
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Taxa: R$1,48 + 5% por transação (simplificado para demonstração)
    const fee = balance.pending * 0.05 + (balance.pending > 0 ? 1.48 : 0);
      const newAdvance: AdvanceRequest = {
        id: Date.now().toString(),
        amount: balance.pending,
        fee,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      setAdvances(prev => [newAdvance, ...prev]);
      setBalance(prev => ({
        pending: 0,
        available: prev.available + (balance.pending - fee)
      }));
      
      toast.success('Antecipação realizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao realizar antecipação');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="heading-1">Financeiro</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg p-6">
          <h3 className="text-sm text-white/80 mb-1">Aguardando</h3>
          <p className="text-3xl font-bold text-white">{formatCurrency(balance.pending)}</p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleAdvance}
              disabled={loading || balance.pending < 100}
            >
              Antecipar
            </Button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg p-6">
          <h3 className="text-sm text-white/80 mb-1">Saldo em conta</h3>
          <p className="text-3xl font-bold text-white">{formatCurrency(balance.available)}</p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleWithdraw}
              disabled={loading || balance.available < 100}
            >
              Saque
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="w-full border-b rounded-none p-0">
            <TabsTrigger 
              value="accounts" 
              className="flex-1 rounded-none border-r data-[state=active]:bg-secondary"
            >
              Contas Bancárias
            </TabsTrigger>
            <TabsTrigger 
              value="withdrawals" 
              className="flex-1 rounded-none border-r data-[state=active]:bg-secondary"
            >
              Saques
            </TabsTrigger>
            <TabsTrigger 
              value="advances" 
              className="flex-1 rounded-none data-[state=active]:bg-secondary"
            >
              Antecipações
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="accounts" className="p-6">
            {!showAddAccount ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Minhas Contas</h3>
                  <Button
                    onClick={() => setShowAddAccount(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Adicionar Conta
                  </Button>
                </div>
                
                {bankAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhuma conta bancária cadastrada
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map(account => (
                      <div
                        key={account.id}
                        className="p-4 rounded-lg border bg-card flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <CreditCard className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">{account.bank_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Ag: {account.agency} | CC: {account.account_number}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(account.account_number);
                            toast.success('Número da conta copiado!');
                          }}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Nova Conta Bancária</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddAccount(false)}
                  >
                    Voltar
                  </Button>
                </div>
                
                <form onSubmit={handleAddAccount} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Banco
                      </label>
                      <input
                        type="text"
                        className="input-auth w-full"
                        value={newAccount.bank_name}
                        onChange={e => setNewAccount(prev => ({
                          ...prev,
                          bank_name: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tipo de Conta
                      </label>
                      <select
                        className="input-auth w-full"
                        value={newAccount.account_type}
                        onChange={e => setNewAccount(prev => ({
                          ...prev,
                          account_type: e.target.value
                        }))}
                        required
                      >
                        <option value="checking">Conta Corrente</option>
                        <option value="savings">Conta Poupança</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Agência
                      </label>
                      <input
                        type="text"
                        className="input-auth w-full"
                        value={newAccount.agency}
                        onChange={e => setNewAccount(prev => ({
                          ...prev,
                          agency: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Número da Conta
                      </label>
                      <input
                        type="text"
                        className="input-auth w-full"
                        value={newAccount.account_number}
                        onChange={e => setNewAccount(prev => ({
                          ...prev,
                          account_number: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nome do Titular
                      </label>
                      <input
                        type="text"
                        className="input-auth w-full"
                        value={newAccount.holder_name}
                        onChange={e => setNewAccount(prev => ({
                          ...prev,
                          holder_name: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        CPF/CNPJ
                      </label>
                      <input
                        type="text"
                        className="input-auth w-full"
                        value={newAccount.document}
                        onChange={e => setNewAccount(prev => ({
                          ...prev,
                          document: e.target.value
                        }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto"
                    >
                      {loading ? 'Salvando...' : 'Salvar Conta'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="withdrawals" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Histórico de Saques</h3>
              
              {withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum saque realizado
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map(withdrawal => (
                    <div
                      key={withdrawal.id}
                      className="p-4 rounded-lg border bg-card flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(withdrawal.created_at)}
                        </p>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-sm
                        ${withdrawal.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {withdrawal.status === 'approved' && 'Aprovado'}
                        {withdrawal.status === 'pending' && 'Em análise'}
                        {withdrawal.status === 'rejected' && 'Rejeitado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="advances" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Histórico de Antecipações</h3>
              
              {advances.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhuma antecipação realizada
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {advances.map(advance => (
                    <div
                      key={advance.id}
                      className="p-4 rounded-lg border bg-card flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {formatCurrency(advance.amount)}
                          </p>
                          <span className="text-sm text-muted-foreground">
                            (Taxa: {formatCurrency(advance.fee)})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(advance.created_at)}
                        </p>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-sm
                        ${advance.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${advance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${advance.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {advance.status === 'approved' && 'Aprovado'}
                        {advance.status === 'pending' && 'Em análise'}
                        {advance.status === 'rejected' && 'Rejeitado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 
