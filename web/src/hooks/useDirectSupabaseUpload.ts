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
  code?: string;
}

interface SignedUploadResponse {
  success: boolean;
  data?: {
    uploadUrl: string;
    publicUrl: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    mediaType: string;
    expiresIn: number;
  };
  error?: string;
  code?: string;
}

export function useDirectSupabaseUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Obter dados do usuário para autenticação
   */
  const getUserData = (): string | null => {
    try {
      const localUser = localStorage.getItem('blackinpay_user');
      if (localUser) {
        return localUser; // Já está em formato JSON string
      }
      return null;
    } catch (e) {
      console.warn('⚠️ Erro ao obter dados do usuário:', e);
      return null;
    }
  };

  /**
   * Validar arquivo antes do upload
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
    const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 25 * 1024 * 1024; // 10MB para imagem, 25MB para vídeo
    
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return { 
        isValid: false, 
        error: `Tamanho máximo para ${mediaType === 'image' ? 'imagens' : 'vídeos'} é ${maxSizeMB}MB` 
      };
    }

    // Validar tamanho mínimo
    if (file.size < 1024) {
      return {
        isValid: false,
        error: 'Arquivo muito pequeno ou corrompido'
      };
    }

    return { isValid: true };
  };

  /**
   * Solicitar URL assinada para upload
   */
  const requestSignedUrl = async (file: File, options: UploadOptions): Promise<SignedUploadResponse> => {
    const userData = getUserData();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (userData) {
      headers['x-user-data'] = userData;
    }
    
    const response = await fetch('/api/media/signed-upload', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        botId: options.botId,
        mediaType: options.mediaType
      })
    });
    
    if (!response.ok) {
      let errorMessage = 'Erro ao solicitar URL de upload';
      let errorCode = 'REQUEST_ERROR';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorCode = errorData.code || errorCode;
      } catch (e) {
        console.error('❌ Erro ao parsear resposta de erro:', e);
      }
      
      throw new Error(`${errorMessage} (${errorCode})`);
    }
    
    return await response.json();
  };

  /**
   * Fazer upload direto para o Supabase Storage
   */
  const uploadToSupabase = async (file: File, uploadUrl: string, onProgress?: (progress: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Configurar progresso
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress);
        }
      });
      
      // Configurar resposta
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ Upload para Supabase Storage concluído');
          resolve();
        } else {
          console.error('❌ Erro no upload:', xhr.status, xhr.statusText);
          reject(new Error(`Erro no upload: ${xhr.status} ${xhr.statusText}`));
        }
      });
      
      // Configurar erro
      xhr.addEventListener('error', () => {
        console.error('❌ Erro de rede no upload');
        reject(new Error('Erro de rede durante o upload'));
      });
      
      // Configurar timeout
      xhr.addEventListener('timeout', () => {
        console.error('❌ Timeout no upload');
        reject(new Error('Timeout durante o upload'));
      });
      
      // Configurar e enviar
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Cache-Control', '3600');
      xhr.timeout = 300000; // 5 minutos
      xhr.send(file);
    });
  };

  /**
   * Confirmar upload no backend
   */
  const confirmUpload = async (uploadData: any): Promise<{ success: boolean; url?: string; error?: string }> => {
    const userData = getUserData();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (userData) {
      headers['x-user-data'] = userData;
    }
    
    const response = await fetch('/api/media/signed-upload', {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(uploadData)
    });
    
    if (!response.ok) {
      let errorMessage = 'Erro ao confirmar upload';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error('❌ Erro ao parsear resposta de confirmação:', e);
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  };

  /**
   * Função principal de upload direto
   */
  const uploadFile = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('🚀 Iniciando upload direto:', file.name);
      
      // 1. Validar arquivo localmente
      const validation = validateFile(file, options.mediaType);
      if (!validation.isValid) {
        toast.error(validation.error);
        return { success: false, error: validation.error };
      }
      
      options.onProgress?.(5);
      
      // 2. Solicitar URL assinada
      console.log('📝 Solicitando URL assinada...');
      const signedUrlResponse = await requestSignedUrl(file, options);
      
      if (!signedUrlResponse.success || !signedUrlResponse.data) {
        const error = signedUrlResponse.error || 'Falha ao obter URL de upload';
        toast.error(error);
        return { success: false, error };
      }
      
      options.onProgress?.(15);
      
      const { uploadUrl, publicUrl, filePath, fileName, fileSize, mediaType } = signedUrlResponse.data;
      
      console.log('✅ URL assinada obtida:', uploadUrl);
      
      // 3. Fazer upload direto para o Supabase Storage
      console.log('📤 Fazendo upload direto para Supabase Storage...');
      await uploadToSupabase(file, uploadUrl, (progress) => {
        // Mapear progresso de 15% a 85%
        const mappedProgress = 15 + (progress * 0.7);
        options.onProgress?.(Math.round(mappedProgress));
        setUploadProgress(Math.round(mappedProgress));
      });
      
      options.onProgress?.(90);
      
      // 4. Confirmar upload no backend
      console.log('✅ Confirmando upload...');
      const confirmResult = await confirmUpload({
        filePath,
        publicUrl,
        botId: options.botId,
        fileName,
        fileSize,
        fileType: file.type,
        mediaType
      });
      
      if (!confirmResult.success) {
        const error = confirmResult.error || 'Falha na confirmação do upload';
        toast.error(error);
        return { success: false, error };
      }
      
      options.onProgress?.(100);
      setUploadProgress(100);
      
      console.log('✅ Upload direto concluído com sucesso:', publicUrl);
      
      return {
        success: true,
        url: publicUrl
      };
      
    } catch (error: any) {
      console.error('❌ Erro no upload direto:', error);
      const errorMessage = error.message || 'Erro desconhecido no upload';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Função para deletar arquivo (opcional)
   */
  const deleteFile = async (filePath: string, botId: string): Promise<UploadResult> => {
    try {
      console.log('🗑️ Removendo arquivo:', filePath);
      
      const userData = getUserData();
      const headers: Record<string, string> = {};
      
      if (userData) {
        headers['x-user-data'] = userData;
      }
      
      const deleteResponse = await fetch(
        `/api/media/upload?filePath=${encodeURIComponent(filePath)}&botId=${encodeURIComponent(botId)}`,
        {
          method: 'DELETE',
          headers,
          credentials: 'include'
        }
      );
      
      if (!deleteResponse.ok) {
        const error = 'Erro ao remover arquivo';
        console.error('❌ Erro na remoção:', deleteResponse.status);
        toast.error(error);
        return { success: false, error };
      }
      
      const deleteData = await deleteResponse.json();
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