import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usando a chave de service role permite operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    // Listar buckets existentes
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Erro ao listar buckets:', listError);
      return NextResponse.json({ 
        error: 'Erro ao listar buckets', 
        details: listError.message 
      }, { status: 500 });
    }
    
    // Verificar se o bucket já existe
    const bucketExists = existingBuckets.some(bucket => bucket.name === 'bot-avatars');
    
    if (bucketExists) {
      return NextResponse.json({ 
        message: 'Bucket já existe', 
        buckets: existingBuckets 
      });
    }
    
    // Criar o bucket bot-avatars
    const { data, error } = await supabaseAdmin.storage.createBucket('bot-avatars', {
      public: true // Tornar o bucket público
    });
    
    if (error) {
      console.error('Erro ao criar bucket:', error);
      return NextResponse.json({ 
        error: 'Erro ao criar bucket', 
        details: error.message 
      }, { status: 500 });
    }
    
    // Adicionar políticas ao bucket
    try {
      // Política para permitir leitura pública
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'bot-avatars',
        policy_name: 'Public Read',
        definition: 'bucket_id = \'bot-avatars\'',
        operation: 'SELECT'
      });
      
      // Política para permitir upload por usuários autenticados
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'bot-avatars',
        policy_name: 'Auth Insert',
        definition: 'bucket_id = \'bot-avatars\'',
        operation: 'INSERT',
        role: 'authenticated'
      });
    } catch (policyError: any) {
      console.error('Erro ao criar políticas (continuando):', policyError);
    }
    
    // Listar buckets novamente para confirmar
    const { data: updatedBuckets } = await supabaseAdmin.storage.listBuckets();
    
    return NextResponse.json({ 
      message: 'Bucket criado com sucesso', 
      created: data, 
      buckets: updatedBuckets 
    });
  } catch (err: any) {
    console.error('Erro geral:', err);
    return NextResponse.json({ 
      error: 'Erro ao processar requisição', 
      details: err.message 
    }, { status: 500 });
  }
} 