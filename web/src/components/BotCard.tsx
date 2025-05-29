'use client';

import React, { useState } from 'react';
import { FiMoreVertical, FiEdit, FiTrash2, FiExternalLink, FiSettings, FiLink } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { Bot } from '@/lib/bot-functions';
import { Button } from '@/components/ui/button';

interface BotCardProps {
  bot: Bot;
  onUpdate: () => void;
}

export default function BotCard({ bot, onUpdate }: BotCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  // Função para mostrar toast customizado (melhorada)
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Criar elemento de toast
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 transform translate-x-full opacity-0 ${
      type === 'success' ? 'bg-green-500/90 border-green-400 text-white' :
      type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
      'bg-orange-500/90 border-orange-400 text-white'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <h4 class="font-medium">${title}</h4>
          <p class="text-sm opacity-90">${description}</p>
        </div>
        <button onclick="document.getElementById('${toastId}').remove()" class="text-white/70 hover:text-white">
          ✕
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
      if (document.getElementById(toastId)) {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
    
    // Também logar no console
    console.log(`${type.toUpperCase()}: ${title} - ${description}`);
  };

  // Formatar data de criação para exibição
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data desconhecida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obter status para exibição
  const getBotStatus = () => {
    switch (bot.status) {
      case 'active':
        return { label: 'Ativo', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'inactive':
        return { label: 'Inativo', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'deleted':
        return { label: 'Excluído', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    }
  };

  // Editar bot
  const handleEdit = () => {
    setMenuOpen(false);
    // Usar a página de detalhes com parâmetro de edição
    router.push(`/dashboard/bots/${bot.id}?edit=true`);
  };

  // 🚀 OTIMIZAÇÃO: Função para navegar ao bot
  const handleBotClick = (e: React.MouseEvent) => {
    // Não navegar se clicou em menu ou botões
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('.dropdown-menu')) {
      return;
    }
    
    // 🚀 FEEDBACK VISUAL IMEDIATO
    setIsLoading(true);
    
    // 🚀 PRÉ-CACHE: Salvar dados do bot antes de navegar
    try {
      const cacheKey = `bot_${bot.id}`;
      const cachedData = { 
        ...bot, 
        _cached_at: Date.now(),
        _prefetch: true 
      };
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      console.log('⚡ Bot pré-cached para navegação rápida:', bot.id);
    } catch (error) {
      console.warn('Aviso: Erro ao fazer pré-cache:', error);
    }
    
    // 🚀 NAVEGAÇÃO OTIMIZADA
    // Usar setTimeout para garantir que o loading apareça
    setTimeout(() => {
      router.push(`/dashboard/bots/${bot.id}`);
    }, 50);
  };

  // Configurações do bot
  const handleConfigurations = () => {
    setMenuOpen(false);
    router.push(`/dashboard/bots/${bot.id}?tab=config`);
  };

  // Ir para o Telegram
  const handleOpenTelegram = () => {
    if (bot.username) {
      window.open(`https://t.me/${bot.username}`, '_blank');
      showToast(
        'Abrindo Telegram',
        `Redirecionando para @${bot.username}`,
        'success'
      );
    } else {
      showToast(
        'Erro',
        'Este bot não possui um username configurado.',
        'error'
      );
    }
  };

  // Função para copiar o link do bot para o clipboard
  const handleCopyBotLink = () => {
    setMenuOpen(false);
    if (bot.username) {
      navigator.clipboard.writeText(`https://t.me/${bot.username}`).then(() => {
        showToast(
          'Link copiado!',
          `O link do bot @${bot.username} foi copiado para a área de transferência.`,
          'success'
        );
      }).catch(() => {
        showToast(
          'Erro ao copiar',
          'Não foi possível copiar o link. Tente novamente.',
          'error'
        );
      });
    } else {
      showToast(
        'Erro ao copiar link',
        'Este bot não possui um username definido.',
        'error'
      );
    }
  };

  // Função para excluir bot
  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setMenuOpen(false);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(
          'Bot excluído',
          `O bot "${bot.name}" foi excluído com sucesso.`,
          'success'
        );
        
        // Estratégia de atualização múltipla para garantir que a lista seja atualizada
        // Primeira atualização imediata
        onUpdate();
        
        // Segunda atualização após 500ms para garantir que o banco processou
        setTimeout(() => {
          onUpdate();
        }, 500);
        
        // Terceira atualização após 1.5s como backup final
        setTimeout(() => {
          onUpdate();
        }, 1500);
        
      } else {
        const errorMessage = result.error || `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Erro ao excluir bot:', error);
      
      showToast(
        'Erro ao excluir',
        error.message || 'Ocorreu um erro ao excluir o bot.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmar exclusão
  const handleConfirmDelete = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  // Status do bot para exibição
  const status = getBotStatus();

  return (
    <>
      <div 
        className={`relative glass rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:scale-105 group cursor-pointer ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={handleBotClick}
      >
        {/* 🚀 Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
              <span className="text-white font-medium">Abrindo bot...</span>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-white truncate flex-1 mr-2 group-hover:text-accent transition-colors duration-200">{bot.name}</h3>
            
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 hover:scale-110"
                disabled={isLoading}
              >
                <FiMoreVertical size={16} />
              </button>
              
              {menuOpen && (
                <div className="dropdown-menu absolute right-0 top-10 w-48 glass rounded-lg border border-white/20 py-2 z-20 animate-slideDown">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-all duration-200"
                  >
                    <FiEdit size={14} />
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyBotLink();
                    }}
                    className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-all duration-200"
                  >
                    <FiLink size={14} />
                    Copiar Link
                  </button>
                  <div className="border-t border-white/10 my-1"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-red-400 hover:text-red-300 hover:bg-white/10 flex items-center gap-3 transition-all duration-200"
                  >
                    <FiTrash2 size={14} />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mb-4 transition-all duration-200 ${status.color}`}>
            {status.label}
          </div>

          {bot.description && (
            <p className="text-white/60 text-sm mb-4 line-clamp-2 group-hover:text-white/80 transition-colors duration-200">
              {bot.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            {bot.username && (
              <div className="flex justify-between">
                <span className="text-white/60">Username:</span>
                <span className="text-white font-medium group-hover:text-accent transition-colors duration-200">@{bot.username}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/60">Criado em:</span>
              <span className="text-white font-medium">{formatDate(bot.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Webhook:</span>
              <span className={`font-medium transition-colors duration-200 ${bot.webhook_url || bot.webhook_set_at ? 'text-green-400' : 'text-orange-400'}`}>
                {bot.webhook_url ? 'Configurado' : bot.webhook_set_at ? 'Configurado (Dev)' : 'Não configurado'}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 bg-white/5 group-hover:bg-white/10 transition-all duration-200">
          <div className="flex justify-between gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="flex-1 transition-all duration-200 hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? 'Carregando...' : 'Editar'}
            </Button>
            
            {bot.username && (
              <Button 
                variant="gradient" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTelegram();
                }}
                className="flex-1 transition-all duration-200 hover:scale-105"
                disabled={isLoading}
              >
                Abrir no Telegram
              </Button>
            )}
          </div>
        </div>
        
        {/* Overlay para fechar menu quando clicar fora */}
        {menuOpen && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }}
          />
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass rounded-xl border border-white/20 p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-white/70 mb-6">
              Tem certeza de que deseja excluir o bot <strong>"{bot.name}"</strong>? 
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="flex-1 bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 