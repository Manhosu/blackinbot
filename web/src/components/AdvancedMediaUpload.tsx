'use client';

import { useState, useRef, useCallback } from 'react';
import { useDirectSupabaseUpload } from '@/hooks/useDirectSupabaseUpload';
import { motion, AnimatePresence } from 'framer-motion';

interface AdvancedMediaUploadProps {
  onUploadSuccess: (url: string, type: 'image' | 'video') => void;
  onUploadError?: (error: string) => void;
  currentMediaUrl?: string;
  currentMediaType?: 'image' | 'video';
  maxSize?: number; // em MB
}

export default function AdvancedMediaUpload({
  onUploadSuccess,
  onUploadError,
  currentMediaUrl,
  currentMediaType,
  maxSize = 50
}: AdvancedMediaUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadFile,
    validateFile,
    formatFileSize,
    uploading,
    progress,
    error,
    clearError
  } = useDirectSupabaseUpload();

  const handleFileSelect = useCallback(async (file: File) => {
    clearError();
    
    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.valid) {
      onUploadError?.(validation.error || 'Arquivo inválido');
      return;
    }

    setSelectedFile(file);
    
    // Criar preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Fazer upload automaticamente
    const result = await uploadFile(file, 'bot-media', 'media');
    
    if (result.success && result.url) {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      onUploadSuccess(result.url, mediaType);
      
      // Limpar preview após sucesso
      setTimeout(() => {
        setPreview(null);
        setSelectedFile(null);
        URL.revokeObjectURL(previewUrl);
      }, 2000);
    } else {
      onUploadError?.(result.error || 'Erro no upload');
      setPreview(null);
      setSelectedFile(null);
      URL.revokeObjectURL(previewUrl);
    }
  }, [uploadFile, validateFile, clearError, onUploadSuccess, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeCurrentMedia = () => {
    onUploadSuccess('', 'image'); // Limpar mídia atual
  };

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-gray-600 hover:border-gray-500'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="video/*,image/*"
          onChange={handleFileInputChange}
          disabled={uploading}
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto">
                <svg className="animate-spin w-full h-full text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              
              <div className="space-y-2">
                <p className="text-white font-medium">
                  Fazendo upload... {progress.percentage.toFixed(1)}%
                </p>
                {selectedFile && (
                  <p className="text-gray-400 text-sm">
                    {selectedFile.name} • {formatFileSize(selectedFile.size)}
                  </p>
                )}
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <p className="text-xs text-gray-500">
                  {formatFileSize(progress.loaded)} de {formatFileSize(progress.total)}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload-area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                  />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  Adicionar Mídia
                </h3>
                <p className="text-gray-400 text-sm">
                  Arraste um arquivo aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500">
                  Suporta: Vídeos (MP4, MOV, AVI, MKV, WebM) e Imagens (JPG, PNG, GIF, WebP)
                </p>
                <p className="text-xs text-gray-500">
                  Tamanho máximo: {maxSize}MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview da Mídia Atual ou Selecionada */}
      <AnimatePresence>
        {(currentMediaUrl || preview) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden bg-gray-800 border border-gray-600"
          >
            <div className="p-4 border-b border-gray-600 flex items-center justify-between">
              <h4 className="text-white font-medium">
                {preview ? 'Preview' : 'Mídia Atual'}
              </h4>
              {currentMediaUrl && !preview && (
                <button
                  onClick={removeCurrentMedia}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={uploading}
                >
                  Remover
                </button>
              )}
            </div>
            
            <div className="p-4">
              {(currentMediaType === 'video' || selectedFile?.type.startsWith('video/')) ? (
                <video
                  src={preview || currentMediaUrl}
                  controls
                  className="w-full max-h-64 rounded-lg bg-black"
                  preload="metadata"
                >
                  Seu navegador não suporta vídeos
                </video>
              ) : (
                <img
                  src={preview || currentMediaUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
              )}
              
              {preview && selectedFile && (
                <div className="mt-3 text-sm text-gray-400">
                  <p><strong>Nome:</strong> {selectedFile.name}</p>
                  <p><strong>Tamanho:</strong> {formatFileSize(selectedFile.size)}</p>
                  <p><strong>Tipo:</strong> {selectedFile.type}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem de Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="text-red-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dicas */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Dica:</strong> Vídeos menores carregam mais rápido no Telegram</p>
        <p>🚀 <strong>Upload direto:</strong> Seus arquivos vão direto para o armazenamento, sem limitações da Vercel</p>
        <p>🔒 <strong>Seguro:</strong> URLs únicas e privadas para cada upload</p>
      </div>
    </div>
  );
} 