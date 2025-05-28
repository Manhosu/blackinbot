import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente admin do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    // 3. Configurar políticas RLS para o bucket
    console.log('🔐 Configurando políticas de acesso...');
    
    // Política para permitir inserção (upload)
    const insertPolicySQL = `
      DO $$
      BEGIN
        -- Remover política existente se houver
        DROP POLICY IF EXISTS "Usuários podem fazer upload" ON storage.objects;
        
        -- Criar nova política para upload
        CREATE POLICY "Usuários podem fazer upload" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'bot-media' 
            AND auth.role() = 'authenticated'
          );
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- Política já existe
      END
      $$;
    `;

    // Política para permitir leitura pública
    const selectPolicySQL = `
      DO $$
      BEGIN
        -- Remover política existente se houver
        DROP POLICY IF EXISTS "Acesso público para leitura" ON storage.objects;
        
        -- Criar nova política para leitura pública
        CREATE POLICY "Acesso público para leitura" ON storage.objects
          FOR SELECT USING (bucket_id = 'bot-media');
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- Política já existe
      END
      $$;
    `;

    // Política para permitir deleção pelos donos
    const deletePolicySQL = `
      DO $$
      BEGIN
        -- Remover política existente se houver
        DROP POLICY IF EXISTS "Usuários podem deletar próprios arquivos" ON storage.objects;
        
        -- Criar nova política para deleção
        CREATE POLICY "Usuários podem deletar próprios arquivos" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'bot-media' 
            AND auth.role() = 'authenticated'
            AND (metadata->>'botId')::text IN (
              SELECT id::text FROM bots WHERE user_id = auth.uid()
            )
          );
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- Política já existe
      END
      $$;
    `;

    // Executar políticas
    try {
      await supabaseAdmin.rpc('exec_sql', { sql_query: insertPolicySQL });
      await supabaseAdmin.rpc('exec_sql', { sql_query: selectPolicySQL });
      await supabaseAdmin.rpc('exec_sql', { sql_query: deletePolicySQL });
      console.log('✅ Políticas configuradas com sucesso');
    } catch (policyError: any) {
      console.warn('⚠️ Aviso na configuração de políticas:', policyError);
      // Não falhar se as políticas não puderem ser criadas via RPC
      // O bucket ainda funcionará com as configurações padrão
    }

    // 4. Testar o bucket
    console.log('🧪 Testando configuração do bucket...');
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

    console.log('✅ Configuração do Supabase Storage concluída');

    return NextResponse.json({
      success: true,
      message: 'Supabase Storage configurado com sucesso',
      data: {
        bucketName: BUCKET_NAME,
        bucketExists: true,
        allowedTypes: ALLOWED_MIME_TYPES,
        maxFileSize: '25MB',
        publicAccess: true
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
        canAccess: !testError
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