'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Sale {
  id: string;
  user_telegram_id: string;
  amount: number;
  plan_name: string;
  bot_name: string;
  status: string;
  created_at: string;
  expires_at: string | null;
}

interface SalesStats {
  transactions: number;
  commission: number;
  totalAmount: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    transactions: 0,
    commission: 0,
    totalAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    async function fetchSales() {
      try {
        setLoading(true);

        // Buscar vendas com informações dos planos e bots
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            id,
            user_telegram_id,
            amount,
            created_at,
            expires_at,
            plans!inner(name),
            bots!inner(name),
            payments!inner(status)
          `)
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;

        // Formatar dados das vendas
        const formattedSales: Sale[] = salesData?.map(sale => ({
          id: sale.id,
          user_telegram_id: sale.user_telegram_id,
          amount: Number(sale.amount),
          plan_name: (sale.plans as any)?.name || 'Plano não encontrado',
          bot_name: (sale.bots as any)?.name || 'Bot não encontrado',
          status: (sale.payments as any)?.status || 'unknown',
          created_at: sale.created_at,
          expires_at: sale.expires_at
        })) || [];

        setSales(formattedSales);

        // Calcular estatísticas
        const totalAmount = formattedSales.reduce((acc, sale) => acc + sale.amount, 0);
        const commission = totalAmount * 0.05; // 5% de comissão

        setStats({
          transactions: formattedSales.length,
          commission,
          totalAmount
        });

      } catch (error) {
        console.error('Erro ao carregar vendas:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>;
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.user_telegram_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.bot_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || sale.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Gerencie e acompanhe suas vendas</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactions}</div>
            <p className="text-xs text-muted-foreground">vendas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">valor bruto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.commission)}</div>
            <p className="text-xs text-muted-foreground">5% sobre vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount - stats.commission)}</div>
            <p className="text-xs text-muted-foreground">após comissões</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por usuário, plano ou bot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">Todos os status</option>
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="failed">Falhou</option>
        </select>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhuma venda encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Usuário</th>
                    <th className="text-left p-2">Plano</th>
                    <th className="text-left p-2">Bot</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Expira em</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{sale.user_telegram_id}</td>
                      <td className="p-2">{sale.plan_name}</td>
                      <td className="p-2">{sale.bot_name}</td>
                      <td className="p-2 font-medium">{formatCurrency(sale.amount)}</td>
                      <td className="p-2">{getStatusBadge(sale.status)}</td>
                      <td className="p-2">{formatDate(sale.created_at)}</td>
                      <td className="p-2">
                        {sale.expires_at ? formatDate(sale.expires_at) : 'Sem expiração'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 