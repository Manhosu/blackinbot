import { useState } from 'react';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UploadOptions {
  botId: string;
  mediaType: 'image' | 'video';
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  code?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  code?: string;
}

export function useSupabaseUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const supabase = createClientComponentClient();

  /**
   * Função para obter token de autenticação
   */
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao obter sessão:', error);
        return null;
      }
      
      return session?.access_token || null;
    } catch (error) {
      console.error('❌ Erro na autenticação:', error);
      return null;
    }
  };

  /**
   * Função para validar arquivo antes do upload
   */
  const validateFile = (file: File, mediaType: 'image' | 'video'): { isValid: boolean; error?: string } => {
    // Validar tipo de arquivo
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
    
    const allowedTypes = mediaType === 'image' ? allowedImageTypes : allowedVideoTypes;
    
    if (!allowedTypes.includes(file.type)) {
      const validTypes = mediaType === 'image' 
        ? 'JPEG, PNG, GIF, WebP' 
        : 'MP4, MOV, AVI, MKV, WebM';
      return { 
        isValid: false, 
        error: `Formato de ${mediaType === 'image' ? 'imagem' : 'vídeo'} inválido. Tipos aceitos: ${validTypes}` 
      };
    }

    // Validar tamanho do arquivo
    const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB para imagem, 100MB para vídeo
    
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return { 
        isValid: false, 
        error: `Tamanho máximo para ${mediaType === 'image' ? 'imagens' : 'vídeos'} é ${maxSizeMB}MB` 
      };
    }

    return { isValid: true };
  };

  /**
   * Função principal de upload
   */
  const uploadFile = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🚀 Iniciando upload direto para Supabase Storage:', file.name);
      
      // 1. Validar arquivo localmente primeiro
      const validation = validateFile(file, options.mediaType);
      if (!validation.isValid) {
        toast.error(validation.error);
        return { success: false, error: validation.error };
      }
      
      // 2. Obter token de autenticação
      const authToken = await getAuthToken();
      if (!authToken) {
        const error = 'Usuário não autenticado. Faça login novamente.';
        toast.error(error);
        return { success: false, error, code: 'UNAUTHORIZED' };
      }
      
      // 3. Solicitar URL assinado do backend
      options.onProgress?.(10);
      
      const urlResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          botId: options.botId,
          mediaType: options.mediaType
        })
      });
      
      if (!urlResponse.ok) {
        let errorMessage = 'Erro ao solicitar URL de upload';
        try {
          const errorData: ApiResponse = await urlResponse.json();
          errorMessage = errorData.error || errorMessage;
          
          // Mensagens de erro específicas para melhor UX
          switch (errorData.code) {
            case 'UNAUTHORIZED':
              errorMessage = 'Sessão expirada. Faça login novamente.';
              break;
            case 'BOT_ACCESS_DENIED':
              errorMessage = 'Você não tem permissão para acessar este bot.';
              break;
            case 'INVALID_FILE_TYPE':
              errorMessage = errorData.error || 'Tipo de arquivo não suportado.';
              break;
            case 'FILE_TOO_LARGE':
              errorMessage = errorData.error || 'Arquivo muito grande.';
              break;
            default:
              errorMessage = errorData.error || errorMessage;
          }
        } catch (e) {
          console.error('❌ Erro ao parsear resposta de erro:', e);
        }
        
        console.error('❌ Erro na solicitação de URL:', urlResponse.status, errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      const urlData: ApiResponse = await urlResponse.json();
      if (!urlData.success || !urlData.data) {
        const error = urlData.error || 'Falha ao obter URL de upload';
        console.error('❌ Resposta inválida da API:', urlData);
        toast.error(error);
        return { success: false, error };
      }
      
      const { uploadUrl, publicUrl, filePath } = urlData.data;
      console.log('✅ URL assinado obtido:', uploadUrl);
      
      // 4. Fazer upload direto para o Supabase Storage
      options.onProgress?.(30);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Cache-Control': '3600'
        }
      });
      
      if (!uploadResponse.ok) {
        const error = `Falha no upload: ${uploadResponse.status} ${uploadResponse.statusText}`;
        console.error('❌ Erro no upload para Supabase:', error);
        toast.error('Erro ao fazer upload do arquivo');
        return { success: false, error };
      }
      
      console.log('✅ Upload para Supabase Storage concluído');
      options.onProgress?.(80);
      
      // 5. Confirmar upload e obter URL final
      const confirmResponse = await fetch(
        `/api/media/upload?filePath=${encodeURIComponent(filePath)}&botId=${encodeURIComponent(options.botId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (!confirmResponse.ok) {
        const error = 'Erro ao confirmar upload';
        console.error('❌ Erro na confirmação:', confirmResponse.status);
        toast.error(error);
        return { success: false, error };
      }
      
      const confirmData: ApiResponse = await confirmResponse.json();
      if (!confirmData.success || !confirmData.data) {
        const error = confirmData.error || 'Falha na confirmação do upload';
        console.error('❌ Erro na confirmação:', confirmData);
        toast.error(error);
        return { success: false, error };
      }
      
      options.onProgress?.(100);
      
      const finalUrl = confirmData.data.url;
      console.log('✅ Upload concluído com sucesso:', finalUrl);
      toast.success('Upload realizado com sucesso!');
      
      return { 
        success: true, 
        url: finalUrl
      };
      
    } catch (error: any) {
      console.error('❌ Erro no processo de upload:', error);
      const errorMessage = error.message || 'Erro desconhecido no upload';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Função para deletar arquivo
   */
  const deleteFile = async (filePath: string, botId: string): Promise<UploadResult> => {
    try {
      console.log('🗑️ Removendo arquivo:', filePath);
      
      // Obter token de autenticação
      const authToken = await getAuthToken();
      if (!authToken) {
        const error = 'Usuário não autenticado. Faça login novamente.';
        toast.error(error);
        return { success: false, error, code: 'UNAUTHORIZED' };
      }
      
      const deleteResponse = await fetch(
        `/api/media/upload?filePath=${encodeURIComponent(filePath)}&botId=${encodeURIComponent(botId)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (!deleteResponse.ok) {
        const error = 'Erro ao remover arquivo';
        console.error('❌ Erro na remoção:', deleteResponse.status);
        toast.error(error);
        return { success: false, error };
      }
      
      const deleteData: ApiResponse = await deleteResponse.json();
      if (!deleteData.success) {
        const error = deleteData.error || 'Falha na remoção do arquivo';
        console.error('❌ Erro na remoção:', deleteData);
        toast.error(error);
        return { success: false, error };
      }
      
      console.log('✅ Arquivo removido com sucesso');
      toast.success('Arquivo removido com sucesso!');
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erro na remoção do arquivo:', error);
      const errorMessage = error.message || 'Erro desconhecido na remoção';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    uploadFile,
    deleteFile,
    isUploading,
    uploadProgress
  };
} 