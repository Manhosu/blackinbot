import React, { useState, useRef, useCallback } from 'react';
import { Upload, Film, Loader2, Check, X, AlertCircle, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface DirectVideoUploadProps {
  botId: string;
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
  currentVideoUrl?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  fileName: string | null;
  fileSize: number | null;
  uploadedUrl: string | null;
}

const BUCKET_NAME = 'bot-media';
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

export default function DirectVideoUpload({
  botId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 25,
  disabled = false,
  currentVideoUrl
}: DirectVideoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    fileName: null,
    fileSize: null,
    uploadedUrl: currentVideoUrl || null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Valida o arquivo antes do upload
   */
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Verificar tipo MIME
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Formato não suportado. Use: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`
      };
    }

    // Verificar extensão do arquivo
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Extensão inválida. Use: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`
      };
    }

    // Verificar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB (atual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
      };
    }

    // Verificar tamanho mínimo
    if (file.size < 1024) {
      return {
        isValid: false,
        error: 'Arquivo muito pequeno ou corrompido'
      };
    }

    return { isValid: true };
  }, [maxSizeMB]);

  /**
   * Gera nome único para o arquivo
   */
  const generateUniqueFileName = useCallback((originalName: string): string => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `video_${timestamp}_${randomId}.${extension}`;
  }, []);

  /**
   * Upload direto para Supabase Storage com progress tracking
   */
  const uploadToSupabase = useCallback(async (file: File): Promise<string> => {
    const fileName = generateUniqueFileName(file.name);
    const filePath = `${botId}/videos/${fileName}`;

    console.log('📤 Iniciando upload direto para Supabase:', {
      fileName,
      filePath,
      size: file.size,
      type: file.type
    });

    // Criar AbortController para cancelamento
    abortControllerRef.current = new AbortController();

    // Simulação de progress (Supabase não tem progress nativo)
    const progressInterval = setInterval(() => {
      setUploadState(prev => {
        const newProgress = Math.min(prev.progress + Math.random() * 15, 85);
        return { ...prev, progress: newProgress };
      });
    }, 500);

    try {
      // Upload com metadata detalhada
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            botId,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: file.size.toString(),
            contentType: file.type
          }
        });

      clearInterval(progressInterval);

      if (error) {
        console.error('❌ Erro no upload para Supabase:', error);
        
        // Tratar erros específicos
        if (error.message.includes('The resource already exists')) {
          throw new Error('Arquivo já existe. Tente novamente.');
        } else if (error.message.includes('Payload too large')) {
          throw new Error(`Arquivo muito grande para upload. Máximo: ${maxSizeMB}MB`);
        } else if (error.message.includes('Invalid file type')) {
          throw new Error('Tipo de arquivo não suportado.');
        } else if (error.message.includes('row-level security')) {
          throw new Error('Erro de permissão. Configure as políticas RLS do Supabase.');
        } else {
          throw new Error(`Erro no upload: ${error.message}`);
        }
      }

      if (!data) {
        throw new Error('Upload falhou - dados não retornados');
      }

      console.log('✅ Upload para Supabase concluído:', data);

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (!urlData.publicUrl) {
        throw new Error('Erro ao gerar URL pública');
      }

      console.log('🌐 URL pública gerada:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }, [botId, generateUniqueFileName, maxSizeMB]);

  /**
   * Handler para seleção de arquivo
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    console.log('📁 Arquivo selecionado:', file.name, file.size, file.type);

    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.isValid) {
      setUploadState(prev => ({
        ...prev,
        error: validation.error || 'Arquivo inválido',
        fileName: null,
        fileSize: null
      }));
      return;
    }

    // Limpar estados anteriores
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      fileName: file.name,
      fileSize: file.size,
      uploadedUrl: null
    });

    // Iniciar upload automaticamente
    await performUpload(file);
  }, [disabled, validateFile]);

  /**
   * Executa o upload
   */
  const performUpload = useCallback(async (file: File) => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null
    }));

    try {
      toast.info('📤 Enviando vídeo...', {
        description: 'Upload direto para cloud storage - pode levar alguns minutos',
        duration: 5000
      });

      // Upload direto
      const publicUrl = await uploadToSupabase(file);

      // Finalizar upload
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedUrl: publicUrl,
        error: null
      }));

      console.log('✅ Upload concluído com sucesso:', publicUrl);
      
      toast.success('✅ Vídeo enviado com sucesso!', {
        description: 'Arquivo disponível para uso no bot',
        duration: 4000
      });

      onUploadSuccess(publicUrl);

    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      
      const errorMessage = error.message || 'Erro desconhecido no upload';
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage,
        uploadedUrl: null
      }));

      onUploadError?.(errorMessage);
      
      toast.error('❌ Falha no upload', {
        description: errorMessage,
        duration: 6000
      });
    }
  }, [uploadToSupabase, onUploadSuccess, onUploadError]);

  /**
   * Cancela upload em andamento
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      progress: 0,
      error: 'Upload cancelado pelo usuário'
    }));

    toast.info('Upload cancelado');
  }, []);

  /**
   * Remove arquivo atual
   */
  const handleRemoveFile = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      fileName: null,
      fileSize: null,
      uploadedUrl: null
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onUploadSuccess(''); // URL vazia para remover
    toast.info('Vídeo removido');
  }, [onUploadSuccess]);

  /**
   * Formata tamanho do arquivo
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return (
    <div className="space-y-4">
      {/* Input de arquivo */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={disabled || uploadState.isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id={`video-upload-${botId}`}
        />
        
        <label
          htmlFor={`video-upload-${botId}`}
          className={`
            flex flex-col items-center justify-center w-full h-32
            border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
            ${uploadState.isUploading || disabled
              ? 'border-gray-600 bg-gray-800/50 cursor-not-allowed'
              : 'border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400/70'
            }
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploadState.isUploading ? (
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-2" />
            ) : (
              <Upload className="w-10 h-10 text-blue-400 mb-2" />
            )}
            
            <p className="mb-2 text-sm text-white/70">
              {uploadState.isUploading ? (
                <span className="font-medium text-blue-300">
                  Enviando vídeo... {Math.round(uploadState.progress)}%
                </span>
              ) : (
                <span>
                  <span className="font-medium text-blue-300">Clique para enviar</span> ou arraste o vídeo
                </span>
              )}
            </p>
            
            <p className="text-xs text-white/50">
              {ALLOWED_EXTENSIONS.map(ext => ext.toUpperCase()).join(', ')} até {maxSizeMB}MB
            </p>
          </div>
        </label>
      </div>

      {/* Barra de progresso */}
      {uploadState.isUploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-white/60">
            <span>Enviando para cloud storage...</span>
            <button
              onClick={cancelUpload}
              className="text-red-400 hover:text-red-300 underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Informações do arquivo */}
      {uploadState.fileName && (
        <div className="bg-white/5 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Film className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white truncate max-w-xs">
                  {uploadState.fileName}
                </p>
                {uploadState.fileSize && (
                  <p className="text-xs text-white/60">
                    {formatFileSize(uploadState.fileSize)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {uploadState.uploadedUrl && (
                <Check className="w-5 h-5 text-green-400" />
              )}
              
              {!uploadState.isUploading && (
                <button
                  onClick={handleRemoveFile}
                  className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {uploadState.error && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-300 font-medium">Erro no upload</p>
              <p className="text-xs text-red-300/80 mt-1">{uploadState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview do vídeo (se URL existir) */}
      {uploadState.uploadedUrl && !uploadState.isUploading && (
        <div className="bg-white/5 border border-green-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-300">✅ Vídeo pronto para uso</h4>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-400" />
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
                title="Remover vídeo"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <video
              src={uploadState.uploadedUrl}
              controls
              className="w-full max-h-48 rounded-lg"
              preload="metadata"
            >
              Seu navegador não suporta reprodução de vídeo.
            </video>
          </div>
          
          <p className="text-xs text-white/60 mt-2 break-all">
            <strong>URL:</strong> {uploadState.uploadedUrl}
          </p>
        </div>
      )}

      {/* Informações adicionais */}
      <div className="bg-blue-500/5 border border-blue-400/20 rounded-xl p-3">
        <div className="flex items-start space-x-2">
          <div className="text-blue-400 text-sm">💡</div>
          <div className="text-xs text-blue-300/80">
            <p className="font-medium mb-1">Upload direto para cloud storage:</p>
            <ul className="space-y-1 text-blue-300/60">
              <li>• Contorna limite de 4MB do Vercel</li>
              <li>• Suporta vídeos até {maxSizeMB}MB</li>
              <li>• Upload direto do navegador para Supabase</li>
              <li>• URLs públicas otimizadas para Telegram</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 