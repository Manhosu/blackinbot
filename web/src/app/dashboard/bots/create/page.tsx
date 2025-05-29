"use client";

export const dynamic = 'force-dynamic';

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Plus, X, ArrowRight, Check, AlertCircle, Info, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBot, validateBotToken, createBotWithWebhook } from '@/lib/bot-functions';
import PlanManager from '@/components/PlanManager';

const PERIODS = [
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "1 mês", value: "30" },
  { label: "3 meses", value: "90" },
  { label: "6 meses", value: "180" },
  { label: "1 ano", value: "365" },
  { label: "Vitalício", value: "9999" },
];

interface PricePlan {
  id: string;
  name: string;
  price: string;
  period: string;
}

// Interface para os planos - compatível com PlanManager
interface Plan {
  id?: string;
  name: string;
  price: number;
  period: string;
  period_days: number;
  description?: string;
  is_active: boolean;
}

// Definição dos passos de criação - REORGANIZADOS
const steps = [
  { title: 'Dados básicos', description: 'Nome e token do bot' },
  { title: 'Planos', description: 'Configure os planos de pagamento' },
  { title: 'Criação', description: 'Finalize a criação do bot' }
];

export default function CreateBotPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshAuth } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  // Funções para navegação dos steps
  const goToNext = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  const goToPrevious = () => setActiveStep(prev => Math.max(prev - 1, 0));

  // Função para mostrar toast customizado
  const showToast = (title: string, description: string, type: 'success' | 'error' = 'success') => {
    console.log(`${type.toUpperCase()}: ${title} - ${description}`);
  };

  // Estado do formulário - SIMPLIFICADO para focar em dados básicos
  const [form, setForm] = useState({
    name: '',
    token: '',
    description: ''
  });
  
  // Planos - USANDO INTERFACE COMPATÍVEL COM PLANMANAGER
  const [plans, setPlans] = useState<Plan[]>([
    { 
      name: "Plano VIP", 
      price: 9.90, 
      period: "monthly", 
      period_days: 30, 
      description: "Acesso completo ao grupo",
      is_active: true 
    }
  ]);
  
  const [submitting, setSubmitting] = useState(false);
  const [botResult, setBotResult] = useState<any>(null);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [botInfo, setBotInfo] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Estados de validação
  const [validations, setValidations] = useState({
    name: { isValid: true, message: '' },
    token: { isValid: true, message: '' },
    plans: { isValid: true, message: '' },
  });
  
  // Resultado da validação do token
  const [validationResult, setValidationResult] = useState<any>(null);

  // Verificar autenticação em useEffect para evitar o erro de roteamento no servidor
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirecionar para login se não houver usuário autenticado
      router.push("/login");
    } else if (user?.id && !user.id.startsWith('local_user_')) {
      // Para usuários reais do Supabase, verificar se a sessão é válida
      const checkSupabaseSession = async () => {
        try {
          const { data: { user: supaUser }, error } = await supabase.auth.getUser();
          
          if (error || !supaUser) {
            console.log('🔓 Usuário local sem sessão Supabase válida - forçando logout imediato');
            // Limpar dados e redirecionar para login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('blackinpay_user');
            }
            router.push('/login');
          }
        } catch (error) {
          console.error('Erro ao verificar sessão Supabase:', error);
          // Em caso de erro, também forçar logout
          if (typeof window !== 'undefined') {
            localStorage.removeItem('blackinpay_user');
          }
          router.push('/login');
        }
      };
      
      // Verificar após um pequeno delay
      setTimeout(checkSupabaseSession, 500);
    }
  }, [user, isAuthenticated, router]);

  // 🆕 Função para forçar novo login quando há problemas de autenticação
  const forceLogin = () => {
    console.log('🔄 Forçando novo login...');
    // Limpar dados locais
    if (typeof window !== 'undefined') {
      localStorage.removeItem('blackinpay_user');
    }
    // Redirecionar para login
    router.push('/login');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      
      // Se for o token, validar automaticamente
      if (name === 'token' && value && value.includes(':')) {
        handleValidateToken(value);
      } else if (name === 'token') {
        setTokenStatus('idle');
        setValidationResult(null);
    }
    
    // Limpar erro de validação quando o usuário começa a digitar
    if (!validations[name as keyof typeof validations]?.isValid) {
      setValidations({
        ...validations,
        [name]: { isValid: true, message: '' }
      });
    }
  };

  // Handler para mudanças nos planos - CONECTANDO COM PLANMANAGER
  const handlePlansChange = (newPlans: Plan[]) => {
    setPlans(newPlans);
    // Limpar erro de validação de planos se houver
    if (!validations.plans.isValid) {
      setValidations({
        ...validations,
        plans: { isValid: true, message: '' }
      });
    }
  };

  // Função para validar a etapa atual - ATUALIZADA PARA NOVOS PASSOS
  const validateStep = () => {
    let isValid = true;
    const newValidations = { ...validations };
    
    if (activeStep === 0) {
      // Validação do Passo 1: Dados básicos
      if (!form.name.trim()) {
        newValidations.name = {
          isValid: false,
          message: 'Nome do bot é obrigatório'
        };
        isValid = false;
      }
      if (!form.token.trim()) {
        newValidations.token = {
          isValid: false,
          message: 'Token do bot é obrigatório'
        };
        isValid = false;
      }
      
      // Validação básica do formato do token do Telegram
      if (form.token && !form.token.includes(':')) {
        newValidations.token = {
          isValid: false,
          message: "Token do bot parece inválido. Verifique se está no formato correto."
        };
        isValid = false;
      }
      
      // Verificar se o token foi validado
      if (tokenStatus !== 'valid') {
        newValidations.token = {
          isValid: false,
          message: "Por favor, aguarde a validação do token ou verifique se está correto"
        };
        isValid = false;
      }
    }
    
    if (activeStep === 1) {
      // Validação do Passo 2: Planos
      if (plans.length === 0) {
        newValidations.plans = {
          isValid: false,
          message: "É necessário ter pelo menos um plano configurado"
        };
        isValid = false;
      }
      
      // Validar cada plano
      const invalidPlans = plans.filter(plan => 
        !plan.name.trim() || 
        plan.price < 4.90 || 
        plan.period_days < 1
      );

      if (invalidPlans.length > 0) {
        newValidations.plans = {
          isValid: false,
          message: "Verifique os dados dos planos. Valor mínimo é R$ 4,90 e período mínimo é 1 dia."
        };
        isValid = false;
      }
    }
    
    setValidations(newValidations);
    return isValid;
  };

  // Função para ir para a próxima etapa - SIMPLIFICADA
  const goToNextStep = () => {
    setSubmitting(true);
    
    setTimeout(() => {
      if (!validateStep()) {
        setSubmitting(false);
        return;
      }
      
      // Rolar para o topo e avançar para a próxima etapa
      window.scrollTo(0, 0);
      goToNext();
      setSubmitting(false);
    }, 500);
  };

  // Função para voltar para a etapa anterior
  const goToPreviousStep = () => {
    window.scrollTo(0, 0);
    goToPrevious();
  };

  // Validação de token - MANTIDA
  const handleValidateToken = async (token: string) => {
    if (!token || !token.includes(':')) {
      setTokenStatus('invalid');
      return;
    }

    setTokenStatus('checking');
    
    try {
      const response = await fetch('/api/bots/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (data.valid && data.botInfo) {
        setTokenStatus('valid');
        setValidationResult(data.botInfo);
        setBotInfo(data.botInfo);
      } else {
        setTokenStatus('invalid');
        setValidationResult(null);
        setBotInfo(null);
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setTokenStatus('invalid');
      setValidationResult(null);
      setBotInfo(null);
    }
  };

  // Renderização do conteúdo conforme a etapa - REORGANIZADA
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // PASSO 1: Dados básicos (igual ao original)
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">Etapa 1: Dados Básicos</h2>
            
            <div>
              <label className="block text-white/70 mb-1">Nome do Bot <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-auth w-full"
                placeholder="Ex: Meu Bot de Vendas"
                required
              />
              {!validations.name.isValid && (
                <p className="text-xs text-red-400 mt-1">{validations.name.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-white/70 mb-1">Token do Bot <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  name="token"
                  value={form.token}
                  onChange={handleChange}
                  className={`input-auth w-full pr-10 ${
                    tokenStatus === 'valid' ? 'border-green-500/50' : 
                    tokenStatus === 'invalid' ? 'border-red-500/50' : 
                    tokenStatus === 'checking' ? 'border-yellow-500/50' : ''
                  }`}
                  placeholder="Ex: 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {tokenStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  )}
                  {tokenStatus === 'valid' && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                  {tokenStatus === 'invalid' && (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              
              {tokenStatus === 'valid' && validationResult && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-green-400">
                    ✅ Bot validado: @{validationResult.username} ({validationResult.first_name})
                  </p>
                </div>
              )}
              
              {tokenStatus === 'invalid' && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400">
                    ❌ Token inválido. Verifique se está correto.
                  </p>
                </div>
              )}
              
              {tokenStatus === 'checking' && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    🔍 Validando token...
                  </p>
                </div>
              )}
              
              {!validations.token.isValid && (
                <p className="text-xs text-red-400 mt-1">{validations.token.message}</p>
              )}
              <p className="text-xs text-white/60 mt-1">
                Obtenha o token do seu bot conversando com @BotFather no Telegram
              </p>
            </div>

            <div>
              <label className="block text-white/70 mb-1">Descrição (opcional)</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input-auth w-full min-h-[80px]"
                placeholder="Descreva brevemente seu bot..."
              />
            </div>
            
            <Button
              variant="gradient"
              onClick={goToNextStep}
              disabled={submitting}
              className="mt-4"
            >
              {submitting ? 'Validando...' : 'Validar e Continuar'}
            </Button>
          </div>
        );
        
      case 1:
        // PASSO 2: NOVO - Configuração de planos
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">Etapa 2: Configurar Planos</h2>
            
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                💰 Configure os planos que os usuários poderão comprar para acessar seu bot/grupo.
                </p>
            </div>
            
            <PlanManager 
              plans={plans} 
              onPlansChange={handlePlansChange}
            />
            
            {!validations.plans.isValid && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">{validations.plans.message}</p>
              </div>
            )}
            
            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={goToPreviousStep}>
                Voltar
              </Button>
              <Button variant="gradient" onClick={goToNextStep} disabled={submitting}>
                {submitting ? 'Validando...' : 'Continuar para Criação'}
              </Button>
            </div>
          </div>
        );
        
      case 2:
        // PASSO 3: Criação final do bot
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">Etapa 3: Criar Bot</h2>
            
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm">
                🚀 Tudo pronto! Agora vamos criar seu bot com as configurações escolhidas.
            </p>
            </div>
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X size={12} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-300 text-sm">{error}</p>
                    {(error.includes('autenticação') || error.includes('login') || error.includes('sessão')) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={forceLogin}
                        className="mt-2 text-xs"
                      >
                        Fazer Login Novamente
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-4 mt-4">
              <Button variant="outline" onClick={goToPreviousStep}>
                Voltar
              </Button>
              <Button
                variant="gradient"
                onClick={handleSubmit}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando Bot...
                  </>
                ) : (
                  'Criar Bot'
                )}
              </Button>
            </div>
          </div>
        );
        
      case 3:
        // PASSO FINAL: Resumo com as informações de validação (antigo passo 2)
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">✅ Bot Criado com Sucesso!</h2>
            
            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-green-300 font-medium mb-2">
                    Seu bot foi criado e configurado com sucesso!
                  </h3>
                  <p className="text-green-300/80 text-sm">
                    Confira os detalhes abaixo e clique em "Ir para Dashboard" para gerenciar seu bot.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Resumo dos dados do bot */}
            <div className="glass rounded-xl border border-white/20 p-6">
              <h4 className="text-lg font-medium mb-4">Resumo do Bot</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Nome</span>
                  <span className="text-white font-medium">{form.name}</span>
            </div>
                <div className="border-t border-white/10"></div>
            
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Username</span>
                  <span className="text-white font-medium">@{validationResult?.username}</span>
                </div>
                <div className="border-t border-white/10"></div>
                
                <div className="flex justify-between items-center">
                  <span className="text-white/60">ID do Bot</span>
                  <span className="text-white font-medium">{validationResult?.id}</span>
                </div>
                <div className="border-t border-white/10"></div>

                <div className="flex justify-between items-center">
                  <span className="text-white/60">Planos Configurados</span>
                  <span className="text-white font-medium">{plans.length} plano{plans.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Resumo dos planos */}
            <div className="glass rounded-xl border border-white/20 p-6">
              <h4 className="text-lg font-medium mb-4">Planos Configurados</h4>
              <div className="space-y-3">
                {plans.map((plan, index) => (
                  <div key={plan.id || index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-white/60">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {plan.price.toFixed(2).replace('.', ',')}</p>
                      <p className="text-sm text-white/60">{plan.period_days} dias</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/bots')}
              >
                Ver Todos os Bots
              </Button>
              <Button
                variant="gradient"
                onClick={() => router.push(`/dashboard/bots/${botResult?.id || 'novo'}`)}
              >
                Ir para Dashboard do Bot
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Enviar formulário para criar bot - MELHORADA
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validação final
    if (!validateStep()) {
      return;
    }

    try {
      setIsCreating(true);
      setError('');

      console.log('🔐 Usuário autenticado via contexto:', user?.id);

      // Verificar se realmente há um usuário autenticado
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados do bot com planos
      const botData = {
        name: form.name,
        token: form.token,
        description: form.description || '',
        telegram_id: validationResult?.id,
        username: validationResult?.username,
        owner_id: user.id,
        is_public: false,
        status: 'active' as const,
        plans: plans // INCLUIR PLANOS
      };

      console.log('📤 Enviando dados do bot:', {
        ...botData,
        token: '***OCULTO***',
        plans: botData.plans.map(p => ({
          name: p.name,
          price: p.price,
          period_days: p.period_days
        }))
      });

      // Enviar para API
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(botData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Bot criado com sucesso:', result);
        setBotResult(result.data || result.bot);
        showToast('Bot criado com sucesso!', '', 'success');

        // Ir para o passo final (resumo)
        setActiveStep(3);
      } else {
        // Verificar se é erro de autenticação específico
        if (response.status === 401 || response.status === 403) {
          console.log('❌ Erro de autenticação detectado (status:', response.status, ')');
          
          // Verificar se a sessão realmente expirou
          try {
            const sessionResponse = await fetch('/api/auth/session');
            const sessionResult = await sessionResponse.json();
            
            if (!sessionResult.success || !sessionResult.user) {
              setError('Sessão expirada. Redirecionando para login...');
              setTimeout(() => forceLogin(), 2000);
              return;
            }
          } catch (sessionError) {
            console.error('Erro ao verificar sessão:', sessionError);
          }
        }
        
        throw new Error(result.error || 'Erro ao criar bot');
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar bot:', error);
      
      // Só forçar logout se realmente houver problema de autenticação confirmado
      if (error.message?.includes('Usuário não autenticado')) {
        setError('Sessão expirada. Redirecionando para login...');
        setTimeout(() => forceLogin(), 2000);
      } else {
        setError(error.message || 'Ocorreu um erro ao criar o bot.');
      }
      
      showToast('Erro ao criar bot', error.message || 'Ocorreu um erro ao criar o bot.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Não renderizar nada enquanto verifica autenticação
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard/bots" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft size={16} className="mr-2" />
              Voltar para bots
            </Link>
            <h1 className="heading-2 mb-2">Criar novo bot</h1>
            <p className="text-white/60">Configure seu bot do Telegram para vender acesso aos grupos VIP.</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold mb-2">Passo {activeStep + 1} de {steps.length}</h2>
            <p className="text-white/60">{steps[activeStep]?.description}</p>
          </div>
        </div>
        
        <div className="glass rounded-xl border border-white/20 p-6">
          {renderStepContent()}
        </div>
      </div>
    </DashboardLayout>
  );
} 