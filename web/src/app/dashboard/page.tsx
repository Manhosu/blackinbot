'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, DollarSign, Globe, ChevronDown, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';

interface DashboardTransaction {
  id: string;
  status: string;
  amount: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [period, setPeriod] = useState('7');
  const [loading, setLoading] = useState(true);
  
  // Estado para as estatísticas reais
  const [stats, setStats] = useState({
    transactions: 0,
    amount: 0,
    totalSales: 0,
    pendingBalance: 0,
    accountBalance: 0
  });

  // Buscar estatísticas ao carregar a página ou quando o período mudar
  useEffect(() => {
    if (!isLoading) {
      fetchDashboardStats();
    }
  }, [isLoading, period]);

  // Função para buscar estatísticas do dashboard
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Calcular a data do início do período
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parseInt(period));
      
      // Buscar estatísticas do banco de dados
      let dashboardStats = {
        transactions: 0,
        amount: 0,
        totalSales: 0,
        pendingBalance: 0,
        accountBalance: 0
      };
      
      try {
        // Buscar transações do banco de dados
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .gte('created_at', startDate.toISOString());
        
        if (error) {
          throw error;
        }
        
        if (transactions && transactions.length > 0) {
          // Filtrar transações completadas no período
          const completedTransactions = transactions.filter((tx: DashboardTransaction) => tx.status === 'completed');
          
          // Calcular estatísticas
          const totalAmount = completedTransactions.reduce((sum: number, tx: DashboardTransaction) => sum + parseFloat(tx.amount || '0'), 0);
          
          // Transações pendentes
          const pendingTransactions = transactions.filter((tx: DashboardTransaction) => tx.status === 'pending');
          const pendingAmount = pendingTransactions.reduce((sum: number, tx: DashboardTransaction) => sum + parseFloat(tx.amount || '0'), 0);
          
          // Definir estatísticas
          dashboardStats = {
            transactions: completedTransactions.length,
            amount: totalAmount,
            totalSales: totalAmount,
            pendingBalance: pendingAmount,
            accountBalance: totalAmount - pendingAmount
          };
        }
        
        console.log('📊 Estatísticas calculadas do banco de dados:', dashboardStats);
      } catch (dbError) {
        console.warn('⚠️ Erro ao buscar estatísticas do banco:', dbError);
        toast.error('Erro ao buscar estatísticas');
      }
      
      // Atualizar o estado com os dados
      setStats(dashboardStats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Não foi possível carregar as estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Não redirecionar para login, usar modo local
  // if (!isAuthenticated) {
  //   router.push('/login');
  //   return null;
  // }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading-2">Visão geral</h1>
        
        <div className="relative">
          <select 
            className="select pr-10"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white/60" />
        </div>
      </div>

      {/* Banner destaque */}
      <div className="mb-6 p-6 bg-primary rounded-xl flex items-center gap-4">
        <Globe size={32} className="text-accent" />
        <div>
          <h2 className="text-xl font-bold text-white">Quer vender internacionalmente?</h2>
          <p className="text-white/70">Fale conosco no Instagram!</p>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <BarChart3 size={18} className="text-accent" />
            </div>
            <span className="font-medium text-lg">Transações</span>
          </div>
          <span className="card-stat-value">{stats.transactions}</span>
        </div>
        
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <DollarSign size={18} className="text-accent" />
            </div>
            <span className="font-medium text-lg">Montante</span>
          </div>
          <span className="card-stat-value">R$ {stats.amount.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
      
      {/* Gráfico de vendas */}
      <div className="mb-10 p-6 bg-card rounded-xl border border-border-light">
        <h2 className="text-xl font-medium mb-4">Total em vendas do período</h2>
        <p className="text-3xl font-bold">R$ {stats.totalSales.toFixed(2).replace('.', ',')}</p>
        
        <div className="mt-10 h-48 w-full flex items-center justify-center border-t border-border-light p-6">
          {stats.transactions > 0 ? (
            <div className="w-full h-full">
              {/* Aqui poderia ser inserido um gráfico real com os dados */}
              <div className="w-full h-full flex items-end justify-between">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="w-12 bg-accent/70 rounded-t-md" style={{ 
                    height: `${Math.max(10, Math.random() * 100)}%`,
                    opacity: index === 6 ? '1' : `${0.4 + (index * 0.1)}`
                  }}></div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-white/50">Sem dados para exibir neste período</p>
          )}
        </div>
      </div>
      
      {/* Cartões de saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-accent/80 to-accent rounded-xl p-6 shadow-glow h-40 relative overflow-hidden">
          <div className="flex justify-between">
            <div>
              <p className="text-white/70 mb-2">Aguardando</p>
              <p className="text-3xl font-bold">R$ {stats.pendingBalance.toFixed(2).replace('.', ',')}</p>
            </div>
            
            <button 
              className="button-outline py-2 px-4 text-sm"
              onClick={() => router.push('/dashboard/finance')}
            >
              Antecipar
            </button>
          </div>
          
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -left-5 -top-5 w-20 h-20 bg-white/5 rounded-full blur-md"></div>
        </div>
        
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 shadow-md h-40 relative overflow-hidden">
          <div className="flex justify-between">
            <div>
              <p className="text-white/70 mb-2">Saldo em conta</p>
              <p className="text-3xl font-bold">R$ {stats.accountBalance.toFixed(2).replace('.', ',')}</p>
            </div>
            
            <button 
              className="button-primary py-2 px-4 text-sm"
              onClick={() => router.push('/dashboard/finance')}
            >
              Saque
            </button>
          </div>

          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/5 rounded-full blur-xl"></div>
          <div className="absolute -left-5 -top-5 w-20 h-20 bg-white/5 rounded-full blur-md"></div>
        </div>
      </div>
    </DashboardLayout>
  );
} 