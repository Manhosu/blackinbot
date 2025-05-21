'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Check, X } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';

type Plan = Tables<'plans'>;

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('plans')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setPlans(data);
        }
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  // Função para formatar preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Função para mostrar status do plano
  const getPlanStatus = (isActive: boolean | null) => {
    if (isActive === true) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="w-3 h-3 mr-1" />
          Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <X className="w-3 h-3 mr-1" />
        Inativo
      </span>
    );
  };

  // Função para mostrar período de acesso
  const formatPeriod = (period: string, days: number) => {
    switch (period) {
      case 'daily':
        return `Diário (${days} dias)`;
      case 'weekly':
        return `Semanal (${days} dias)`;
      case 'monthly':
        return `Mensal (${days} dias)`;
      case 'yearly':
        return `Anual (${days} dias)`;
      default:
        return `${days} dias`;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Planos</h2>
            <p className="text-muted-foreground">Gerencie os planos de acesso aos grupos VIP.</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        {/* Tabela de Planos */}
        <div className="rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Preço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Período</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Descrição</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">Carregando...</td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">Nenhum plano encontrado. Crie seu primeiro plano!</td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="border-b">
                      <td className="px-4 py-3 text-sm font-medium">{plan.name}</td>
                      <td className="px-4 py-3 text-sm">{formatPrice(plan.price)}</td>
                      <td className="px-4 py-3 text-sm">{formatPeriod(plan.period, plan.days_access)}</td>
                      <td className="px-4 py-3 text-sm">{getPlanStatus(plan.is_active)}</td>
                      <td className="px-4 py-3 text-sm">{plan.description || 'Sem descrição'}</td>
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