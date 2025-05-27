'use client';

// Forcar renderizacao dinamica
export const dynamic = 'force-dynamic'
export const revalidate = 0

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { BotCard } from '@/components/bots/bot-card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// Tipo para os bots
interface Bot {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalRevenue: string | number;
  totalSales: string | number;
  _count_plans?: Array<{ count: number }>;
  _count_groups?: Array<{ count: number }>;
  plans?: any[];
  additional_plans?: any[];
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Função para buscar bots do servidor
    const fetchBots = async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Buscando bots do banco de dados...');
        
        // Adicionar parâmetro de cache-busting se forceRefresh for true
        const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          console.log('🔄 Enviando requisição para API...');
          const response = await fetch(`/api/bots${cacheBuster}`, {
            signal: controller.signal,
            cache: forceRefresh ? 'no-store' : 'default',
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            console.log('✅ Bots carregados do banco:', data.bots?.length || 0);
            
            if (data.bots?.length === 0) {
              console.log('⚠️ Nenhum bot encontrado no banco de dados');
              toast.error('Nenhum bot encontrado. Crie um novo bot.');
              setBots([]);
            } else {
              // Formatar os bots do banco para garantir compatibilidade
              const formattedBots = data.bots.map((bot: any) => ({
                ...bot,
                status: bot.status || 'active',
                totalRevenue: bot.totalRevenue || bot.plan_price || '0',
                totalSales: bot.totalSales || '0',
                created_at: bot.created_at || new Date().toISOString(),
                _count_plans: bot._count_plans || [{ count: 1 }],
                _count_groups: bot._count_groups || [{ count: 0 }]
              }));
              
              // Ordenar por data de criação (mais recentes primeiro)
              formattedBots.sort((a: any, b: any) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
              });
              
              console.log('✅ Total de bots carregados:', formattedBots.length);
              setBots(formattedBots);
            }
          } else {
            console.error('❌ API retornou erro:', data.error);
            toast.error(`Erro ao buscar bots: ${data.error || 'Erro desconhecido'}`);
            setError('Erro ao carregar os bots do servidor.');
            setBots([]);
          }
        } catch (e: any) {
          console.error('❌ Erro ao buscar bots do servidor:', e);
          const errorMessage = e.message || 'Erro desconhecido';
          
          if (errorMessage.includes('aborted') || 
              errorMessage.includes('ECONNREFUSED') || 
              errorMessage.includes('Failed to fetch') ||
              errorMessage.includes('network') ||
              errorMessage.includes('connection')) {
            toast.error('Servidor não está respondendo. Tente novamente.');
          } else {
            toast.error(`Erro ao carregar bots: ${errorMessage}`);
          }
          
          setError('Erro de conexão com o servidor. Verifique sua conexão e tente novamente.');
          setBots([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Carregar bots ao montar o componente
    fetchBots();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="heading-1">Seus Bots</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus bots de vendas em um só lugar
          </p>
        </div>
        <Link href="/bots/create" className="button-primary mt-4 md:mt-0">
          <PlusCircle size={20} className="mr-2" />
          Criar novo bot
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Carregando seus bots...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm underline mt-2"
          >
            Tentar novamente
          </button>
          </div>
        ) : bots.length === 0 ? (
        <div className="bg-muted rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Nenhum bot encontrado</h2>
            <p className="text-muted-foreground mb-6">
            Você ainda não criou nenhum bot. Crie seu primeiro bot para começar a vender.
            </p>
          <Link href="/bots/create" className="button-primary">
            <PlusCircle size={20} className="mr-2" />
            Criar meu primeiro bot
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
            ))}
          </div>
        )}
    </DashboardLayout>
  );
} 
