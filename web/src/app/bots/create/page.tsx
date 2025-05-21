'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Plus, Trash2 } from 'lucide-react';

// Tipos para os planos
interface Plan {
  id: string;
  title: string;
  price: number;
  period: string;
}

export default function CreateBotPage() {
  // Estado para controlar a etapa atual da criação
  const [step, setStep] = useState(1);
  
  // Estados para o formulário
  const [groupName, setGroupName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [plans, setPlans] = useState<Plan[]>([
    { id: '1', title: '', price: 0, period: '7 dias' }
  ]);

  // Adicionar novo plano
  const addPlan = () => {
    const newId = String(plans.length + 1);
    setPlans([...plans, { id: newId, title: '', price: 0, period: '7 dias' }]);
  };

  // Remover plano
  const removePlan = (id: string) => {
    if (plans.length > 1) {
      setPlans(plans.filter(plan => plan.id !== id));
    }
  };

  // Atualizar plano
  const updatePlan = (id: string, field: keyof Plan, value: string | number) => {
    setPlans(plans.map(plan => 
      plan.id === id ? { ...plan, [field]: value } : plan
    ));
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="heading-1">Criação de grupo</h1>
      </div>

      {/* Indicador de progresso */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-accent' : 'bg-secondary'}`}>
            <span className="text-white">1</span>
          </div>
          
          <div className={`flex-1 h-1 ${step > 1 ? 'bg-accent' : 'bg-secondary'}`}></div>
          
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-accent' : 'bg-secondary'}`}>
            <span className="text-white">2</span>
          </div>
          
          <div className={`flex-1 h-1 ${step > 2 ? 'bg-accent' : 'bg-secondary'}`}></div>
          
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-accent' : 'bg-secondary'}`}>
            <span className="text-white">3</span>
          </div>
          
          <div className={`flex-1 h-1 ${step > 3 ? 'bg-accent' : 'bg-secondary'}`}></div>
          
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-accent' : 'bg-secondary'}`}>
            <span className="text-white">4</span>
          </div>
        </div>
      </div>

      {/* Etapa 1: Informações básicas */}
      {step === 1 && (
        <div className="bg-secondary rounded-lg p-8 max-w-3xl mx-auto">
          <div className="grid grid-cols-[150px_1fr] gap-8 items-center">
            <div className="bg-muted rounded-lg p-4 flex items-center justify-center">
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <Plus size={24} className="text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Nome do Grupo</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Digite o nome do grupo"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Token do Bot</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Digite o Token do Bot"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <Button onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </div>
      )}

      {/* Etapa 2: Configuração de preços */}
      {step === 2 && (
        <div className="bg-secondary rounded-lg p-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-6">Precificação</h2>
          <p className="text-muted-foreground mb-6">Defina os preços do seu grupo?</p>
          
          {plans.map((plan, index) => (
            <div key={plan.id} className="mb-4 grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-sm mb-1">Preço</label>
                <div className="flex items-center">
                  <span className="mr-2">R$</span>
                  <input 
                    type="number" 
                    className="input" 
                    value={plan.price}
                    onChange={(e) => updatePlan(plan.id, 'price', parseFloat(e.target.value))}
                  />
                </div>
                {index === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Este é o valor que será pago pelo seu cliente. O valor mínimo possível é de R$4,90. Você poderá alterar este valor mais tarde!
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm mb-1">Título</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Título"
                  value={plan.title}
                  onChange={(e) => updatePlan(plan.id, 'title', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Período</label>
                <select 
                  className="select"
                  value={plan.period}
                  onChange={(e) => updatePlan(plan.id, 'period', e.target.value)}
                >
                  <option value="7 dias">7 dias</option>
                  <option value="15 dias">15 dias</option>
                  <option value="30 dias">30 dias</option>
                  <option value="3 meses">3 meses</option>
                  <option value="6 meses">6 meses</option>
                  <option value="1 ano">1 ano</option>
                  <option value="Vitalício">Vitalício</option>
                </select>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive" 
                onClick={() => removePlan(plan.id)}
                disabled={plans.length === 1}
              >
                <Trash2 size={18} />
              </Button>
            </div>
          ))}
          
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={addPlan}>
              Adicionar novo preço <Plus size={16} className="ml-2" />
            </Button>
          </div>
          
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)}>Continuar</Button>
          </div>
        </div>
      )}

      {/* Para simplificar, não implementamos as etapas 3 e 4 neste exemplo */}
      {step > 2 && (
        <div className="bg-secondary rounded-lg p-8 max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-6">Etapa {step} em desenvolvimento</h2>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>Continuar</Button>
            ) : (
              <Button onClick={() => alert('Grupo criado com sucesso!')}>Criar Grupo</Button>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 