'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PersonalizeBot from './personalize';

interface AdvancedUploadDemoProps {
  bot: any;
}

export default function AdvancedUploadDemo({ bot }: AdvancedUploadDemoProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async (data: { welcome_message: string; welcome_media_url: string; welcome_media_type: string }) => {
    setIsUpdating(true);
    
    try {
      console.log('🚀 Salvando personalização:', data);
      
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      console.log('✅ Personalização salva com sucesso:', result.data);
      toast.success('🎉 Personalização salva com sucesso!');
      
      // Opcional: recarregar página para ver as mudanças
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Erro ao salvar personalização:', error);
      throw error; // Re-throw para o componente PersonalizeBot tratar
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações */}
      <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white text-lg">🚀</span>
            </div>
            Sistema de Upload Avançado - Sem Limitações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-green-400 font-medium">✅ Vídeos até 50MB</div>
              <div className="text-gray-300">Upload direto para Supabase Storage</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-blue-400 font-medium">⚡ Bypass Vercel</div>
              <div className="text-gray-300">Contorna limitação de 4MB completamente</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-purple-400 font-medium">🎯 Drag & Drop</div>
              <div className="text-gray-300">Interface moderna com progress bar</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Componente de personalização */}
      <PersonalizeBot 
        bot={bot} 
        onSave={handleSave}
      />

      {/* Status de teste */}
      <Card className="bg-gray-900/50 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white text-lg">Status de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Bot:</span>
              <span className="text-white ml-2">{bot?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Username:</span>
              <span className="text-white ml-2">@{bot?.username || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Mídia atual:</span>
              <span className="text-white ml-2">
                {bot?.welcome_media_url ? 'Configurada' : 'Nenhuma'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Tipo:</span>
              <span className="text-white ml-2">
                {bot?.welcome_media_type || 'N/A'}
              </span>
            </div>
          </div>
          
          {isUpdating && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
              <span>Salvando alterações...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções de teste */}
      <Card className="bg-yellow-900/20 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-yellow-300 text-lg">Como Testar</CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-200/80 space-y-2 text-sm">
          <p>1. 📝 <strong>Escreva uma mensagem</strong> de boas-vindas personalizada</p>
          <p>2. 🎬 <strong>Faça upload de um vídeo</strong> grande (até 50MB) usando drag & drop</p>
          <p>3. ⏳ <strong>Aguarde o progresso</strong> do upload na barra de progresso</p>
          <p>4. 💾 <strong>Salve automaticamente</strong> - o sistema salva após upload bem-sucedido</p>
          <p>5. 📱 <strong>Teste no Telegram</strong> enviando /start para @{bot?.username}</p>
        </CardContent>
      </Card>
    </div>
  );
} 