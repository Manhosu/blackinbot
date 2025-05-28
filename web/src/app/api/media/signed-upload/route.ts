import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Cliente admin do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configurações
const CONFIG = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 25 * 1024 * 1024, // 25MB
  BUCKET_NAME: 'bot-media',
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_VIDEO_TYPES: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  SIGNED_URL_EXPIRES_IN: 300 // 5 minutos
};

interface SignedUploadRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  botId: string;
  mediaType: 'image' | 'video';
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
}

/**
 * Validar autenticação básica via localStorage/cookies
 */
async function validateUser(request: NextRequest): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  try {
    // Verificar header de dados do usuário (vem do localStorage)
    const userDataHeader = request.headers.get('x-user-data');
    if (userDataHeader) {
      try {
        const userData = JSON.parse(userDataHeader);
        if (userData.id) {
          console.log('✅ Usuário validado via header:', userData.id);
          return { isValid: true, userId: userData.id };
        }
      } catch (e) {
        console.warn('⚠️ Erro ao parsear dados do usuário:', e);
      }
    }

    // Fallback: verificar cookies de sessão
    const userCookie = request.cookies.get('blackinpay_user');
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie.value);
        if (userData.id) {
          console.log('✅ Usuário validado via cookie:', userData.id);
          return { isValid: true, userId: userData.id };
        }
      } catch (e) {
        console.warn('⚠️ Erro ao parsear cookie de usuário:', e);
      }
    }

    return { isValid: false, error: 'Usuário não autenticado' };
  } catch (error: any) {
    console.error('❌ Erro na validação de usuário:', error);
    return { isValid: false, error: 'Erro interno de autenticação' };
  }
}

/**
 * Validar se o usuário tem acesso ao bot
 */
async function validateBotAccess(userId: string, botId: string): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    console.log('🔍 Verificando acesso ao bot:', botId, 'para usuário:', userId);
    
    // Para bot de teste, permitir acesso direto
    if (botId === 'test-bot-123') {
      console.log('✅ Acesso permitido para bot de teste');
      return { hasAccess: true };
    }
    
    const { data: bot, error } = await supabaseAdmin
      .from('bots')
      .select('id, owner_id')
      .eq('id', botId)
      .single();
    
    if (error || !bot) {
      console.warn('⚠️ Bot não encontrado:', error?.message);
      return { hasAccess: false, error: 'Bot não encontrado' };
    }
    
    // Para usuários locais temporários, permitir acesso
    if (userId.includes('local_user_') || userId === 'local_user') {
      console.log('✅ Acesso permitido para usuário local temporário');
      return { hasAccess: true };
    }
    
    // Verificar se o usuário é o dono do bot
    if (bot.owner_id !== userId) {
      console.warn('⚠️ Usuário não é dono do bot');
      return { hasAccess: false, error: 'Acesso negado ao bot' };
    }
    
    console.log('✅ Acesso ao bot validado');
    return { hasAccess: true };
    
  } catch (error: any) {
    console.error('❌ Erro na validação de acesso ao bot:', error);
    return { hasAccess: false, error: 'Erro interno na validação de acesso' };
  }
}

/**
 * Validar arquivo
 */
function validateFile(fileName: string, fileSize: number, fileType: string, mediaType: 'image' | 'video'): { isValid: boolean; error?: string } {
  // Validar extensão
  const ext = fileName.toLowerCase().split('.').pop();
  if (!ext) {
    return { isValid: false, error: 'Arquivo sem extensão' };
  }
  
  const allowedTypes = mediaType === 'image' ? CONFIG.ALLOWED_IMAGE_TYPES : CONFIG.ALLOWED_VIDEO_TYPES;
  if (!allowedTypes.includes(ext)) {
    const validTypes = allowedTypes.join(', ');
    return { 
      isValid: false, 
      error: `Formato de ${mediaType === 'image' ? 'imagem' : 'vídeo'} inválido. Tipos aceitos: ${validTypes}` 
    };
  }
  
  // Validar tamanho
  const maxSize = mediaType === 'image' ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_VIDEO_SIZE;
  if (fileSize > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return { 
      isValid: false, 
      error: `Tamanho máximo para ${mediaType === 'image' ? 'imagens' : 'vídeos'} é ${maxSizeMB}MB` 
    };
  }
  
  return { isValid: true };
}

/**
 * Garantir que o bucket existe
 */
async function ensureBucketExists(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📦 Verificando bucket...');
    
    const { data: bucketInfo, error: bucketError } = await supabaseAdmin.storage.getBucket(CONFIG.BUCKET_NAME);
    
    if (bucketError && bucketError.message.includes('not found')) {
      console.log('📦 Criando bucket bot-media...');
      
      const { error: createError } = await supabaseAdmin.storage.createBucket(CONFIG.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'
        ],
        fileSizeLimit: CONFIG.MAX_VIDEO_SIZE
      });
      
      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return { success: false, error: 'Erro ao criar bucket de armazenamento' };
      }
      
      console.log('✅ Bucket criado com sucesso');
    } else if (bucketError) {
      console.error('❌ Erro ao verificar bucket:', bucketError);
      return { success: false, error: 'Erro ao verificar bucket de armazenamento' };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro na verificação do bucket:', error);
    return { success: false, error: 'Erro interno no bucket' };
  }
}

/**
 * POST - Gerar URL assinada para upload direto
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    console.log('📝 Solicitação de URL assinada recebida');
    
    // 1. Validar usuário
    const userValidation = await validateUser(request);
    if (!userValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: userValidation.error || 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    // 2. Parsear dados da requisição
    const body: SignedUploadRequest = await request.json();
    const { fileName, fileSize, fileType, botId, mediaType } = body;
    
    if (!fileName || !fileSize || !fileType || !botId || !mediaType) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        code: 'MISSING_DATA'
      }, { status: 400 });
    }
    
    console.log('📁 Dados do arquivo:', { fileName, fileSize, fileType, botId, mediaType });
    
    // 3. Validar acesso ao bot
    const botAccess = await validateBotAccess(userValidation.userId!, botId);
    if (!botAccess.hasAccess) {
      return NextResponse.json({
        success: false,
        error: botAccess.error || 'Acesso negado ao bot',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }
    
    // 4. Validar arquivo
    const fileValidation = validateFile(fileName, fileSize, fileType, mediaType);
    if (!fileValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: fileValidation.error,
        code: 'INVALID_FILE'
      }, { status: 400 });
    }
    
    // 5. Garantir que o bucket existe
    const bucketCheck = await ensureBucketExists();
    if (!bucketCheck.success) {
      return NextResponse.json({
        success: false,
        error: bucketCheck.error,
        code: 'BUCKET_ERROR'
      }, { status: 500 });
    }
    
    // 6. Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${botId}/${mediaType}s/${timestamp}_${randomId}.${fileExtension}`;
    
    console.log('🔄 Nome único gerado:', uniqueFileName);
    
    // 7. Gerar URL assinada para upload
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
      .createSignedUploadUrl(uniqueFileName, {
        upsert: false
      });
    
    if (signedUrlError || !signedUrlData) {
      console.error('❌ Erro ao gerar URL assinada:', signedUrlError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao gerar URL de upload',
        code: 'SIGNED_URL_ERROR'
      }, { status: 500 });
    }
    
    console.log('✅ URL assinada gerada com sucesso');
    
    // 8. Gerar URL pública para retorno
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
      .getPublicUrl(uniqueFileName);
    
    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: signedUrlData.signedUrl,
        publicUrl: publicUrl,
        filePath: uniqueFileName,
        fileName: fileName,
        fileSize: fileSize,
        mediaType: mediaType,
        expiresIn: CONFIG.SIGNED_URL_EXPIRES_IN
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro na geração de URL assinada:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * PUT - Confirmar upload e registrar no banco
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    console.log('✅ Confirmação de upload recebida');
    
    // 1. Validar usuário
    const userValidation = await validateUser(request);
    if (!userValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: userValidation.error || 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    // 2. Parsear dados da requisição
    const body = await request.json();
    const { filePath, publicUrl, botId, fileName, fileSize, fileType, mediaType } = body;
    
    if (!filePath || !publicUrl || !botId) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        code: 'MISSING_DATA'
      }, { status: 400 });
    }
    
    console.log('📝 Registrando upload no banco:', filePath);
    
    // 3. Registrar upload no banco de dados
    try {
      const { error: dbError } = await supabaseAdmin
        .from('media_uploads')
        .insert([{
          bot_id: botId,
          user_id: userValidation.userId,
          file_path: filePath,
          file_name: fileName || 'unknown',
          file_size: fileSize || 0,
          file_type: fileType || 'unknown',
          media_type: mediaType,
          public_url: publicUrl,
          upload_method: 'signed'
        }]);
      
      if (dbError) {
        console.warn('⚠️ Erro ao registrar no banco (não crítico):', dbError);
        // Não falhar o upload por causa disto
      } else {
        console.log('✅ Upload registrado no banco com sucesso');
      }
    } catch (dbError: any) {
      console.warn('⚠️ Exceção ao registrar no banco (não crítico):', dbError);
      // Não falhar o upload por causa disto
    }
    
    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        filePath: filePath
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro na confirmação de upload:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
} 