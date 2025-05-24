'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Users, AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Componente para estatísticas
const StatCard = ({ title, value, icon, color = 'blue' }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-500',
    green: 'bg-green-500/20 text-green-500',
    orange: 'bg-orange-500/20 text-orange-500',
    red: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="bg-card border border-border-light rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <span className="text-white/60 text-sm">{title}</span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <span className="text-3xl font-bold">{value}</span>
    </div>
  );
};

// Componente para membro individual
const MemberItem = ({ member }: { member: any }) => {
  const statusColors = {
    green: 'bg-green-500/20 text-green-500',
    orange: 'bg-orange-500/20 text-orange-500',
    red: 'bg-red-500/20 text-red-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium">
            {member.users?.name ? member.users.name.charAt(0).toUpperCase() : 'U'}
          </span>
        </div>
        <div>
          <p className="font-medium">{member.users?.name || 'Nome não disponível'}</p>
          <p className="text-sm text-white/60">@{member.users?.username || 'sem_username'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[member.statusColor as keyof typeof statusColors]}`}>
            {member.statusLabel}
          </span>
          {member.daysUntilExpiry !== undefined && (
            <p className="text-xs text-white/60 mt-1">
              {member.daysUntilExpiry > 0 
                ? `Expira em ${member.daysUntilExpiry} dias`
                : member.daysUntilExpiry === 0 
                ? 'Expira hoje'
                : `Expirado há ${Math.abs(member.daysUntilExpiry)} dias`
              }
            </p>
          )}
        </div>
        
        {member.shouldBeRemoved && (
          <div className="w-2 h-2 bg-red-500 rounded-full" title="Será removido automaticamente" />
        )}
      </div>
    </div>
  );
};

// Componente para grupo
const GroupCard = ({ group }: { group: any }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border-light rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{group.name}</h3>
          <p className="text-white/60 text-sm">Bot: {group.bots?.name || 'Bot não encontrado'}</p>
          <p className="text-white/60 text-sm">ID: {group.telegram_id}</p>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-sm transition-colors"
        >
          {expanded ? 'Ocultar' : 'Ver'} Membros
        </button>
      </div>

      {/* Estatísticas do grupo */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold">{group.stats.total}</div>
          <div className="text-xs text-white/60">Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-500">{group.stats.active}</div>
          <div className="text-xs text-white/60">Ativos</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-500">{group.stats.expiring_soon}</div>
          <div className="text-xs text-white/60">Expirando</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-500">{group.stats.expired}</div>
          <div className="text-xs text-white/60">Expirados</div>
        </div>
      </div>

      {/* Lista de membros (expandida) */}
      {expanded && (
        <div className="border-t border-border-light pt-4">
          {group.members && group.members.length > 0 ? (
            <div className="space-y-1">
              {group.members.map((member: any) => (
                <MemberItem key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-center py-4">Nenhum membro neste grupo</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function MarketingPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiring_soon: 0,
    expired: 0
  });
  const [summary, setSummary] = useState({
    total_groups: 0,
    total_members: 0,
    active_members: 0,
    members_to_remove: 0
  });
  const [autoRemoving, setAutoRemoving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMarketingData();
    }
  }, [user]);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/remarketing/groups?user_id=${user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setStats(data.total_stats || { total: 0, active: 0, expiring_soon: 0, expired: 0 });
        setSummary(data.summary || { total_groups: 0, total_members: 0, active_members: 0, members_to_remove: 0 });
      } else {
        // Em caso de erro, mostrar dados simulados para demo
        console.log('Erro ao buscar dados, usando dados simulados');
        setGroups([]);
        setStats({ total: 0, active: 0, expiring_soon: 0, expired: 0 });
        setSummary({ total_groups: 0, total_members: 0, active_members: 0, members_to_remove: 0 });
      }
    } catch (error) {
      console.error('Erro ao buscar dados de marketing:', error);
      // Dados simulados em caso de erro
      setGroups([]);
      setStats({ total: 0, active: 0, expiring_soon: 0, expired: 0 });
      setSummary({ total_groups: 0, total_members: 0, active_members: 0, members_to_remove: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRemoveMembers = async () => {
    if (!confirm('Tem certeza que deseja remover automaticamente todos os membros expirados há mais de 2 dias?')) {
      return;
    }

    setAutoRemoving(true);
    try {
      const response = await fetch('/api/remarketing/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          auto_remove: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Remoção automática concluída');
        
        // Recarregar dados
        fetchMarketingData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro na remoção automática');
      }
    } catch (error) {
      console.error('Erro na remoção automática:', error);
      toast.error('Erro na remoção automática');
    } finally {
      setAutoRemoving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
        <h1 className="heading-2">Remarketing</h1>
          <p className="text-white/60">Gerencie todos os membros dos seus grupos</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchMarketingData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-white transition-colors"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          
          {summary.members_to_remove > 0 && (
            <button 
              onClick={handleAutoRemoveMembers}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              disabled={autoRemoving}
            >
              <Trash2 size={16} />
              {autoRemoving ? 'Removendo...' : `Remover ${summary.members_to_remove} Expirados`}
            </button>
          )}
        </div>
      </div>
      
      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total de Membros"
          value={stats.total.toString()}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Membros Ativos"
          value={stats.active.toString()}
          icon={<CheckCircle size={20} />}
          color="green"
        />
        <StatCard
          title="Expirando em Breve"
          value={stats.expiring_soon.toString()}
          icon={<Clock size={20} />}
          color="orange"
        />
        <StatCard
          title="Expirados"
          value={stats.expired.toString()}
          icon={<XCircle size={20} />}
          color="red"
        />
      </div>

      {/* Resumo */}
      <div className="bg-card border border-border-light rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-white/60">Total de Grupos:</span>
            <span className="ml-2 font-medium">{summary.total_groups}</span>
          </div>
          <div>
            <span className="text-white/60">Total de Membros:</span>
            <span className="ml-2 font-medium">{summary.total_members}</span>
        </div>
          <div>
            <span className="text-white/60">Membros Ativos:</span>
            <span className="ml-2 font-medium text-green-500">{summary.active_members}</span>
          </div>
          <div>
            <span className="text-white/60">Para Remover:</span>
            <span className="ml-2 font-medium text-red-500">{summary.members_to_remove}</span>
          </div>
        </div>
            </div>
            
      {/* Lista de grupos */}
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
              </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-card bg-opacity-50 rounded-full p-8 mb-6">
            <Users size={48} className="text-white/40" />
          </div>
          
          <h2 className="text-3xl font-bold mb-3">Nenhum grupo encontrado</h2>
          <p className="text-white/70 mb-6 text-center">
            Crie alguns bots primeiro para ver os grupos e membros aqui.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
} 