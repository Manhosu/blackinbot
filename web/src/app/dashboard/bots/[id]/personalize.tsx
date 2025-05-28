'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, MessageSquare, Eye } from 'lucide-react';
import AdvancedMediaUpload from '@/components/AdvancedMediaUpload';

interface PersonalizeBotProps {
  bot: any;
  onSave: (data: { welcome_message: string; welcome_media_url: string; welcome_media_type: string }) => void;
}

export default function PersonalizeBot({ bot, onSave }: PersonalizeBotProps) {
  const [customMessage, setCustomMessage] = useState(bot?.welcome_message || '');
  const [customMedia, setCustomMedia] = useState(bot?.welcome_media_url || '');
  const [mediaType, setMediaType] = useState(bot?.welcome_media_type === 'photo' ? 'image' : bot?.welcome_media_type || 'none');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!customMessage.trim()) {
      toast.error('❌ A mensagem de boas-vindas é obrigatória');
      return;
    }

    setIsSaving(true);
    
    try {
      const updateData = {
        welcome_message: customMessage.trim(),
        welcome_media_url: customMedia,
        welcome_media_type: mediaType === 'image' ? 'photo' : mediaType
      };

      await onSave(updateData);
      toast.success('🎉 Personalização salva com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-white text-xl flex items-center gap-2">
              Personalização Avançada
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                Upload até 50MB
              </span>
            </CardTitle>
            <p className="text-blue-200/80 text-sm">
              Configure sua mensagem de boas-vindas com mídia de alta qualidade
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Preview da mensagem */}
        {customMessage && (
          <div className="bg-white/5 border border-blue-400/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Pré-visualização</span>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-white/90 text-sm leading-relaxed">
              {customMessage}
            </div>
          </div>
        )}

        {/* Campo de mensagem */}
        <div className="space-y-3">
          <Label htmlFor="customMessage" className="text-white font-medium">
            Mensagem de Boas-vindas *
          </Label>
          <Textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Olá! 👋 Bem-vindo ao nosso bot! Como posso te ajudar hoje?"
            rows={4}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400/20"
          />
          <div className="flex items-center justify-between text-xs">
            <p className="text-blue-200/70">
              💡 Use emojis e seja acolhedor para criar uma boa primeira impressão
            </p>
            <span className="text-white/60">{customMessage.length} caracteres</span>
          </div>
        </div>

        {/* Upload de Mídia Avançado */}
        <div className="space-y-4">
          <Label className="text-white font-medium">
            Mídia de Boas-vindas (Opcional)
          </Label>
          
          <AdvancedMediaUpload
            currentMediaUrl={customMedia || undefined}
            currentMediaType={mediaType === 'none' ? undefined : (mediaType as 'image' | 'video')}
            maxSize={50} // 50MB
            onUploadSuccess={(url, type) => {
              console.log(`✅ Upload concluído: ${url} (${type})`);
              setCustomMedia(url);
              setMediaType(type);
              toast.success('✅ Mídia carregada com sucesso!');
            }}
            onUploadError={(error) => {
              console.error('❌ Erro no upload:', error);
              toast.error(`Erro no upload: ${error}`);
            }}
          />
        </div>

        {/* Informações do bot */}
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <h4 className="text-white font-medium">Informações do Bot</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Nome:</span>
              <span className="text-white ml-2">{bot?.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Username:</span>
              <span className="text-white ml-2">@{bot?.username}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 ${bot?.is_activated ? 'text-green-400' : 'text-yellow-400'}`}>
                {bot?.is_activated ? 'Ativo' : 'Aguardando ativação'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Mídia atual:</span>
              <span className="text-white ml-2">
                {customMedia 
                  ? `${mediaType === 'video' ? 'Vídeo' : 'Imagem'} configurada`
                  : 'Nenhuma'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Botão de salvar */}
        <div className="flex justify-end pt-6 border-t border-white/10">
          <Button
            onClick={handleSave}
            disabled={isSaving || !customMessage.trim()}
            className={`px-8 py-3 text-white font-medium rounded-xl shadow-lg transition-all duration-200 ${
              isSaving
                ? 'bg-gray-600 cursor-not-allowed'
                : customMessage.trim()
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105'
                : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Salvando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Salvar Personalização</span>
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 