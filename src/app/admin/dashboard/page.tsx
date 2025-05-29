'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Users, CreditCard, Bot } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

// Componente de Card estatístico
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  loading?: boolean;
}

const StatCard = ({ title, value, icon, description, loading }: StatCardProps) => (
  <div className="rounded-lg border bg-card p-5 shadow-sm">
    <div className="flex justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold">
          {loading ? 'Carregando...' : value}
        </h3>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        {icon}
      </div>
    </div>
  </div>
);

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  activeBots: number;
  activeSubscriptions: number;
}

interface RecentActivity {
  id: string;
  description: string;
  amount: number;
  time: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRevenue: 0,
    activeBots: 0,
    activeSubscriptions: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Buscar total de usuários
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id', { count: 'exact' });

        // Buscar bots ativos
        const { data: botsData, error: botsError } = await supabase
          .from('bots')
          .select('id', { count: 'exact' })
          .eq('status', 'active');

        // Buscar receita total dos pagamentos aprovados
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid');

        // Buscar assinaturas ativas (membros de grupos ativos)
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('id', { count: 'exact' })
          .eq('status', 'active');

        // Buscar atividades recentes (últimos pagamentos)
        const { data: recentPayments, error: recentError } = await supabase
          .from('payments')
          .select('id, amount, user_name, created_at, status')
          .order('created_at', { ascending: false })
          .limit(5);

        if (usersError) throw usersError;
        if (botsError) throw botsError;
        if (paymentsError) throw paymentsError;
        if (membersError) throw membersError;
        if (recentError) throw recentError;

        // Calcular receita total
        const totalRevenue = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

        setStats({
          totalUsers: usersData?.length || 0,
          totalRevenue,
          activeBots: botsData?.length || 0,
          activeSubscriptions: membersData?.length || 0
        });

        // Formatar atividades recentes
        const activities: RecentActivity[] = recentPayments?.map(payment => ({
          id: payment.id,
          description: payment.status === 'paid' 
            ? `${payment.user_name || 'Usuário'} realizou um pagamento`
            : `Pagamento pendente de ${payment.user_name || 'Usuário'}`,
          amount: Number(payment.amount),
          time: new Date(payment.created_at).toLocaleString('pt-BR')
        })) || [];

        setRecentActivities(activities);

      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const dashboardStats = [
    { 
      title: 'Usuários Totais', 
      value: stats.totalUsers.toString(), 
      icon: <Users className="h-5 w-5" />, 
      description: 'Usuários cadastrados na plataforma' 
    },
    { 
      title: 'Receita Total', 
      value: formatCurrency(stats.totalRevenue), 
      icon: <CreditCard className="h-5 w-5" />, 
      description: 'Receita de pagamentos aprovados' 
    },
    { 
      title: 'Bots Ativos', 
      value: stats.activeBots.toString(), 
      icon: <Bot className="h-5 w-5" />,
      description: 'Bots funcionando atualmente'
    },
    { 
      title: 'Assinaturas Ativas', 
      value: stats.activeSubscriptions.toString(), 
      icon: <BarChart className="h-5 w-5" />, 
      description: 'Membros ativos nos grupos' 
    },
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
          {dashboardStats.map((stat, index) => (
            <StatCard key={index} {...stat} loading={loading} />
          ))}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-medium">Atividade Recente</h3>
            <p className="text-sm text-muted-foreground">Últimas transações e eventos no sistema.</p>
          </div>
          <div className="border-t">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando atividades...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma atividade recente encontrada.
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center p-4 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                  <div className="font-medium">{formatCurrency(activity.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 