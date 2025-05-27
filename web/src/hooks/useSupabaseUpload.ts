import { useState } from 'react';
import { toast } from 'sonner';

interface UploadOptions {
  botId: string;
  mediaType: 'image' | 'video';
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export function useSupabaseUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🚀 Iniciando upload direto para Supabase Storage:', file.name);
      
      // Etapa 1: Obter URL assinado do nosso backend
      const urlResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          botId: options.botId,
          mediaType: options.mediaType
        })
      });

      const urlResult = await urlResponse.json();
      
      if (!urlResult.success) {
        throw new Error(urlResult.error || 'Erro ao gerar URL de upload');
      }
      
      console.log('✅ URL assinado obtido, fazendo upload direto...');
      setUploadProgress(25);
      options.onProgress?.(25);
      
      // Etapa 2: Upload direto para o Supabase Storage usando URL assinado
      const uploadResponse = await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Cache-Control': '3600',
          'x-upsert': 'false'
        }
      });
      
      setUploadProgress(75);
      options.onProgress?.(75);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Erro no upload direto:', errorText);
        throw new Error(`Erro no upload: ${uploadResponse.status} - ${errorText}`);
      }
      
      console.log('✅ Upload direto realizado com sucesso');
      setUploadProgress(90);
      options.onProgress?.(90);
      
      // Etapa 3: Confirmar upload e obter URL final
      const confirmResponse = await fetch(`/api/media/upload?filePath=${encodeURIComponent(urlResult.filePath)}`, {
        method: 'GET'
      });
      
      const confirmResult = await confirmResponse.json();
      
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Erro ao confirmar upload');
      }
      
      setUploadProgress(100);
      options.onProgress?.(100);
      
      console.log('✅ Upload confirmado:', confirmResult.url);
      
      return {
        success: true,
        url: confirmResult.url
      };
      
    } catch (error: any) {
      console.error('❌ Erro no processo de upload:', error);
      
      let errorMessage = 'Erro desconhecido no upload';
      
      if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = 'Arquivo muito grande. Tente um arquivo menor.';
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message.includes('format') || error.message.includes('tipo')) {
        errorMessage = 'Formato de arquivo não suportado.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
      
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress
  };
} 