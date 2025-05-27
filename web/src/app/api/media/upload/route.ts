import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Cliente admin do Supabase para operações de storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para validar o tipo do arquivo
function isValidFileType(fileName: string, type: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  
  if (type === 'image') {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  } else if (type === 'video') {
    return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');
  }
  return false;
}

// Endpoint para gerar URL assinado para upload direto
export async function POST(request: NextRequest) {
  console.log('📤 POST /api/media/upload: Gerando URL assinado para upload direto');
  
  try {
    const body = await request.json();
    const { fileName, fileSize, fileType, botId, mediaType } = body;
    
    // Validações básicas
    if (!fileName || !botId || !mediaType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: fileName, botId, mediaType' 
      }, { status: 400 });
    }
    
    if (!mediaType || (mediaType !== 'image' && mediaType !== 'video')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de mídia inválido (image ou video)' 
      }, { status: 400 });
    }
    
    // Validar tipo do arquivo
    if (!isValidFileType(fileName, mediaType)) {
      const validTypes = mediaType === 'image' 
        ? 'jpg, jpeg, png, gif, webp' 
        : 'mp4, mov, avi, mkv, webm';
      return NextResponse.json({ 
        success: false, 
        error: `Formato de ${mediaType === 'image' ? 'imagem' : 'vídeo'} inválido. Tipos aceitos: ${validTypes}` 
      }, { status: 400 });
    }
    
    // Verificar tamanho do arquivo
    const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB para imagem, 100MB para vídeo
    if (fileSize && fileSize > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json({ 
        success: false, 
        error: `Tamanho máximo para ${mediaType === 'image' ? 'imagens' : 'vídeos'} é ${maxSizeMB}MB` 
      }, { status: 400 });
    }
    
    try {
      // Gerar nome único para o arquivo
      const fileExt = fileName.split('.').pop() || '';
      const uniqueFileName = `${mediaType}_${uuidv4()}.${fileExt}`;
      const filePath = `${botId}/${uniqueFileName}`;
      
      // Verificar/criar bucket se não existir
      const bucketName = 'bot-media';
      
      // Tentar obter info do bucket
      const { data: bucketInfo, error: bucketError } = await supabaseAdmin.storage.getBucket(bucketName);
      
      if (bucketError && bucketError.message.includes('not found')) {
        console.log('📦 Criando bucket bot-media...');
        
        // Criar bucket se não existir
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'
          ],
          fileSizeLimit: 100 * 1024 * 1024 // 100MB
        });
        
        if (createError) {
          console.error('❌ Erro ao criar bucket:', createError);
          return NextResponse.json({ 
            success: false, 
            error: 'Erro ao configurar storage' 
          }, { status: 500 });
        }
        
        console.log('✅ Bucket criado com sucesso');
      }
      
      // Gerar URL assinado para upload
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath, {
          upsert: false
        });
      
      if (signedError) {
        console.error('❌ Erro ao gerar URL assinado:', signedError);
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao gerar URL de upload' 
        }, { status: 500 });
      }
      
      // Gerar URL pública que será usada após o upload
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      console.log('✅ URL assinado gerado com sucesso para:', filePath);
      
      return NextResponse.json({
        success: true,
        uploadUrl: signedData.signedUrl,
        token: signedData.token,
        publicUrl: publicUrl,
        filePath: filePath,
        message: 'URL de upload gerado com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ Erro no processo de geração da URL:', error);
      
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Erro no servidor'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao processar requisição:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Endpoint GET para confirmar upload e obter URL final
export async function GET(request: NextRequest) {
  console.log('📥 GET /api/media/upload: Confirmando upload');
  
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    
    if (!filePath) {
      return NextResponse.json({ 
        success: false, 
        error: 'Caminho do arquivo não fornecido' 
      }, { status: 400 });
    }
    
    // Verificar se o arquivo existe no storage
    const bucketName = 'bot-media';
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1]
      });
    
    if (error || !data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Arquivo não encontrado no storage' 
      }, { status: 404 });
    }
    
    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log('✅ Upload confirmado:', publicUrl);
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Upload confirmado com sucesso'
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao confirmar upload:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro desconhecido'
    }, { status: 500 });
  }
} 