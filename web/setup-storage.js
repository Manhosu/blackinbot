#!/usr/bin/env node

/**
 * Script para configurar Supabase Storage para upload de vídeos
 * Executa: node setup-storage.js
 */

const https = require('https');

const config = {
  apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3025',
  setupPath: '/api/storage/setup'
};

function makeRequest(url, method = 'POST') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Storage-Setup-Script'
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: 'Invalid JSON response', raw: data } });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function setupStorage() {
  console.log('🔧 Configurando Supabase Storage para upload de vídeos...\n');

  try {
    const setupUrl = `${config.apiUrl}${config.setupPath}`;
    console.log(`📡 Fazendo requisição para: ${setupUrl}`);
    
    const response = await makeRequest(setupUrl, 'POST');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Supabase Storage configurado com sucesso!\n');
      console.log('📊 Configurações:');
      console.log(`   - Bucket: ${response.data.data.bucketName}`);
      console.log(`   - Tamanho máximo: ${response.data.data.maxFileSize}`);
      console.log(`   - Acesso público: ${response.data.data.publicAccess ? 'Sim' : 'Não'}`);
      console.log(`   - Tipos permitidos: ${response.data.data.allowedTypes.length} formatos`);
      console.log('\n🎉 O sistema está pronto para upload de vídeos até 25MB!');
    } else {
      console.error('❌ Erro na configuração do storage:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Erro: ${response.data.error || 'Erro desconhecido'}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro na comunicação com a API:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Certifique-se de que o servidor está rodando em:', config.apiUrl);
    process.exit(1);
  }
}

async function checkStorage() {
  console.log('📊 Verificando status do Supabase Storage...\n');

  try {
    const checkUrl = `${config.apiUrl}${config.setupPath}`;
    const response = await makeRequest(checkUrl, 'GET');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Storage já configurado e funcionando!\n');
      console.log('📊 Status atual:');
      console.log(`   - Bucket: ${response.data.data.bucketName}`);
      console.log(`   - Acesso funcionando: ${response.data.data.canAccess ? 'Sim' : 'Não'}`);
      console.log(`   - Público: ${response.data.data.isPublic ? 'Sim' : 'Não'}`);
      return true;
    } else {
      console.log('⚠️ Storage precisa ser configurado');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Não foi possível verificar o status do storage');
    return false;
  }
}

async function main() {
  console.log('🚀 Setup do Supabase Storage - Black In Bot\n');
  
  // Verificar variáveis de ambiente
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variáveis de ambiente não configuradas:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n💡 Configure essas variáveis no arquivo .env.local');
    process.exit(1);
  }

  try {
    // Primeiro verificar se já está configurado
    const isConfigured = await checkStorage();
    
    if (!isConfigured) {
      // Se não estiver, configurar
      await setupStorage();
    }
    
    console.log('\n✨ Pronto! Agora você pode fazer upload de vídeos até 25MB diretamente do painel.');
    console.log('🎬 O sistema usa upload direto para o Supabase, contornando o limite de 4MB do Vercel.');
    
  } catch (error) {
    console.error('\n❌ Erro durante o setup:', error.message);
    process.exit(1);
  }
}

// Executar o script
if (require.main === module) {
  main();
}

module.exports = { setupStorage, checkStorage }; 