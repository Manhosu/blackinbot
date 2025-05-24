import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Função para validar o tipo do arquivo
function isValidFileType(file: File, type: string): boolean {
  if (type === 'image') {
    return file.type.startsWith('image/');
  } else if (type === 'video') {
    return file.type.startsWith('video/');
  }
  return false;
}

// Endpoint para upload de arquivos
export async function POST(request: NextRequest) {
  console.log('📤 POST /api/media/upload: Iniciando upload de arquivo');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const botId = formData.get('bot_id') as string;
    const type = formData.get('type') as string;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhum arquivo enviado' 
      }, { status: 400 });
    }
    
    if (!botId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID do bot não fornecido' 
      }, { status: 400 });
    }
    
    if (!type || (type !== 'image' && type !== 'video')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de mídia inválido' 
      }, { status: 400 });
    }
    
    // Validar tipo do arquivo
    if (!isValidFileType(file, type)) {
      return NextResponse.json({ 
        success: false, 
        error: `Formato de ${type === 'image' ? 'imagem' : 'vídeo'} inválido` 
      }, { status: 400 });
    }
    
    // Verificar tamanho do arquivo (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: `O tamanho máximo do arquivo é 10MB` 
      }, { status: 400 });
    }
    
    // Em ambiente de desenvolvimento, simular sucesso sem realmente fazer upload
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Modo de desenvolvimento: simulando upload de arquivo');
      
      // Criar URL de arquivo simulada
      const fileName = file.name;
      const fileExt = fileName.split('.').pop() || '';
      const randomId = uuidv4().substring(0, 8);
      const simulatedUrl = `https://storage.example.com/${botId}/${type}_${randomId}.${fileExt}`;
      
      console.log('✅ Upload simulado com sucesso:', simulatedUrl);
      
      // Retornar URL simulada
      return NextResponse.json({
        success: true,
        url: simulatedUrl,
        message: 'Arquivo enviado com sucesso (simulado)'
      });
    }
    
    // Em produção, usar Supabase Storage para upload real
    try {
      // Autenticar usuário
      const cookieStore = cookies();
      const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'Usuário não autenticado' 
        }, { status: 401 });
      }
      
      // Preparar para upload
      const fileName = `${type}_${uuidv4()}`;
      const fileExt = file.name.split('.').pop() || '';
      const fullFileName = `${fileName}.${fileExt}`;
      const filePath = `${botId}/${fullFileName}`;
      
      // Converter File para ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Fazer upload para Supabase Storage
      const { data, error } = await supabaseClient.storage
        .from('bot-media')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false
        });
      
      if (error) {
        console.error('❌ Erro ao fazer upload:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
      
      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabaseClient.storage
        .from('bot-media')
        .getPublicUrl(filePath);
      
      console.log('✅ Upload realizado com sucesso:', publicUrl);
      
      return NextResponse.json({
        success: true,
        url: publicUrl,
        message: 'Arquivo enviado com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro no processo de upload:', error);
      
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Erro no servidor'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao processar requisição de upload:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro desconhecido'
    }, { status: 500 });
  }
} 