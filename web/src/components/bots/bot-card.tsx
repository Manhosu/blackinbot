import React from 'react';
import Link from 'next/link';
import { Settings, Edit2, Trash2, Users, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tipo para o bot
interface Bot {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalRevenue?: string | number;
  totalSales?: string | number;
  created_at?: string;
  _count_plans?: Array<{ count: number }>;
  _count_groups?: Array<{ count: number }>;
  plans?: any[];
  additional_plans?: any[];
  plan_price?: string | number;
}

// Props do componente
interface BotCardProps {
  bot: Bot;
  onDelete?: (id: string) => void;
}

export function BotCard({ bot, onDelete }: BotCardProps) {
  // Normalizar dados do bot
  const normalizedBot = {
    ...bot,
    id: bot.id || `bot_${Date.now()}`,
    name: bot.name || 'Bot sem nome',
    description: bot.description || '',
    status: bot.status || 'active',
    totalRevenue: bot.totalRevenue || bot.plan_price || '0',
    totalSales: bot.totalSales || '0',
    created_at: bot.created_at || new Date().toISOString()
  };
  
  // Formatar data
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      console.warn('⚠️ Erro ao formatar data:', dateString, e);
      return 'Data inválida';
    }
  };
  
  // Obter contagem de planos
  const getPlansCount = () => {
    try {
      if (normalizedBot._count_plans && normalizedBot._count_plans.length > 0) {
        return normalizedBot._count_plans[0].count;
      }
      
      if (Array.isArray(normalizedBot.plans)) {
        return normalizedBot.plans.length;
      }
      
      if (Array.isArray(normalizedBot.additional_plans)) {
        return 1 + normalizedBot.additional_plans.length; // Plano principal + adicionais
      }
      
      return 1; // Pelo menos o plano principal
    } catch (e) {
      console.warn('⚠️ Erro ao obter contagem de planos:', e);
      return 0;
    }
  };
  
  // Obter contagem de grupos
  const getGroupsCount = () => {
    try {
      if (normalizedBot._count_groups && normalizedBot._count_groups.length > 0) {
        return normalizedBot._count_groups[0].count;
      }
      
      return 0;
    } catch (e) {
      console.warn('⚠️ Erro ao obter contagem de grupos:', e);
      return 0;
    }
  };
  
  // Lidar com exclusão
  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o bot "${normalizedBot.name}"?`)) {
      onDelete?.(normalizedBot.id);
    }
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Cabeçalho do card */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1 truncate">{normalizedBot.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {normalizedBot.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${normalizedBot.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}
            `}>
              {normalizedBot.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <Users size={18} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Grupos</p>
            <p className="font-medium">{getGroupsCount()}</p>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <Package size={18} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Planos</p>
            <p className="font-medium">{getPlansCount()}</p>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <Clock size={18} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Criado</p>
            <p className="text-xs font-medium">{formatDate(normalizedBot.created_at)}</p>
          </div>
        </div>

        {/* Vendas e receita */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Vendas</p>
            <p className="font-medium">{normalizedBot.totalSales || 0}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Receita</p>
            <p className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(Number(normalizedBot.totalRevenue) || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="p-4 bg-muted/50 border-t flex items-center justify-between">
        <Link href={`/bots/${normalizedBot.id}/dashboard`} className="text-sm font-medium text-primary">
          Ver detalhes
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/bots/${normalizedBot.id}/edit`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit2 size={16} />
            </Button>
          </Link>
          <Link href={`/bots/${normalizedBot.id}/settings`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings size={16} />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
} 