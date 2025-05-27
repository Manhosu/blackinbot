import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Configuração para aceitar uploads de arquivos
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload direto recebido');
    
    // Verificar se há dados de usuário nos cookies/sessão
    const userCookie = request.cookies.get('blackinpay_user');
    let userId = null;
    
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie.value);
        userId = userData.id;
        console.log('✅ Usuário identificado via cookie:', userId);
      } catch (e) {
        console.warn('⚠️ Erro ao parsear cookie de usuário:', e);
      }
    }
    
    // Se não tem usuário via cookie, tentar localStorage (via header)
    if (!userId) {
      const authHeader = request.headers.get('x-user-data');
      if (authHeader) {
        try {
          const userData = JSON.parse(authHeader);
          userId = userData.id;
          console.log('✅ Usuário identificado via header:', userId);
        } catch (e) {
          console.warn('⚠️ Erro ao parsear header de usuário:', e);
        }
      }
    }
    
    // Validar se temos um usuário
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não identificado. Faça login novamente.',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    // Parsear FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const botId = formData.get('botId') as string;
    const mediaType = formData.get('mediaType') as string;
    
    if (!file || !botId || !mediaType) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        code: 'MISSING_DATA'
      }, { status: 400 });
    }
    
    console.log('📁 Processando arquivo:', {
      name: file.name,
      size: file.size,
      type: file.type,
      botId,
      mediaType,
      userId
    });
    
    // Validar tipo de arquivo
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
    const allowedTypes = mediaType === 'image' ? allowedImageTypes : allowedVideoTypes;
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `Tipo de arquivo não suportado: ${file.type}`,
        code: 'INVALID_FILE_TYPE'
      }, { status: 400 });
    }
    
    // Validar tamanho
    const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json({
        success: false,
        error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB`,
        code: 'FILE_TOO_LARGE'
      }, { status: 400 });
    }
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${botId}/${mediaType}s/${timestamp}_${randomId}.${fileExtension}`;
    
    console.log('🔄 Nome do arquivo gerado:', fileName);
    
    // Converter arquivo para ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileBuffer);
    
    // Fazer upload direto para o Supabase Storage
    console.log('📦 Iniciando upload para Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bot-media')
      .upload(fileName, fileUint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Erro no upload para Supabase Storage:', JSON.stringify(uploadError, null, 2));
      
      // Tratar erros específicos do Supabase Storage
      let errorMessage = 'Erro interno no upload';
      let errorCode = 'UPLOAD_ERROR';
      
      if (uploadError.message?.includes('row-level security')) {
        errorMessage = 'Erro de permissão no storage. Políticas RLS incorretas.';
        errorCode = 'STORAGE_PERMISSION_ERROR';
      } else if (uploadError.message?.includes('Unauthorized')) {
        errorMessage = 'Não autorizado para fazer upload no storage.';
        errorCode = 'STORAGE_UNAUTHORIZED';
      } else if (uploadError.message?.includes('duplicate')) {
        errorMessage = 'Arquivo já existe. Tente novamente.';
        errorCode = 'FILE_EXISTS';
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: errorCode,
        details: uploadError.message
      }, { status: 500 });
    }
    
    console.log('✅ Upload realizado para:', uploadData.path);
    
    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('bot-media')
      .getPublicUrl(uploadData.path);
    
    const publicUrl = urlData.publicUrl;
    console.log('🌐 URL pública gerada:', publicUrl);
    
    // Registrar o upload no banco (opcional, para auditoria)
    console.log('📝 Registrando upload no banco...');
    try {
      const { error: dbError } = await supabase
        .from('media_uploads')
        .insert([{
          bot_id: botId,
          user_id: userId,
          file_path: uploadData.path,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          media_type: mediaType,
          public_url: publicUrl,
          upload_method: 'direct'
        }]);
      
      if (dbError) {
        console.warn('⚠️ Erro ao registrar upload no banco:', JSON.stringify(dbError, null, 2));
        
        // Se o erro for de RLS, continuar mesmo assim (upload já funcionou)
        if (dbError.message?.includes('row-level security')) {
          console.log('⚠️ Continuando apesar do erro de RLS no registro');
        } else {
          // Para outros erros, pode ser mais crítico
          console.error('❌ Erro crítico no registro do upload:', dbError);
        }
      } else {
        console.log('✅ Upload registrado no banco com sucesso');
      }
    } catch (dbError: any) {
      console.warn('⚠️ Exceção ao registrar upload no banco (não crítico):', dbError);
      // Não falhar o upload por causa disto, já que o arquivo foi carregado com sucesso
    }
    
    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        path: uploadData.path,
        fileName: file.name,
        fileSize: file.size,
        mediaType: mediaType
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro geral no upload direto:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: error.stack
    }, { status: 500 });
  }
} 