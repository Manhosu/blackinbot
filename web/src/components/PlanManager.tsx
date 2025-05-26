'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface Plan {
  id?: string;
  name: string;
  price: number;
  period: string;
  period_days: number;
  description?: string;
  is_active: boolean;
}

interface PlanManagerProps {
  plans: Plan[];
  onPlansChange: (plans: Plan[]) => void;
}

export default function PlanManager({ plans, onPlansChange }: PlanManagerProps) {
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  const periodOptions = [
    { value: 'monthly', label: 'Mensal', days: 30 },
    { value: 'quarterly', label: 'Trimestral', days: 90 },
    { value: 'semiannual', label: 'Semestral', days: 180 },
    { value: 'yearly', label: 'Anual', days: 365 },
    { value: 'lifetime', label: 'Vitalício', days: 999999 },
    { value: 'custom', label: 'Personalizado', days: 0 },
  ];

  const addPlan = () => {
    const newPlan: Plan = {
      name: '',
      price: 4.90,
      period: 'monthly',
      period_days: 30,
      description: '',
      is_active: true,
    };
    
    onPlansChange([...plans, newPlan]);
  };

  const removePlan = (index: number) => {
    const newPlans = plans.filter((_, i) => i !== index);
    onPlansChange(newPlans);
    
    // Limpar erros do índice removido
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updatePlan = (index: number, field: keyof Plan, value: any) => {
    const newPlans = [...plans];
    
    // Para o campo price, permitir qualquer valor durante a digitação
    if (field === 'price') {
      // Se o valor está vazio, manter como 0 para permitir digitação
      if (value === '' || value === null || value === undefined) {
        newPlans[index][field] = 0;
      } else {
        const numericValue = parseFloat(value);
        // Se é um número válido, usar o valor; senão manter 0
        newPlans[index][field] = isNaN(numericValue) ? 0 : numericValue;
      }
    } else     if (field === 'period') {
      (newPlans[index] as any)[field] = value;
      // Atualizar period_days automaticamente baseado no período
      const selectedPeriod = periodOptions.find(p => p.value === value);
      if (selectedPeriod) {
        newPlans[index].period_days = selectedPeriod.days;
      }
    } else {
      (newPlans[index] as any)[field] = value;
    }
    
    onPlansChange(newPlans);
    
    // Validar o plano após a atualização
    validatePlan(index, newPlans[index]);
  };

  const validatePlan = (index: number, plan: Plan) => {
    const newErrors = { ...errors };
    
    if (!plan.name.trim()) {
      newErrors[index] = 'Nome do plano é obrigatório';
    } else if (plan.price === 0) {
      newErrors[index] = 'Digite um valor para o plano';
    } else if (plan.price < 4.90) {
      newErrors[index] = 'Valor mínimo é R$ 4,90';
    } else if (plan.period === 'custom' && plan.period_days < 1) {
      newErrors[index] = 'Período personalizado deve ter pelo menos 1 dia';
    } else {
      delete newErrors[index];
    }
    
    setErrors(newErrors);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  const isValidPlans = () => {
    return plans.length > 0 && 
           plans.every(plan => 
             plan.name.trim() && 
             plan.price >= 4.90 && 
             plan.period_days > 0
           ) && 
           Object.keys(errors).length === 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Planos de Pagamento</h3>
          <p className="text-sm text-gray-600">
            Configure os planos que os usuários poderão comprar para acessar seu bot.
          </p>
        </div>
        <button
          type="button"
          onClick={addPlan}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Plano</span>
        </button>
      </div>

      {plans.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 mb-2">
            <Plus className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">Nenhum plano configurado</p>
          <button
            type="button"
            onClick={addPlan}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Criar primeiro plano
          </button>
        </div>
      )}

      <div className="space-y-4">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 space-y-4 ${
              errors[index] ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          >
            {/* Header do plano */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Plano {index + 1}
                {plan.name && (
                  <span className="text-blue-600 ml-2">- {plan.name}</span>
                )}
              </h4>
              <button
                type="button"
                onClick={() => removePlan(index)}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Remover plano"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Erro */}
            {errors[index] && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors[index]}</span>
              </div>
            )}

            {/* Campos do plano */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome do plano */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => updatePlan(index, 'name', e.target.value)}
                  placeholder="Ex: Plano Premium"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={plan.price === 0 ? '' : plan.price}
                  onChange={(e) => updatePlan(index, 'price', e.target.value)}
                  placeholder="Ex: 9,90"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    plan.price > 0 && plan.price < 4.90 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Mínimo: {formatPrice(4.90)}
                  </p>
                  {plan.price > 0 && plan.price < 4.90 && (
                    <p className="text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Abaixo do mínimo
                    </p>
                  )}
                </div>
              </div>

              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período de Acesso *
                </label>
                <select
                  value={plan.period}
                  onChange={(e) => updatePlan(index, 'period', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dias personalizados */}
              {plan.period === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dias de Acesso *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={plan.period_days}
                    onChange={(e) => updatePlan(index, 'period_days', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Período calculado automaticamente */}
              {plan.period !== 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dias de Acesso
                  </label>
                  <input
                    type="text"
                    value={plan.period_days === 999999 ? 'Vitalício' : `${plan.period_days} dias`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (Opcional)
              </label>
              <textarea
                value={plan.description || ''}
                onChange={(e) => updatePlan(index, 'description', e.target.value)}
                placeholder="Descreva o que está incluído neste plano..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`plan-${index}-active`}
                checked={plan.is_active}
                onChange={(e) => updatePlan(index, 'is_active', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`plan-${index}-active`} className="text-sm text-gray-700">
                Plano ativo (disponível para compra)
              </label>
            </div>

            {/* Preview do valor */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <strong>Preview:</strong> {plan.name || 'Nome do plano'} - {formatPrice(plan.price)}
                {plan.period_days === 999999 ? ' (Vitalício)' : ` (${plan.period_days} dias)`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      {plans.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Resumo dos Planos ({plans.length})
          </h4>
          <div className="space-y-1">
            {plans.map((plan, index) => (
              <div key={index} className="text-sm text-blue-800">
                • {plan.name || `Plano ${index + 1}`}: {formatPrice(plan.price)}
                {plan.period_days === 999999 ? ' (Vitalício)' : ` (${plan.period_days} dias)`}
              </div>
            ))}
          </div>
          
          {!isValidPlans() && (
            <div className="mt-3 text-sm text-red-600">
              ⚠️ Verifique os dados dos planos antes de continuar
            </div>
          )}
        </div>
      )}
    </div>
  );
} 