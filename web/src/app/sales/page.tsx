'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { DollarSign, Search, Filter, Calendar, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Sale {
  id: string;
  customer: {
    name: string;
    email: string;
  };
  amount: number;
  commission: number;
  status: 'pending' | 'completed' | 'refunded';
  created_at: string;
  product: {
    name: string;
    type: string;
  };
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    transactions: 0,
    commission: 0,
    totalAmount: 0
  });
  const [filter, setFilter] = useState({
    dateRange: '7',
    status: 'all',
    search: ''
  });

  // Simula carregamento dos dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Aqui você faria as chamadas reais à API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dados simulados
        const mockSales: Sale[] = [
          {
            id: '1',
            customer: {
              name: 'João Silva',
              email: 'joao@email.com'
            },
            amount: 297.00,
            commission: 29.70,
            status: 'completed',
            created_at: '2024-03-20T10:00:00Z',
            product: {
              name: 'Grupo VIP Trading',
              type: 'subscription'
            }
          },
          {
            id: '2',
            customer: {
              name: 'Maria Santos',
              email: 'maria@email.com'
            },
            amount: 497.00,
            commission: 49.70,
            status: 'pending',
            created_at: '2024-03-19T15:00:00Z',
            product: {
              name: 'Sinais Premium',
              type: 'subscription'
            }
          }
        ];
        
        setSales(mockSales);
        setStats({
          transactions: mockSales.length,
          commission: mockSales.reduce((acc, sale) => acc + sale.commission, 0),
          totalAmount: mockSales.reduce((acc, sale) => acc + sale.amount, 0)
        });
        
      } catch (error) {
        toast.error('Erro ao carregar vendas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportSales = () => {
    try {
      // Aqui você implementaria a exportação real
      toast.success('Relatório de vendas exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar vendas');
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

  const getStatusColor = (status: Sale['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Sale['status']) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'refunded':
        return 'Reembolsado';
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-1">Minhas vendas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportSales}>
            <Download size={16} className="mr-2" />
            Exportar
          </Button>
          <Button variant="outline">
            <Filter size={16} className="mr-2" />
            Filtrar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard 
          title="Transações" 
          value={stats.transactions}
          icon={<DollarSign size={24} />}
        />
        <StatCard 
          title="Comissão" 
          value={formatCurrency(stats.commission)}
          icon={<DollarSign size={24} />}
        />
        <StatCard 
          title="Total em Vendas" 
          value={formatCurrency(stats.totalAmount)}
          icon={<DollarSign size={24} />}
        />
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Buscar por cliente, produto..."
                className="pl-10 pr-4 py-2 w-full rounded-lg border bg-background"
                value={filter.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <select
                className="px-4 py-2 rounded-lg border bg-background"
                value={filter.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="7">Últimos 7 dias</option>
                <option value="15">Últimos 15 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
              
              <select
                className="px-4 py-2 rounded-lg border bg-background"
                value={filter.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="completed">Concluídos</option>
                <option value="pending">Pendentes</option>
                <option value="refunded">Reembolsados</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Carregando vendas...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma venda encontrada</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Cliente</th>
                  <th className="text-left p-4 font-medium">Produto</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-left p-4 font-medium">Valor</th>
                  <th className="text-left p-4 font-medium">Comissão</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className="border-b">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{sale.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{sale.customer.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{sale.product.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{sale.product.type}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{formatDate(sale.created_at)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{formatCurrency(sale.amount)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{formatCurrency(sale.commission)}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(sale.status)}`}>
                        {getStatusText(sale.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 