#!/usr/bin/env node

/**
 * Script simples para testar configuração do Supabase Storage
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Testando configuração do Supabase Storage...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('✅ Variáveis de ambiente carregadas');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Service Key:', supabaseServiceKey ? 'Configurada' : 'Não configurada');

// Cliente admin do Supabase
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'bot-media';

async function testStorage() {
  try {
    console.log('\n📦 Verificando buckets existentes...');
    
    // Listar buckets
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return false;
    }
    
    console.log(`✅ Encontrados ${buckets.length} buckets`);
    
    const botMediaBucket = buckets.find(bucket => bucket.name === BUCKET_NAME);
    
    if (botMediaBucket) {
      console.log(`✅ Bucket '${BUCKET_NAME}' já existe`);
      console.log(`   - ID: ${botMediaBucket.id}`);
      console.log(`   - Público: ${botMediaBucket.public ? 'Sim' : 'Não'}`);
    } else {
      console.log(`⚠️ Bucket '${BUCKET_NAME}' não existe - criando...`);
      
      // Criar bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: [
          'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm',
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
        ],
        fileSizeLimit: 26214400 // 25MB
      });
      
      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return false;
      }
      
      console.log('✅ Bucket criado com sucesso');
    }
    
    // Testar acesso ao bucket
    console.log('\n🧪 Testando acesso ao bucket...');
    const { data: testList, error: testError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list('', { limit: 5 });
    
    if (testError) {
      console.error('❌ Erro no teste de acesso:', testError);
      return false;
    }
    
    console.log(`✅ Acesso funcionando - ${testList.length} arquivos encontrados`);
    
    // Testar upload de arquivo pequeno
    console.log('\n📤 Testando upload...');
    const testContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header
    const testFileName = `test/upload_test_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(testFileName, testContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });
    
    if (uploadError) {
      console.error('❌ Erro no teste de upload:', uploadError);
      return false;
    }
    
    console.log('✅ Upload funcionando');
    
    // Testar URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);
    
    console.log('🌐 URL pública gerada:', urlData.publicUrl);
    
    // Limpar arquivo de teste
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([testFileName]);
    
    console.log('🧹 Arquivo de teste removido');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  }
}

async function main() {
  const success = await testStorage();
  
  if (success) {
    console.log('\n🎉 Configuração do Supabase Storage está funcionando!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. ✅ O bucket está configurado e acessível');
    console.log('   2. 🎬 Agora você pode fazer upload de vídeos até 25MB');
    console.log('   3. 🚀 O sistema está pronto para produção');
  } else {
    console.log('\n❌ Configuração falhou - verifique os erros acima');
    process.exit(1);
  }
}

main().catch(console.error); 