'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { DollarSign, ArrowDown, ArrowUp, Users, ShoppingCart, Clock, Search, Filter, Download, Trash2, ChevronDown, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';

interface Sale {
  id: string;
  created_at: string;
  amount: number;
  user_name: string;
  plan_name: string;
  bot_name: string;
  status: string;
}

export default function SalesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // Padrão: últimos 30 dias
  
  // Estado para estatísticas e lista de vendas
  const [stats, setStats] = useState({
    transactions: 0,
    commission: 0,
  });
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!isLoading) {
      fetchSalesData();
    }
  }, [isLoading, period]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Calcular data de início do período selecionado
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - parseInt(period));
      
      try {
        // Buscar transações do banco de dados
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select(`
            id, 
            created_at, 
            amount, 
            status, 
            user_name,
            plan_name,
            bots(id, name)
          `)
          .gte('created_at', startDate.toISOString())
          .eq('status', 'completed');
        
        if (error) {
          throw error;
        }
        
        // Transformar dados para o formato necessário
        const allSales: Sale[] = (transactions || []).map(tx => ({
          id: tx.id,
          created_at: tx.created_at,
          amount: parseFloat(tx.amount) || 0,
          user_name: tx.user_name || 'Usuário',
          plan_name: tx.plan_name || 'Plano padrão',
          bot_name: tx.bots?.name || 'Bot',
          status: tx.status
        }));
        
        // Ordenar vendas por data, mais recentes primeiro
        allSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
        // Calcular estatísticas
        const totalTransactions = allSales.length;
        const totalCommission = allSales.reduce((sum, sale) => {
          // Cálculo de comissão (90% para o proprietário do bot)
          return sum + (sale.amount * 0.9);
        }, 0);
      
        // Atualizar estados
        setSales(allSales);
        setStats({
          transactions: totalTransactions,
          commission: totalCommission,
        });
        
        console.log('📊 Vendas calculadas do banco de dados:', allSales.length);
      } catch (dbError) {
        console.error('❌ Erro ao buscar dados do banco:', dbError);
        
        // Em caso de erro, inicializar com arrays vazios
        setSales([]);
        setStats({
          transactions: 0,
          commission: 0,
        });
        
        toast.error('Erro ao buscar vendas do banco de dados');
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast.error('Não foi possível carregar as vendas');
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

  // Não redirecionar para login
  // if (!isAuthenticated) {
  //   router.push('/login');
  //   return null;
  // }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="heading-2">Minhas vendas</h1>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              className="select pr-10"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 3 meses</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white/60" />
          </div>
        </div>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            <span className="font-medium text-lg">Comissão</span>
          </div>
          <span className="card-stat-value">R$ {stats.commission.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
      
      {/* Lista de vendas */}
      {sales.length > 0 ? (
        <div className="bg-card rounded-xl border border-border-light overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/30">
                  <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Data</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Bot</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Usuário</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Plano</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-white/70">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-primary/10 transition-colors">
                    <td className="py-3 px-4 text-sm">
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm">{sale.bot_name}</td>
                    <td className="py-3 px-4 text-sm">{sale.user_name}</td>
                    <td className="py-3 px-4 text-sm">{sale.plan_name}</td>
                    <td className="py-3 px-4 text-sm font-medium text-right">
                      R$ {sale.amount.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-12 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-white/60 font-medium">Nenhuma venda encontrada</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 