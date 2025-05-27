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
      <div className={`glass rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:scale-105 group ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-white truncate flex-1 mr-2">{bot.name}</h3>
            
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                disabled={isLoading}
              >
                <FiMoreVertical size={16} />
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 top-10 w-48 glass rounded-lg border border-white/20 py-2 z-20">
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <FiEdit size={14} />
                    Editar
                  </button>
                  <button
                    onClick={handleCopyBotLink}
                    className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <FiLink size={14} />
                    Copiar Link
                  </button>
                  <div className="border-t border-white/10 my-1"></div>
                  <button
                    onClick={handleConfirmDelete}
                    className="w-full px-4 py-2 text-left text-red-400 hover:text-red-300 hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <FiTrash2 size={14} />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mb-4 ${status.color}`}>
            {status.label}
          </div>

          {bot.description && (
            <p className="text-white/60 text-sm mb-4 line-clamp-2">
              {bot.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            {bot.username && (
              <div className="flex justify-between">
                <span className="text-white/60">Username:</span>
                <span className="text-white font-medium">@{bot.username}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/60">Criado em:</span>
              <span className="text-white font-medium">{formatDate(bot.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Webhook:</span>
              <span className={`font-medium ${bot.webhook_url || bot.webhook_set_at ? 'text-green-400' : 'text-orange-400'}`}>
                {bot.webhook_url ? 'Configurado' : bot.webhook_set_at ? 'Configurado (Dev)' : 'Não configurado'}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 bg-white/5">
          <div className="flex justify-between gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleEdit}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Carregando...' : 'Editar'}
            </Button>
            
            {bot.username && (
              <Button 
                variant="gradient" 
                size="sm"
                onClick={handleOpenTelegram}
                className="flex-1"
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
            onClick={() => setMenuOpen(false)}
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