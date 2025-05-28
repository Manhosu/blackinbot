import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Upload, Film, Check, X, Loader2, AlertCircle } from 'lucide-react';

// Cliente Supabase para upload direto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  /**
   * Valida o arquivo antes do upload
   */
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
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
  };

  /**
   * Gera nome único para o arquivo
   */
  const generateUniqueFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `video_${timestamp}_${randomId}.${extension}`;
  };

  /**
   * Upload direto para Supabase Storage
   */
  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileName = generateUniqueFileName(file.name);
    const filePath = `${botId}/videos/${fileName}`;

    console.log('📤 Iniciando upload direto para Supabase:', {
      fileName,
      filePath,
      size: file.size,
      type: file.type
    });

    // Upload com progress tracking
    let uploadProgress = 0;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        // Configurar metadata
        metadata: {
          botId,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

    if (error) {
      console.error('❌ Erro no upload para Supabase:', error);
      
      // Tratar erros específicos
      if (error.message.includes('The resource already exists')) {
        throw new Error('Arquivo já existe. Tente novamente.');
      } else if (error.message.includes('Payload too large')) {
        throw new Error(`Arquivo muito grande para upload. Máximo: ${maxSizeMB}MB`);
      } else if (error.message.includes('Invalid file type')) {
        throw new Error('Tipo de arquivo não suportado.');
      } else {
        throw new Error(`Erro no upload: ${error.message}`);
      }
    }

    if (!data) {
      throw new Error('Upload falhou - dados não retornados');
    }

    console.log('✅ Upload para Supabase concluído:', data);

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    if (!publicUrl) {
      throw new Error('Falha ao obter URL pública do arquivo');
    }

    console.log('🔗 URL pública gerada:', publicUrl);
    return publicUrl;
  };

  /**
   * Manipula a seleção de arquivo
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 Arquivo selecionado:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Resetar estado anterior
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      fileName: file.name,
      fileSize: file.size,
      uploadedUrl: null
    });

    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.isValid) {
      const errorMsg = validation.error!;
      setUploadState(prev => ({ ...prev, error: errorMsg }));
      onUploadError?.(errorMsg);
      toast.error('❌ Arquivo inválido', {
        description: errorMsg,
        duration: 5000
      });
      return;
    }

    // Iniciar upload
    await performUpload(file);
  };

  /**
   * Executa o upload
   */
  const performUpload = async (file: File) => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null
    }));

    try {
      // Simular progress para UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => {
          if (prev.progress < 90) {
            return { ...prev, progress: prev.progress + 10 };
          }
          return prev;
        });
      }, 200);

      toast.info('📤 Enviando vídeo...', {
        description: 'Upload direto para cloud storage',
        duration: 3000
      });

      // Upload direto
      const publicUrl = await uploadToSupabase(file);

      clearInterval(progressInterval);

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
        duration: 3000
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
        duration: 5000
      });
    }
  };

  /**
   * Remove arquivo atual
   */
  const handleRemoveFile = () => {
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
  };

  /**
   * Formata tamanho do arquivo
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
                  Enviando vídeo... {uploadState.progress}%
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
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadState.progress}%` }}
          />
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
            <p className="text-sm text-red-300">{uploadState.error}</p>
          </div>
        </div>
      )}

      {/* Preview do vídeo (se URL existir) */}
      {uploadState.uploadedUrl && !uploadState.isUploading && (
        <div className="bg-white/5 border border-green-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-300">✅ Vídeo pronto para uso</h4>
            <Check className="w-5 h-5 text-green-400" />
          </div>
          
          <video
            src={uploadState.uploadedUrl}
            controls
            className="w-full max-h-48 rounded-lg"
            preload="metadata"
          >
            Seu navegador não suporta reprodução de vídeo.
          </video>
          
          <p className="text-xs text-white/60 mt-2 break-all">
            {uploadState.uploadedUrl}
          </p>
        </div>
      )}
    </div>
  );
} 