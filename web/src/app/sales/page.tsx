'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { DollarSign, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function SalesPage() {
  // Dados fictícios para demonstração
  const stats = {
    transacoes: 0,
    comissao: 0
  };

  // Estado para verificar se há vendas
  const [hasSales, setHasSales] = React.useState(false);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-1">Minhas vendas</h1>
        <Button variant="outline">
          Filtrar Vendas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard 
          title="Transações" 
          value={stats.transacoes}
        />
        <StatCard 
          title="Comissão" 
          value={formatCurrency(stats.comissao)}
          icon={<DollarSign size={24} />}
        />
      </div>

      {!hasSales ? (
        <div className="bg-secondary rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <p className="text-lg mb-2">Nenhuma venda encontrada</p>
        </div>
      ) : (
        <div className="bg-secondary rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Valor</th>
                <th className="p-4 text-left">Data</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Aqui seriam listadas as vendas */}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
} 