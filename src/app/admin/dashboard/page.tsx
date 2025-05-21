'use client';

import React from 'react';
import { BarChart, Users, CreditCard, Bot } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';

// Componente de Card estatístico
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}

const StatCard = ({ title, value, icon, description }: StatCardProps) => (
  <div className="rounded-lg border bg-card p-5 shadow-sm">
    <div className="flex justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        {icon}
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  // Dados simulados - seriam substituídos por dados reais do Supabase
  const stats = [
    { title: 'Usuários Totais', value: '247', icon: <Users className="h-5 w-5" />, description: '+12% em relação ao mês passado' },
    { title: 'Vendas do Mês', value: 'R$ 9.432', icon: <CreditCard className="h-5 w-5" />, description: '+23% em relação ao mês passado' },
    { title: 'Bots Ativos', value: '5', icon: <Bot className="h-5 w-5" /> },
    { title: 'Assinaturas Ativas', value: '189', icon: <BarChart className="h-5 w-5" />, description: '76% de retenção' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do seu sistema de bots para Telegram.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-medium">Atividade Recente</h3>
            <p className="text-sm text-muted-foreground">Últimas transações e eventos no sistema.</p>
          </div>
          <div className="border-t">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="flex items-center p-4 border-b last:border-0">
                <div className="flex-1">
                  <p className="font-medium">Usuário comprou plano Premium</p>
                  <p className="text-sm text-muted-foreground">Há {i + 1} {i === 0 ? 'hora' : 'horas'}</p>
                </div>
                <div className="font-medium">R$ 49,90</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 