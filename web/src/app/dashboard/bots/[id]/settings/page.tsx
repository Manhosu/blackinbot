'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PlanManager from '@/components/PlanManager';

// Interface para os planos
interface Plan {
  id?: string;
  name: string;
  price: number;
  period: string;
  period_days: number;
  description?: string;
  is_active: boolean;
}

interface RawPlan {
  id: string;
  name: string;
  price: string | number;
  period?: string;
  period_days?: number;
  days_access?: number;
  description?: string;
  is_active?: boolean;
}

export default function BotSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Estado do formulário de configurações gerais
  const [generalForm, setGeneralForm] = useState({
    name: '',
    description: '',
    welcome_message: '',
    status: 'active'
  });

  // Estado dos planos
  const [plans, setPlans] = useState<Plan[]>([]);

  // Carregar dados do bot
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchBotData = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 Carregando dados do bot para configurações:', params.id);
        
        // Buscar dados do bot
        const { data: botData, error: botError } = await supabase
          .from('bots')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (botError || !botData) {
          console.error('❌ Erro ao buscar bot:', botError);
          toast.error('Bot não encontrado');
          router.push('/dashboard/bots');
          return;
        }

        // Buscar planos do bot
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('bot_id', params.id)
          .order('price', { ascending: true });

        if (plansError) {
          console.warn('⚠️ Erro ao buscar planos:', plansError);
        }

        console.log('✅ Dados carregados:', { bot: botData.name, plans: plansData?.length || 0 });
        
        setBot(botData);
        setGeneralForm({
          name: botData.name || '',
          description: botData.description || '',
          welcome_message: botData.welcome_message || '',
          status: botData.status || 'active'
        });

        // Converter planos para o formato do PlanManager
        const formattedPlans = (plansData || []).map((plan: RawPlan) => ({
          id: plan.id,
          name: plan.name,
          price: parseFloat(String(plan.price)) || 0,
          period: plan.period || 'monthly',
          period_days: plan.period_days || plan.days_access || 30,
          description: plan.description || '',
          is_active: plan.is_active !== false
        }));

        setPlans(formattedPlans);
        
      } catch (error) {
        console.error('❌ Erro ao carregar bot:', error);
        toast.error('Erro ao carregar dados do bot');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchBotData();
    }
  }, [params.id, router, user, authLoading]);

  // Verificar parâmetro de query para aba
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const tabParam = searchParams.get('tab');
    if (tabParam && (tabParam === 'general' || tabParam === 'plans')) {
      setActiveTab(tabParam);
    }
  }, [searchParams, router, user, authLoading]);

  // Salvar configurações gerais
  const handleSaveGeneral = async () => {
    if (!generalForm.name.trim()) {
      toast.error('Nome do bot é obrigatório');
      return;
    }

    try {
      setIsSaving(true);
      
      console.log('💾 Salvando configurações gerais:', generalForm);
      
      // Usar a API PATCH corrigida
      const response = await fetch(`/api/bots/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: generalForm.name.trim(),
          description: generalForm.description.trim(),
          welcome_message: generalForm.welcome_message.trim(),
          status: generalForm.status
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar configurações');
      }

      console.log('✅ Configurações salvas com sucesso');
      
      // Atualizar estado local
      setBot((prev: any) => ({ ...prev, ...result.data }));
      
      toast.success('Configurações salvas com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar planos
  const handleSavePlans = async () => {
    if (plans.length === 0) {
      toast.error('Adicione pelo menos um plano');
      return;
    }

    // Validar planos
    const invalidPlans = plans.filter(plan => 
      !plan.name.trim() || 
      plan.price < 4.90 || 
      plan.period_days < 1
    );

    if (invalidPlans.length > 0) {
      toast.error('Verifique os dados dos planos. Valor mínimo é R$ 4,90 e período mínimo é 1 dia.');
      return;
    }

    try {
      setIsSaving(true);
      
      console.log('💾 Salvando planos:', plans.length);
      
      // Usar a API de planos para atualizar
      const response = await fetch(`/api/bots/${params.id}/plans`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plans })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar planos');
      }

      console.log('✅ Planos salvos com sucesso:', result.plans?.length || 0);
      toast.success('Planos salvos com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar planos:', error);
      toast.error('Erro ao salvar planos: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handlers para mudanças no formulário
  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGeneralForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlansChange = (newPlans: Plan[]) => {
    setPlans(newPlans);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-full w-full flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!bot) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Bot não encontrado</h2>
          <p className="text-white/60 mb-6">O bot que você está procurando não existe ou você não tem permissão para acessá-lo.</p>
          <Link href="/dashboard/bots">
            <Button>Voltar para Meus Bots</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href={`/dashboard/bots/${params.id}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para o bot
        </Link>
        <h1 className="heading-1">Configurações do Bot</h1>
        <p className="text-muted-foreground">{bot.name}</p>
      </div>

      <div className="max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
            <TabsTrigger value="plans">Planos de Pagamento</TabsTrigger>
          </TabsList>

          {/* Configurações Gerais */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Configure as informações principais do seu bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Bot *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={generalForm.name}
                    onChange={handleGeneralChange}
                    placeholder="Ex: Grupo VIP Trading"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={generalForm.description}
                    onChange={handleGeneralChange}
                    placeholder="Descreva seu bot/grupo..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcome_message"
                    name="welcome_message"
                    value={generalForm.welcome_message}
                    onChange={handleGeneralChange}
                    placeholder="Mensagem que será enviada quando um novo membro entrar no grupo..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={generalForm.status}
                    onChange={handleGeneralChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Planos de Pagamento */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planos de Pagamento</CardTitle>
                <CardDescription>
                  Configure os planos que os usuários poderão comprar para acessar seu bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanManager 
                  plans={plans} 
                  onPlansChange={handlePlansChange}
                />
                
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={handleSavePlans}
                    disabled={isSaving || plans.length === 0}
                    className="min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Planos
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 