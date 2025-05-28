import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Film, Check, X, Loader2, AlertCircle, Eye } from 'lucide-react';
import { useDirectSupabaseUpload } from '@/hooks/useDirectSupabaseUpload';

interface DirectVideoUploadProps {
  botId: string;
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
  currentVideoUrl?: string;
  mediaType?: 'image' | 'video';
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  fileName: string | null;
  fileSize: number | null;
  uploadedUrl: string | null;
}

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export default function DirectVideoUpload({
  botId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 25,
  disabled = false,
  currentVideoUrl,
  mediaType = 'video'
}: DirectVideoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    fileName: null,
    fileSize: null,
    uploadedUrl: currentVideoUrl || null
  });

  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Usar o novo hook de upload direto
  const { uploadFile, isUploading, uploadProgress } = useDirectSupabaseUpload();

  /**
   * Valida o arquivo antes do upload
   */
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = mediaType === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    const allowedExtensions = mediaType === 'image' ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_VIDEO_EXTENSIONS;
    
    // Verificar tipo MIME
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Formato não suportado. Use: ${allowedExtensions.join(', ').toUpperCase()}`
      };
    }

    // Verificar extensão do arquivo
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Extensão inválida. Use: ${allowedExtensions.join(', ').toUpperCase()}`
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

    // Gerar preview
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.warn('⚠️ Erro ao gerar preview:', error);
    }

    // Iniciar upload automaticamente
    await performUpload(file);
  };

  /**
   * Executa o upload do arquivo
   */
  const performUpload = async (file: File) => {
    try {
      setUploadState(prev => ({ ...prev, isUploading: true, error: null }));
      
      console.log('🚀 Iniciando upload direto para Supabase Storage...');
      
      toast.info('📤 Enviando arquivo...', {
        description: 'Upload direto para Supabase Storage (sem limite de 4MB)',
        duration: 3000
      });

      const result = await uploadFile(file, {
        botId,
        mediaType,
        onProgress: (progress) => {
          setUploadState(prev => ({ ...prev, progress }));
        }
      });

      if (result.success && result.url) {
        console.log('✅ Upload concluído com sucesso:', result.url);
        
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          progress: 100,
          uploadedUrl: result.url!,
          error: null
        }));

        // Notificar sucesso
        onUploadSuccess(result.url);
        
        toast.success('✅ Upload concluído!', {
          description: `${mediaType === 'image' ? 'Imagem' : 'Vídeo'} enviado com sucesso`,
          duration: 4000
        });

      } else {
        throw new Error(result.error || 'Falha no upload');
      }

    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      
      const errorMessage = error.message || 'Erro desconhecido no upload';
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage
      }));

      onUploadError?.(errorMessage);
      
      toast.error('❌ Erro no upload', {
        description: errorMessage,
        duration: 5000
      });
    }
  };

  /**
   * Remove o arquivo selecionado
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
    setMediaPreview(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Formata o tamanho do arquivo
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const currentProgress = isUploading ? uploadProgress : uploadState.progress;
  const currentIsUploading = isUploading || uploadState.isUploading;

  return (
    <div className="space-y-4">
      {/* Área de upload */}
      <div className="border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-blue-400/50 transition-colors duration-200">
        <input
          ref={fileInputRef}
          type="file"
          accept={mediaType === 'image' ? 'image/*' : 'video/*'}
          onChange={handleFileSelect}
          disabled={disabled || currentIsUploading}
          className="hidden"
          id="file-upload"
        />
        
        <label 
          htmlFor="file-upload" 
          className={`block cursor-pointer ${disabled || currentIsUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-blue-500/20">
              {mediaType === 'image' ? (
                <Upload className="w-6 h-6 text-blue-400" />
              ) : (
                <Film className="w-6 h-6 text-blue-400" />
              )}
            </div>
            
            <h3 className="text-lg font-medium text-white mb-2">
              {currentIsUploading ? 'Enviando arquivo...' : `Selecionar ${mediaType === 'image' ? 'imagem' : 'vídeo'}`}
            </h3>
            
            <p className="text-sm text-white/60 mb-2">
              {mediaType === 'image' 
                ? `📸 Máximo ${maxSizeMB}MB - JPG, PNG, GIF, WebP`
                : `🎬 Máximo ${maxSizeMB}MB - MP4, MOV, AVI, MKV, WebM`
              }
            </p>
            
            <p className="text-xs text-blue-300/70">
              ✨ Upload direto para Supabase Storage (sem limite de 4MB do Vercel)
            </p>
          </div>
        </label>
      </div>

      {/* Informações do arquivo selecionado */}
      {uploadState.fileName && (
        <div className="bg-white/5 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {mediaType === 'image' ? (
                <Upload className="w-4 h-4 text-blue-400" />
              ) : (
                <Film className="w-4 h-4 text-blue-400" />
              )}
              <span className="text-sm font-medium text-blue-300">Arquivo selecionado</span>
            </div>
            
            {!currentIsUploading && (
              <button
                onClick={handleRemoveFile}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remover arquivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Nome:</span>
              <span className="text-white font-medium">{uploadState.fileName}</span>
            </div>
            
            {uploadState.fileSize && (
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Tamanho:</span>
                <span className="text-white">{formatFileSize(uploadState.fileSize)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de progresso */}
      {currentIsUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando para Supabase Storage...
            </span>
            <span className="text-white font-medium">{currentProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Preview do arquivo */}
      {mediaPreview && !currentIsUploading && (
        <div className="bg-white/5 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Pré-visualização</span>
          </div>
          {mediaType === 'image' ? (
            <img 
              src={mediaPreview} 
              alt="Pré-visualização" 
              className="max-h-48 max-w-full object-contain rounded-lg mx-auto"
            />
          ) : (
            <video 
              src={mediaPreview} 
              controls 
              className="max-h-48 max-w-full rounded-lg mx-auto"
            />
          )}
        </div>
      )}

      {/* Status de sucesso */}
      {uploadState.uploadedUrl && !currentIsUploading && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Upload concluído com sucesso!</span>
          </div>
          <p className="text-xs text-green-200/70 mt-1">
            {mediaType === 'image' ? 'Imagem' : 'Vídeo'} pronto para usar na mensagem de boas-vindas
          </p>
        </div>
      )}

      {/* Erro */}
      {uploadState.error && !currentIsUploading && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">Erro no upload</span>
          </div>
          <p className="text-xs text-red-200/70">{uploadState.error}</p>
        </div>
      )}
    </div>
  );
} 