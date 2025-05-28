'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export function useDirectSupabaseUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (
    file: File,
    bucketName: string = 'bot-media',
    folder: string = 'videos'
  ): Promise<UploadResult> => {
    try {
      setUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      // Validações no frontend
      const maxSize = 50 * 1024 * 1024; // 50MB limite máximo
      if (file.size > maxSize) {
        throw new Error(`Arquivo muito grande. Máximo: ${Math.round(maxSize / (1024 * 1024))}MB`);
      }

      // Tipos de arquivo permitidos
      const allowedTypes = [
        'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não suportado. Use: MP4, MOV, AVI, MKV, WebM, JPG, PNG, GIF, WebP');
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      console.log(`📤 Iniciando upload direto: ${fileName} (${Math.round(file.size / 1024 / 1024)}MB)`);

      // Upload direto para Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          duplex: 'half'
        });

      if (uploadError) {
        console.error('❌ Erro no upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Erro ao obter URL pública do arquivo');
      }

      const publicUrl = urlData.publicUrl;
      console.log(`✅ Upload concluído: ${publicUrl}`);

      // Simular progresso final
      setProgress({ loaded: file.size, total: file.size, percentage: 100 });

      return {
        success: true,
        url: publicUrl
      };

    } catch (err: any) {
      console.error('❌ Erro no upload:', err);
      const errorMessage = err.message || 'Erro desconhecido no upload';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setUploading(false);
    }
  };

  // Função para validar arquivo antes do upload
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Arquivo muito grande. Máximo: ${Math.round(maxSize / (1024 * 1024))}MB`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de arquivo não suportado'
      };
    }

    return { valid: true };
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    uploadFile,
    validateFile,
    formatFileSize,
    uploading,
    progress,
    error,
    clearError: () => setError(null)
  };
} 