import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// Cliente admin do Supabase para operações de storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validação das variáveis de ambiente na inicialização
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configurações de limite e tipos de arquivo
const CONFIG = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 25 * 1024 * 1024, // 25MB (otimizado para Telegram)
  BUCKET_NAME: 'bot-media',
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_VIDEO_TYPES: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  ALLOWED_MIME_TYPES: [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'
  ]
};

// Interface para dados da requisição
interface UploadRequestBody {
  fileName: string;
  fileSize: number;
  fileType: string;
  botId: string;
  mediaType: 'image' | 'video';
}

// Interface para resposta padronizada
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Função para validar autenticação do usuário
 */
async function validateAuthentication(request: NextRequest): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  try {
    // Tentar obter token do header Authorization
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      console.log('🔐 Validando token de autenticação...');
      
      // Validar token JWT com Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        console.warn('⚠️ Token inválido:', error?.message);
        return { isValid: false, error: 'Token de autenticação inválido' };
      }
      
      console.log('✅ Usuário autenticado via token:', user.id);
      return { isValid: true, userId: user.id };
    }
    
    // Fallback: tentar autenticação via cookies (sessão)
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('sb-access-token')?.value;
    
    if (sessionCookie) {
      console.log('🍪 Validando sessão via cookies...');
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(sessionCookie);
      
      if (error || !user) {
        console.warn('⚠️ Sessão inválida:', error?.message);
        return { isValid: false, error: 'Sessão expirada ou inválida' };
      }
      
      console.log('✅ Usuário autenticado via sessão:', user.id);
      return { isValid: true, userId: user.id };
    }
    
    // Nenhum método de autenticação encontrado
    console.warn('⚠️ Nenhuma autenticação fornecida');
    return { isValid: false, error: 'Token de autenticação ou sessão necessários' };
    
  } catch (error: any) {
    console.error('❌ Erro na validação de autenticação:', error);
    return { isValid: false, error: 'Erro interno de autenticação' };
  }
}

/**
 * Função para validar se o usuário tem acesso ao bot
 */
async function validateBotAccess(userId: string, botId: string): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    console.log('🔍 Verificando acesso ao bot:', botId);
    
    const { data: bot, error } = await supabaseAdmin
      .from('bots')
      .select('id, owner_id')
      .eq('id', botId)
      .eq('owner_id', userId)
      .single();
    
    if (error || !bot) {
      console.warn('⚠️ Bot não encontrado ou acesso negado:', error?.message);
      return { hasAccess: false, error: 'Bot não encontrado ou acesso negado' };
    }
    
    console.log('✅ Acesso ao bot validado');
    return { hasAccess: true };
    
  } catch (error: any) {
    console.error('❌ Erro na validação de acesso ao bot:', error);
    return { hasAccess: false, error: 'Erro interno na validação de acesso' };
  }
}

/**
 * Função para validar o tipo do arquivo
 */
function validateFileType(fileName: string, mediaType: 'image' | 'video'): { isValid: boolean; error?: string } {
  try {
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
    
    return { isValid: true };
    
  } catch (error: any) {
    console.error('❌ Erro na validação do tipo de arquivo:', error);
    return { isValid: false, error: 'Erro na validação do tipo de arquivo' };
  }
}

/**
 * Função para validar o tamanho do arquivo
 */
function validateFileSize(fileSize: number, mediaType: 'image' | 'video'): { isValid: boolean; error?: string } {
  try {
    const maxSize = mediaType === 'image' ? CONFIG.MAX_IMAGE_SIZE : CONFIG.MAX_VIDEO_SIZE;
    
    if (fileSize > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return { 
        isValid: false, 
        error: `Tamanho máximo para ${mediaType === 'image' ? 'imagens' : 'vídeos'} é ${maxSizeMB}MB` 
      };
    }
    
    return { isValid: true };
    
  } catch (error: any) {
    console.error('❌ Erro na validação do tamanho do arquivo:', error);
    return { isValid: false, error: 'Erro na validação do tamanho do arquivo' };
  }
}

/**
 * Função para garantir que o bucket existe
 */
async function ensureBucketExists(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📦 Verificando existência do bucket...');
    
    // Tentar obter informações do bucket
    const { data: bucketInfo, error: bucketError } = await supabaseAdmin.storage.getBucket(CONFIG.BUCKET_NAME);
    
    if (bucketError && bucketError.message.includes('not found')) {
      console.log('📦 Criando bucket bot-media...');
      
      // Criar bucket se não existir
      const { error: createError } = await supabaseAdmin.storage.createBucket(CONFIG.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: CONFIG.ALLOWED_MIME_TYPES,
        fileSizeLimit: CONFIG.MAX_VIDEO_SIZE
      });
      
      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return { success: false, error: 'Erro ao configurar storage' };
      }
      
      console.log('✅ Bucket criado com sucesso');
    } else if (bucketError) {
      console.error('❌ Erro ao verificar bucket:', bucketError);
      return { success: false, error: 'Erro ao acessar storage' };
    } else {
      console.log('✅ Bucket já existe');
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Erro na gestão do bucket:', error);
    return { success: false, error: 'Erro interno do storage' };
  }
}

/**
 * Função para gerar URL assinado
 */
async function generateSignedUploadUrl(filePath: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔗 Gerando URL assinado para:', filePath);
    
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
      .createSignedUploadUrl(filePath, {
        upsert: false
      });
    
    if (signedError) {
      console.error('❌ Erro ao gerar URL assinado:', signedError);
      return { success: false, error: 'Erro ao gerar URL de upload' };
    }
    
    // Gerar URL pública que será usada após o upload
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log('✅ URL assinado gerado com sucesso');
    
    return {
      success: true,
      data: {
        uploadUrl: signedData.signedUrl,
        token: signedData.token,
        publicUrl: publicUrl,
        filePath: filePath
      }
    };
    
  } catch (error: any) {
    console.error('❌ Erro na geração da URL assinada:', error);
    return { success: false, error: 'Erro interno na geração da URL' };
  }
}

/**
 * Endpoint POST para gerar URL assinado para upload direto
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  console.log('📤 POST /api/media/upload: Iniciando geração de URL assinado');
  
  try {
    // 1. Validar autenticação
    const authResult = await validateAuthentication(request);
    if (!authResult.isValid) {
      console.warn('🚫 Acesso negado - não autenticado');
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    const userId = authResult.userId!;
    console.log('👤 Usuário autenticado:', userId);
    
    // 2. Validar e parsear corpo da requisição
    let body: UploadRequestBody;
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ Corpo da requisição inválido');
      return NextResponse.json({ 
        success: false, 
        error: 'Formato de dados inválido',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }
    
    const { fileName, fileSize, fileType, botId, mediaType } = body;
    
    // 3. Validar parâmetros obrigatórios
    if (!fileName || !botId || !mediaType || fileSize === undefined) {
      console.warn('⚠️ Parâmetros obrigatórios ausentes');
      return NextResponse.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: fileName, fileSize, botId, mediaType',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }
    
    // 4. Validar tipo de mídia
    if (mediaType !== 'image' && mediaType !== 'video') {
      console.warn('⚠️ Tipo de mídia inválido:', mediaType);
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de mídia deve ser "image" ou "video"',
        code: 'INVALID_MEDIA_TYPE'
      }, { status: 400 });
    }
    
    // 5. Validar acesso ao bot
    const botAccessResult = await validateBotAccess(userId, botId);
    if (!botAccessResult.hasAccess) {
      console.warn('🚫 Acesso negado ao bot:', botId);
      return NextResponse.json({
        success: false,
        error: botAccessResult.error || 'Acesso negado ao bot',
        code: 'BOT_ACCESS_DENIED'
      }, { status: 403 });
    }
    
    // 6. Validar tipo do arquivo
    const fileTypeResult = validateFileType(fileName, mediaType);
    if (!fileTypeResult.isValid) {
      console.warn('⚠️ Tipo de arquivo inválido:', fileName);
      return NextResponse.json({ 
        success: false, 
        error: fileTypeResult.error,
        code: 'INVALID_FILE_TYPE'
      }, { status: 400 });
    }
    
    // 7. Validar tamanho do arquivo
    const fileSizeResult = validateFileSize(fileSize, mediaType);
    if (!fileSizeResult.isValid) {
      console.warn('⚠️ Tamanho de arquivo inválido:', fileSize);
      return NextResponse.json({ 
        success: false, 
        error: fileSizeResult.error,
        code: 'FILE_TOO_LARGE'
      }, { status: 400 });
    }
    
    // 8. Garantir que o bucket existe
    const bucketResult = await ensureBucketExists();
    if (!bucketResult.success) {
      console.error('❌ Falha na configuração do bucket');
      return NextResponse.json({
        success: false,
        error: bucketResult.error || 'Erro na configuração do storage',
        code: 'STORAGE_ERROR'
      }, { status: 500 });
    }
    
    // 9. Gerar nome único e caminho do arquivo
      const fileExt = fileName.split('.').pop() || '';
    const uniqueFileName = `${mediaType}_${uuidv4()}.${fileExt}`;
    const filePath = `${botId}/${uniqueFileName}`;
    
    // 10. Gerar URL assinado
    const urlResult = await generateSignedUploadUrl(filePath);
    if (!urlResult.success) {
      console.error('❌ Falha na geração da URL assinada');
      return NextResponse.json({
        success: false,
        error: urlResult.error || 'Erro ao gerar URL de upload',
        code: 'URL_GENERATION_ERROR'
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ URL assinado gerado com sucesso em ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      data: urlResult.data,
      message: 'URL de upload gerado com sucesso'
    }, { status: 200 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Erro interno após ${duration}ms:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * Endpoint GET para confirmar upload e obter URL final
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  console.log('📥 GET /api/media/upload: Confirmando upload');
  
  try {
    // 1. Validar autenticação
    const authResult = await validateAuthentication(request);
    if (!authResult.isValid) {
      console.warn('🚫 Acesso negado - não autenticado');
        return NextResponse.json({ 
          success: false, 
        error: authResult.error || 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
        }, { status: 401 });
      }
      
    // 2. Obter parâmetros da URL
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const botId = searchParams.get('botId');
    
    if (!filePath) {
      console.warn('⚠️ Caminho do arquivo não fornecido');
      return NextResponse.json({
        success: false,
        error: 'Parâmetro filePath é obrigatório',
        code: 'MISSING_FILEPATH'
      }, { status: 400 });
    }
    
    if (!botId) {
      console.warn('⚠️ ID do bot não fornecido');
      return NextResponse.json({
        success: false,
        error: 'Parâmetro botId é obrigatório',
        code: 'MISSING_BOTID'
      }, { status: 400 });
    }
    
    // 3. Validar acesso ao bot
    const botAccessResult = await validateBotAccess(authResult.userId!, botId);
    if (!botAccessResult.hasAccess) {
      console.warn('🚫 Acesso negado ao bot:', botId);
      return NextResponse.json({
        success: false,
        error: botAccessResult.error || 'Acesso negado ao bot',
        code: 'BOT_ACCESS_DENIED'
      }, { status: 403 });
    }
    
    // 4. Verificar se o arquivo existe no storage
    const pathParts = filePath.split('/');
    if (pathParts.length < 2) {
      console.warn('⚠️ Formato de caminho inválido:', filePath);
      return NextResponse.json({
        success: false,
        error: 'Formato de caminho de arquivo inválido',
        code: 'INVALID_FILEPATH'
      }, { status: 400 });
    }
    
    const folderPath = pathParts[0];
    const fileName = pathParts[1];
    
    const { data, error } = await supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
      .list(folderPath, {
        search: fileName
        });
      
      if (error) {
      console.error('❌ Erro ao verificar arquivo no storage:', error);
        return NextResponse.json({ 
          success: false, 
        error: 'Erro ao verificar arquivo no storage',
        code: 'STORAGE_CHECK_ERROR'
        }, { status: 500 });
      }
      
    if (!data || data.length === 0) {
      console.warn('⚠️ Arquivo não encontrado no storage:', filePath);
      return NextResponse.json({
        success: false,
        error: 'Arquivo não encontrado no storage',
        code: 'FILE_NOT_FOUND'
      }, { status: 404 });
    }
    
    // 5. Obter URL pública do arquivo
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
        .getPublicUrl(filePath);
      
    const duration = Date.now() - startTime;
    console.log(`✅ Upload confirmado com sucesso em ${duration}ms:`, publicUrl);
      
      return NextResponse.json({
        success: true,
      data: {
        url: publicUrl,
        filePath: filePath
      },
      message: 'Upload confirmado com sucesso'
    }, { status: 200 });
    
    } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Erro interno após ${duration}ms:`, error);
      
      return NextResponse.json({ 
        success: false, 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * Endpoint DELETE para remover arquivo do storage
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  console.log('🗑️ DELETE /api/media/upload: Removendo arquivo');
  
  try {
    // 1. Validar autenticação
    const authResult = await validateAuthentication(request);
    if (!authResult.isValid) {
      console.warn('🚫 Acesso negado - não autenticado');
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    // 2. Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const botId = searchParams.get('botId');
    
    if (!filePath || !botId) {
      console.warn('⚠️ Parâmetros obrigatórios ausentes');
      return NextResponse.json({
        success: false,
        error: 'Parâmetros filePath e botId são obrigatórios',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }
    
    // 3. Validar acesso ao bot
    const botAccessResult = await validateBotAccess(authResult.userId!, botId);
    if (!botAccessResult.hasAccess) {
      console.warn('🚫 Acesso negado ao bot:', botId);
      return NextResponse.json({
        success: false,
        error: botAccessResult.error || 'Acesso negado ao bot',
        code: 'BOT_ACCESS_DENIED'
      }, { status: 403 });
    }
    
    // 4. Remover arquivo do storage
    const { error } = await supabaseAdmin.storage
      .from(CONFIG.BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('❌ Erro ao remover arquivo:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao remover arquivo do storage',
        code: 'DELETE_ERROR'
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Arquivo removido com sucesso em ${duration}ms:`, filePath);
    
    return NextResponse.json({
      success: true,
      message: 'Arquivo removido com sucesso'
    }, { status: 200 });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Erro interno após ${duration}ms:`, error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
} 