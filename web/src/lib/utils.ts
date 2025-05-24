import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para formatar moeda brasileira
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Função para obter iniciais de um nome
export function getInitials(name: string): string {
  if (!name) return '??'
  
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Função para formatar data brasileira
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Função para formatar data e hora brasileira
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Configurações padrão do Split
const DEFAULT_SPLIT_CONFIG = {
  fixed_fee: 1.48, // R$ 1,48
  percentage_fee: 0.05, // 5%
  platform_name: 'PushinPay',
  description: 'Comissão automática descontada na API da PushinPay'
};

// Função auxiliar para calcular taxas de split
export function calculateSplitFees(amount: number, config = DEFAULT_SPLIT_CONFIG) {
  const fixedFee = config.fixed_fee;
  const percentageFee = amount * config.percentage_fee;
  const totalFee = fixedFee + percentageFee;
  const netAmount = amount - totalFee;

  return {
    original_amount: amount,
    fixed_fee: fixedFee,
    percentage_fee: percentageFee,
    total_fee: totalFee,
    net_amount: netAmount,
    fee_breakdown: {
      fixed: `R$ ${fixedFee.toFixed(2)}`,
      percentage: `${(config.percentage_fee * 100).toFixed(1)}% (R$ ${percentageFee.toFixed(2)})`,
      total: `R$ ${totalFee.toFixed(2)}`
    }
  };
}
