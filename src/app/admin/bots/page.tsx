'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Check, X } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';

type Bot = Tables<'bots'>;

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBots() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('bots')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setBots(data);
        }
      } catch (error) {
        console.error('Erro ao carregar bots:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBots();
  }, []);

  // Função para formatar data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para mostrar o status do bot
  const getBotStatus = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            Ativo
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <X className="w-3 h-3 mr-1" />
            Inativo
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pendente
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bots</h2>
            <p className="text-muted-foreground">Gerencie seus bots do Telegram.</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Bot
          </Button>
        </div>

        {/* Tabela de Bots */}
        <div className="rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Criado em</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Carregando...</td>
                  </tr>
                ) : bots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Nenhum bot encontrado. Crie seu primeiro bot!</td>
                  </tr>
                ) : (
                  bots.map((bot) => (
                    <tr key={bot.id} className="border-b">
                      <td className="px-4 py-3 text-sm font-medium">{bot.name}</td>
                      <td className="px-4 py-3 text-sm">{getBotStatus(bot.status)}</td>
                      <td className="px-4 py-3 text-sm">{bot.description || 'Sem descrição'}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(bot.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 