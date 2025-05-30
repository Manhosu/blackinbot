'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PlanManager from '@/components/PlanManager';

// Cliente Supabase para componentes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Interface para os planos (atualizada para compatibilidade com PlanManager)
interface Plan {
  id?: string;
  name: string;
  price: number;
  period: string;
  period_days: number;
  description?: string;
  is_active: boolean;
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
  
  // Obter ID do usuário autenticado
  useEffect(() => {
    async function fetchUserData() {
      try {
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

  const handlePlansChange = (plans: Plan[]) => {
    setBotData(prev => ({
      ...prev,
      plans
    }));
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

    // Validar planos
    const invalidPlans = botData.plans.filter(plan => 
      !plan.name.trim() || 
      plan.price < 4.90 || 
      plan.period_days < 1
    );

    if (invalidPlans.length > 0) {
      toast.error('Verifique os dados dos planos. Valor mínimo é R$ 4,90 e período mínimo é 1 dia.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Enviar dados para a API com novo formato de planos
      const requestData = {
        name: botData.name,
        description: botData.description || '',
        token: botData.token,
        welcome_message: botData.welcome_message || '',
        owner_id: userId,
        plans: botData.plans // Enviar todos os planos
      };
      
      console.log('🔄 Enviando dados para API:', {
        ...requestData,
        token: requestData.token.substring(0, 10) + '...',
        plans: requestData.plans.map(p => ({
          name: p.name,
          price: p.price,
          period_days: p.period_days
        }))
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

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Básicas */}
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

          {/* Gerenciador de Planos */}
          <div className="bg-card rounded-lg border p-6">
            <PlanManager 
              plans={botData.plans} 
              onPlansChange={handlePlansChange}
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/bots">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading || botData.plans.length === 0}
              className="min-w-[120px]"
            >
              {loading ? 'Criando...' : 'Criar Bot'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 
