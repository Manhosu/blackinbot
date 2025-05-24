'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Tipos para os planos
interface Plan {
  id: string;
  title: string;
  price: number;
  period: string;
}

export default function CreateBotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [botData, setBotData] = useState({
    name: '',
    description: '',
    token: '',
    welcome_message: '',
    plans: [] as Plan[]
  });
  const [newPlan, setNewPlan] = useState({
    title: '',
    price: '',
    period: '30'
  });
  
  // Obter ID do usuário autenticado
  useEffect(() => {
    async function fetchUserData() {
      try {
        const supabase = createClientComponentClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('❌ Erro ao obter usuário:', error);
          return;
        }
        
        if (user) {
          console.log('✅ Usuário autenticado no cliente:', user.id);
          setUserId(user.id);
        } else {
          console.warn('⚠️ Nenhum usuário autenticado encontrado');
          toast.warning('Você não parece estar autenticado. Certifique-se de fazer login antes de criar um bot.');
        }
      } catch (e) {
        console.error('❌ Erro ao verificar autenticação:', e);
      }
    }
    
    fetchUserData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBotData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPlan = () => {
    if (!newPlan.title || !newPlan.price) {
      toast.error('Preencha todos os campos do plano');
      return;
    }

    const price = parseFloat(newPlan.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Preço inválido');
      return;
    }

    const plan: Plan = {
      id: Date.now().toString(),
      title: newPlan.title,
      price: price,
      period: newPlan.period
    };

    setBotData(prev => ({
      ...prev,
      plans: [...prev.plans, plan]
    }));

    setNewPlan({
      title: '',
      price: '',
      period: '30'
    });

    toast.success('Plano adicionado com sucesso!');
  };

  const handleRemovePlan = (planId: string) => {
    setBotData(prev => ({
      ...prev,
      plans: prev.plans.filter(plan => plan.id !== planId)
    }));
    toast.success('Plano removido com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!botData.name || !botData.token) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (botData.plans.length === 0) {
      toast.error('Adicione pelo menos um plano');
      return;
    }
    
    try {
      setLoading(true);
      
      // Preparar os dados do plano principal
      const mainPlan = botData.plans[0];
      
      // Enviar apenas dados essenciais para a API
      const requestData = {
        name: botData.name,
        description: botData.description || '',
        token: botData.token,
        owner_id: userId, // Pode ser null em desenvolvimento
        // Incluir informações de plano como metadados
        plan_info: {
          name: mainPlan.title,
          price: mainPlan.price,
          days: mainPlan.period
        },
        // Incluir planos adicionais se houver
        additional_plans: botData.plans.length > 1 ? 
          botData.plans.slice(1).map(plan => ({
            name: plan.title,
            price: plan.price,
            days: plan.period
          })) : []
      };
      
      console.log('🔄 Enviando dados para API:', {
        ...requestData,
        token: requestData.token.substring(0, 10) + '...'
      });
      
      // Fazer requisição para a API
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
      
      // Verificar resposta
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro de API: ${response.status}`, errorText);
        
        if (response.status === 401) {
          toast.error('Você precisa estar autenticado para criar um bot');
          setTimeout(() => router.push('/login?returnTo=/bots/create'), 2000);
          return;
        }
        
        throw new Error(`Erro na resposta da API: ${response.status}`);
      }
      
      // Processar resposta de sucesso
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Bot criado com sucesso:', result.bot?.id);
        toast.success('Bot criado com sucesso!');
        
        // Redirecionar para lista de bots
        setTimeout(() => router.push('/bots'), 800);
      } else {
        console.error('❌ Erro na resposta:', result);
        toast.error(`Erro ao criar bot: ${result.error || 'Falha na operação'}`);
      }
    } catch (error) {
      console.error('❌ Erro ao criar bot:', error);
      toast.error('Erro ao criar bot. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (period: string) => {
    const days = parseInt(period);
    if (days === 7) return '7 dias';
    if (days === 15) return '15 dias';
    if (days === 30) return '1 mês';
    if (days === 90) return '3 meses';
    if (days === 180) return '6 meses';
    if (days === 365) return '1 ano';
    return `${days} dias`;
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/bots" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para bots
        </Link>
        <h1 className="heading-1">Criar novo bot</h1>
        <p className="text-muted-foreground">Configure seu bot do Telegram para vender acesso aos grupos</p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Informações Básicas</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome do Bot <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={botData.name}
                  onChange={handleInputChange}
                  className="input-auth w-full"
                  placeholder="Ex: Grupo VIP Trading"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={botData.description}
                  onChange={handleInputChange}
                  className="input-auth w-full min-h-[100px]"
                  placeholder="Descreva seu bot/grupo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Token do Bot <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="token"
                  value={botData.token}
                  onChange={handleInputChange}
                  className="input-auth w-full"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Obtenha o token do seu bot através do @BotFather no Telegram
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Mensagem de Boas-vindas
                </label>
                <textarea
                  name="welcome_message"
                  value={botData.welcome_message}
                  onChange={handleInputChange}
                  className="input-auth w-full min-h-[100px]"
                  placeholder="Mensagem que será enviada quando um novo membro entrar no grupo..."
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Planos</h2>
              <p className="text-sm text-muted-foreground">
                {botData.plans.length} {botData.plans.length === 1 ? 'plano' : 'planos'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome do Plano
                  </label>
                  <input
                    type="text"
                    value={newPlan.title}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, title: e.target.value }))}
                    className="input-auth w-full"
                    placeholder="Ex: Mensal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, price: e.target.value }))}
                    className="input-auth w-full"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Período
                  </label>
                  <select
                    value={newPlan.period}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, period: e.target.value }))}
                    className="input-auth w-full"
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">1 mês</option>
                    <option value="90">3 meses</option>
                    <option value="180">6 meses</option>
                    <option value="365">1 ano</option>
                  </select>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddPlan}
                variant="outline"
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Adicionar Plano
              </Button>

              {botData.plans.length > 0 && (
                <div className="space-y-2 mt-4">
                  {botData.plans.map(plan => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPeriod(plan.period)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(plan.price)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlan(plan.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link href="/bots">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Bot'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 