'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { BarChart3, DollarSign, Users, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  // Dados fictícios para demonstração
  const stats = {
    transacoes: 0,
    montante: 0,
    totalVendas: 0
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-1">Visão geral</h1>
        <div>
          <select className="select w-44">
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* Banner internacional */}
      <div className="mb-6 bg-primary p-6 rounded-lg flex items-center gap-4">
        <div className="text-3xl">🌎</div>
        <p className="text-white text-lg">Quer vender internacionalmente? Fale conosco no Instagram!</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard 
          title="Transações" 
          value={stats.transacoes}
          icon={<BarChart3 size={24} />}
        />
        <StatCard 
          title="Montante" 
          value={formatCurrency(stats.montante)}
          icon={<DollarSign size={24} />}
        />
      </div>

      {/* Total de vendas */}
      <div className="bg-secondary p-6 rounded-lg mb-6">
        <h2 className="text-lg text-secondary-foreground mb-4">Total em vendas do período</h2>
        <p className="text-3xl font-bold">{formatCurrency(stats.totalVendas)}</p>
        {/* Gráfico iria aqui */}
        <div className="h-48 w-full flex items-center justify-center border-t border-border mt-6 pt-6">
          <p className="text-muted-foreground">Sem dados para exibir</p>
        </div>
      </div>
    </DashboardLayout>
  );
} 