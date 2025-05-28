import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Configurações do bucket
const BUCKET_NAME = 'bot-media';
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'
];

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Criar políticas RLS diretamente via SQL
 */
async function createStoragePolicies() {
  console.log('🔐 Configurando políticas RLS para Storage...');

  // Política para permitir upload público (sem autenticação para simplificar)
  const createUploadPolicy = `
    DROP POLICY IF EXISTS "Acesso público para upload de mídia" ON storage.objects;
    
    CREATE POLICY "Acesso público para upload de mídia" ON storage.objects
      FOR INSERT 
      WITH CHECK (bucket_id = 'bot-media');
  `;

  // Política para permitir leitura pública
  const createSelectPolicy = `
    DROP POLICY IF EXISTS "Acesso público para leitura de mídia" ON storage.objects;
    
    CREATE POLICY "Acesso público para leitura de mídia" ON storage.objects
      FOR SELECT 
      USING (bucket_id = 'bot-media');
  `;

  // Política para permitir atualização
  const createUpdatePolicy = `
    DROP POLICY IF EXISTS "Acesso público para atualização de mídia" ON storage.objects;
    
    CREATE POLICY "Acesso público para atualização de mídia" ON storage.objects
      FOR UPDATE 
      USING (bucket_id = 'bot-media');
  `;

  // Política para permitir deleção
  const createDeletePolicy = `
    DROP POLICY IF EXISTS "Acesso público para deleção de mídia" ON storage.objects;
    
    CREATE POLICY "Acesso público para deleção de mídia" ON storage.objects
      FOR DELETE 
      USING (bucket_id = 'bot-media');
  `;

  try {
    // Executar cada política separadamente
    await supabaseAdmin.rpc('exec_sql', { sql_query: createUploadPolicy });
    console.log('✅ Política de upload criada');

    await supabaseAdmin.rpc('exec_sql', { sql_query: createSelectPolicy });
    console.log('✅ Política de leitura criada');

    await supabaseAdmin.rpc('exec_sql', { sql_query: createUpdatePolicy });
    console.log('✅ Política de atualização criada');

    await supabaseAdmin.rpc('exec_sql', { sql_query: createDeletePolicy });
    console.log('✅ Política de deleção criada');

    return true;
  } catch (error: any) {
    console.warn('⚠️ Erro ao criar políticas RLS (será usado sem RLS):', error.message);
    // Não falhar se as políticas não puderem ser criadas
    return false;
  }
}

/**
 * Configurar bucket para upload de mídia
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  console.log('🔧 Configurando Supabase Storage para upload de vídeos...');

  try {
    // 1. Verificar se o bucket existe
    console.log('📦 Verificando existência do bucket...');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar buckets existentes'
      }, { status: 500 });
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // 2. Criar bucket se não existir
      console.log('📦 Criando bucket bot-media...');
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        fileSizeLimit: 26214400 // 25MB em bytes
      });
      
      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return NextResponse.json({
          success: false,
          error: `Erro ao criar bucket: ${createError.message}`
        }, { status: 500 });
      }
      
      console.log('✅ Bucket criado com sucesso');
    } else {
      console.log('✅ Bucket já existe');
    }

    // 3. Configurar políticas RLS
    const policiesCreated = await createStoragePolicies();
    
    if (policiesCreated) {
      console.log('✅ Políticas RLS configuradas');
    } else {
      console.log('⚠️ Usando bucket sem RLS (ainda funcionará)');
    }

    // 4. Testar o bucket com upload de teste
    console.log('🧪 Testando configuração do bucket...');
    
    // Testar listagem
    const { data: testList, error: testError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (testError) {
      console.error('❌ Erro no teste do bucket:', testError);
      return NextResponse.json({
        success: false,
        error: `Bucket criado mas não está funcionando: ${testError.message}`
      }, { status: 500 });
    }

    // 5. Testar upload de arquivo pequeno
    const testFileContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header
    const testFileName = `test/upload_test_${Date.now()}.png`;
    
    const { data: uploadTest, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(testFileName, testFileContent, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.warn('⚠️ Aviso no teste de upload:', uploadError.message);
    } else {
      console.log('✅ Teste de upload funcionando');
      
      // Remover arquivo de teste
      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([testFileName]);
    }

    console.log('✅ Configuração do Supabase Storage concluída');

    return NextResponse.json({
      success: true,
      message: 'Supabase Storage configurado com sucesso',
      data: {
        bucketName: BUCKET_NAME,
        bucketExists: true,
        allowedTypes: ALLOWED_MIME_TYPES,
        maxFileSize: '25MB',
        publicAccess: true,
        rlsPolicies: policiesCreated,
        uploadTest: uploadTest ? 'Funcionando' : 'Com avisos'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na configuração do storage:', error);
    return NextResponse.json({
      success: false,
      error: `Erro interno: ${error.message}`
    }, { status: 500 });
  }
}

/**
 * Verificar status do bucket
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  console.log('📊 Verificando status do Supabase Storage...');

  try {
    // Verificar se o bucket existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar buckets'
      }, { status: 500 });
    }

    const bucket = buckets?.find(b => b.name === BUCKET_NAME);
    
    if (!bucket) {
      return NextResponse.json({
        success: false,
        message: 'Bucket não encontrado - execute POST para criar',
        data: { bucketExists: false }
      });
    }

    // Testar acesso ao bucket
    const { data: testList, error: testError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    // Verificar espaço usado
    let totalFiles = 0;
    let totalSize = 0;
    
    try {
      const { data: allFiles } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      
      if (allFiles) {
        totalFiles = allFiles.length;
        totalSize = allFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      }
    } catch (e) {
      console.warn('⚠️ Não foi possível calcular estatísticas do bucket');
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket configurado e funcionando',
      data: {
        bucketName: BUCKET_NAME,
        bucketExists: true,
        bucketId: bucket.id,
        isPublic: bucket.public,
        allowedTypes: ALLOWED_MIME_TYPES,
        maxFileSize: '25MB',
        canAccess: !testError,
        stats: {
          totalFiles,
          totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
        },
        lastCheck: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na verificação do storage:', error);
    return NextResponse.json({
      success: false,
      error: `Erro interno: ${error.message}`
    }, { status: 500 });
  }
} 