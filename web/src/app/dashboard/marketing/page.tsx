'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Users, AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw, Settings, Save, MessageSquare, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    blue: 'bg-blue-500/20 text-blue-500',
    gray: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light last:border-b-0">
      <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
            member.isAdmin ? 'ring-2 ring-blue-500/50' : ''
          }`}>
            {member.avatar_url ? (
              <img 
                src={member.avatar_url} 
                alt={member.users?.name || member.name} 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // Fallback para quando a imagem não carrega
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) {
                    nextElement.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full rounded-full flex items-center justify-center ${
                member.isAdmin ? 'bg-blue-500/20' : 'bg-primary/20'
              } ${member.avatar_url ? 'hidden' : ''}`}
            >
              <span className={`text-sm font-medium ${member.isAdmin ? 'text-blue-400' : ''}`}>
                {member.isAdmin ? '👑' : (member.users?.name || member.name ? (member.users?.name || member.name).charAt(0).toUpperCase() : 'U')}
          </span>
            </div>
        </div>
        <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{member.users?.name || member.name || 'Nome não disponível'}</p>
              {member.isAdmin && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  member.member_type === 'group_creator' 
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {member.member_type === 'group_creator' ? 'DONO' : 'ADMIN'}
                </span>
              )}
            </div>
            <p className="text-sm text-white/60">@{member.users?.username || member.username || 'sem_username'}</p>
            <p className="text-xs text-white/40">ID: {member.telegram_user_id || member.telegram_id}</p>
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
        
        {member.daysUntilExpiry === 1 && !member.isAdmin && (
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Receberá mensagem de remarketing" />
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
          <p className="text-white/60 text-sm">ID do Grupo: {group.telegram_id}</p>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-sm transition-colors"
        >
          {expanded ? 'Ocultar' : 'Ver'} Membros ({group.stats.total})
        </button>
      </div>

      {/* Estatísticas do grupo */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold">{group.stats.total}</div>
          <div className="text-xs text-white/60">Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-500">{group.stats.admins || 0}</div>
          <div className="text-xs text-white/60">Admins</div>
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
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {group.members.map((member: any) => (
                <MemberItem key={`${member.id}-${member.telegram_id}`} member={member} />
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
    expired: 0,
    admins: 0
  });
  const [summary, setSummary] = useState({
    total_groups: 0,
    total_members: 0,
    active_members: 0,
    members_to_remove: 0
  });
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [remarketingMessage, setRemarketingMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('groups');
  const [syncingAdmins, setSyncingAdmins] = useState(false);
  const [updatingProfiles, setUpdatingProfiles] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMarketingData();
      fetchBots();
    }
  }, [user]);

  const fetchBots = async () => {
    try {
      const response = await fetch(`/api/bots?user_id=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
        if (data.bots && data.bots.length > 0) {
          setSelectedBot(data.bots[0].id);
          setRemarketingMessage(data.bots[0].remarketing_message || '');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar bots:', error);
    }
  };

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/remarketing/groups?user_id=${user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setStats(data.total_stats || { total: 0, active: 0, expiring_soon: 0, expired: 0, admins: 0 });
        setSummary(data.summary || { total_groups: 0, total_members: 0, active_members: 0, members_to_remove: 0 });
      } else {
        console.error('Erro ao buscar dados de remarketing');
        toast.error('Erro ao carregar dados de remarketing');
      }
    } catch (error) {
      console.error('Erro ao buscar dados de marketing:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleBotChange = (botId: string) => {
    setSelectedBot(botId);
    const bot = bots.find(b => b.id === botId);
    setRemarketingMessage(bot?.remarketing_message || '');
  };

  const handleSaveRemarketingMessage = async () => {
    if (!selectedBot) {
      toast.error('Selecione um bot');
      return;
    }

    try {
      setSavingMessage(true);
      
      const response = await fetch(`/api/bots/${selectedBot}/remarketing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remarketing_message: remarketingMessage.trim()
        })
      });

      if (response.ok) {
        toast.success('Mensagem de remarketing salva com sucesso!');
        
        // Atualizar bot local
        setBots(prev => prev.map(bot => 
          bot.id === selectedBot 
            ? { ...bot, remarketing_message: remarketingMessage.trim() }
            : bot
        ));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar mensagem');
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      toast.error('Erro ao salvar mensagem');
    } finally {
      setSavingMessage(false);
    }
  };

  const handleSyncAdmins = async () => {
    try {
      setSyncingAdmins(true);
      
      const response = await fetch('/api/groups/sync-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`${result.total_admins_added} administradores sincronizados!`);
        
        // Recarregar dados
        await fetchMarketingData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao sincronizar administradores');
      }
    } catch (error) {
      console.error('Erro ao sincronizar administradores:', error);
      toast.error('Erro ao sincronizar administradores');
    } finally {
      setSyncingAdmins(false);
    }
  };

  const handleUpdateProfiles = async () => {
    try {
      setUpdatingProfiles(true);
      toast.info('Atualizando perfis dos donos dos grupos...');
      
      // A API de remarketing já sincroniza automaticamente os donos
      await fetchMarketingData();
      
      toast.success('Perfis dos donos atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfis:', error);
      toast.error('Erro ao atualizar perfis');
    } finally {
      setUpdatingProfiles(false);
    }
  };

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="heading-2">Remarketing</h1>
        <p className="text-white/60">Gerencie todos os membros dos seus grupos e configure mensagens automáticas</p>
        </div>
        
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups">Grupos e Membros</TabsTrigger>
          <TabsTrigger value="settings">Configurações de Remarketing</TabsTrigger>
        </TabsList>

        {/* Aba de Grupos e Membros */}
        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-white/60">
              {summary.total_groups > 0 ? (
                <>Mostrando dados reais de {summary.total_groups} grupos</>
              ) : (
                <>Nenhum grupo encontrado. Configure seus bots primeiro.</>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdateProfiles}
                variant="outline"
                size="sm"
                disabled={updatingProfiles || loading}
          >
                <Users size={16} className={updatingProfiles ? 'animate-spin mr-2' : 'mr-2'} />
                {updatingProfiles ? 'Atualizando...' : 'Atualizar Perfis'}
              </Button>
          
              <Button 
                onClick={handleSyncAdmins}
                variant="outline"
                size="sm"
                disabled={syncingAdmins || loading}
          >
                <Crown size={16} className={syncingAdmins ? 'animate-spin mr-2' : 'mr-2'} />
                {syncingAdmins ? 'Sincronizando...' : 'Sincronizar Admins'}
              </Button>
          
              <Button 
                onClick={fetchMarketingData}
                variant="outline"
                size="sm"
                disabled={loading}
            >
                <RefreshCw size={16} className={loading ? 'animate-spin mr-2' : 'mr-2'} />
                Atualizar
              </Button>
        </div>
      </div>
      
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard
          title="Total de Membros"
          value={stats.total.toString()}
          icon={<Users size={20} />}
          color="blue"
        />
            <StatCard
              title="Administradores"
              value={(stats.admins || 0).toString()}
              icon={<Crown size={20} />}
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

          {/* Lista de grupos */}
          <div className="space-y-6">
            {groups.length > 0 ? (
              groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-white/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum grupo encontrado</h3>
                  <p className="text-white/60 mb-4">
                    Para ver os membros dos seus grupos aqui, certifique-se de que:
                  </p>
                  <div className="text-left max-w-md mx-auto space-y-2 text-sm text-white/70">
                    <p>• Seus bots estão configurados e ativos</p>
                    <p>• Os bots foram adicionados aos grupos do Telegram</p>
                    <p>• Há vendas/membros nos seus grupos</p>
              </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Aba de Configurações */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={20} />
                Mensagem de Remarketing Automática
              </CardTitle>
              <CardDescription>
                Configure a mensagem que será enviada automaticamente 1 dia antes do plano do membro vencer.
                Use {'{nome}'} para incluir o nome do membro na mensagem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bot-select">Selecionar Bot</Label>
                <select
                  id="bot-select"
                  value={selectedBot}
                  onChange={(e) => handleBotChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione um bot...</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}
                    </option>
          ))}
                </select>
              </div>

              {selectedBot && (
                <>
                  <div>
                    <Label htmlFor="remarketing-message">Mensagem de Remarketing</Label>
                    <Textarea
                      id="remarketing-message"
                      value={remarketingMessage}
                      onChange={(e) => setRemarketingMessage(e.target.value)}
                      placeholder="Olá {nome}! 👋 Seu acesso ao nosso grupo VIP expira amanhã. Renove já para não perder nenhuma oportunidade! 🚀"
                      rows={6}
                      className="mt-2"
                    />
                    <p className="text-xs text-white/60 mt-2">
                      Esta mensagem será enviada automaticamente pelo sistema via Telegram para membros que 
                      tenham o plano expirando em 1 dia.
                    </p>
          </div>
          
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveRemarketingMessage}
                      disabled={savingMessage || !remarketingMessage.trim()}
                    >
                      {savingMessage ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Mensagem
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {bots.length === 0 && (
                <div className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-white/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum bot encontrado</h3>
                  <p className="text-white/60">
                    Crie e configure seus bots primeiro para definir mensagens de remarketing.
          </p>
        </div>
      )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
} 