#!/usr/bin/env node

/**
 * Script para configurar Supabase Storage para upload de vídeos
 * Executa: node setup-storage.js
 * 
 * Este script:
 * 1. Verifica se o bucket já existe
 * 2. Cria o bucket se necessário
 * 3. Configura políticas RLS
 * 4. Testa o funcionamento
 */

const https = require('https');
const http = require('http');

const config = {
  apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3025',
  setupPath: '/api/storage/setup'
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, method = 'POST', timeout = 30000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const defaultPort = urlObj.protocol === 'https:' ? 443 : 80;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || defaultPort,
      path: urlObj.pathname,
      method: method,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Storage-Setup-Script/1.0',
        'Accept': 'application/json'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: result,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: { error: 'Invalid JSON response', raw: data.substring(0, 500) },
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout - server may be slow or offline'));
    });

    req.end();
  });
}

async function checkEnvironment() {
  colorLog('cyan', '\n🔍 Verificando variáveis de ambiente...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    colorLog('red', '❌ Variáveis de ambiente não configuradas:');
    missing.forEach(varName => {
      colorLog('red', `   - ${varName}`);
    });
    colorLog('yellow', '\n💡 Configure essas variáveis no arquivo .env.local');
    return false;
  }
  
  colorLog('green', '✅ Todas as variáveis de ambiente estão configuradas');
  return true;
}

async function checkServerHealth() {
  colorLog('cyan', '\n🏥 Verificando se o servidor está online...');
  
  try {
    const healthUrl = `${config.apiUrl}/api/health`;
    const response = await makeRequest(healthUrl, 'GET', 10000);
    
    if (response.status === 200) {
      colorLog('green', '✅ Servidor online e respondendo');
      return true;
    } else {
      colorLog('yellow', `⚠️ Servidor respondeu com status ${response.status}`);
      return true; // Continuar mesmo assim
    }
  } catch (error) {
    colorLog('yellow', `⚠️ Não foi possível verificar o servidor: ${error.message}`);
    colorLog('yellow', '   Continuando mesmo assim...');
    return true; // Continuar mesmo assim
  }
}

async function checkStorageStatus() {
  colorLog('cyan', '\n📊 Verificando status atual do storage...');

  try {
    const checkUrl = `${config.apiUrl}${config.setupPath}`;
    const response = await makeRequest(checkUrl, 'GET', 20000);
    
    if (response.status === 200 && response.data.success) {
      colorLog('green', '✅ Storage já configurado e funcionando!');
      
      const data = response.data.data;
      console.log('\n📊 Status atual:');
      console.log(`   - Bucket: ${data.bucketName}`);
      console.log(`   - Público: ${data.isPublic ? 'Sim' : 'Não'}`);
      console.log(`   - Pode acessar: ${data.canAccess ? 'Sim' : 'Não'}`);
      console.log(`   - Máximo por arquivo: ${data.maxFileSize}`);
      
      if (data.stats) {
        console.log(`   - Arquivos armazenados: ${data.stats.totalFiles}`);
        console.log(`   - Espaço usado: ${data.stats.totalSizeMB}MB`);
      }
      
      return true;
    } else {
      colorLog('yellow', '⚠️ Storage precisa ser configurado');
      if (response.data.error) {
        console.log(`   Erro: ${response.data.error}`);
      }
      return false;
    }
  } catch (error) {
    colorLog('yellow', '⚠️ Não foi possível verificar o status do storage');
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

async function setupStorage() {
  colorLog('cyan', '\n🔧 Configurando Supabase Storage...');

  try {
    const setupUrl = `${config.apiUrl}${config.setupPath}`;
    colorLog('blue', `📡 Fazendo requisição para: ${setupUrl}`);
    
    const response = await makeRequest(setupUrl, 'POST', 60000); // 1 minuto timeout
    
    if (response.status === 200 && response.data.success) {
      colorLog('green', '✅ Supabase Storage configurado com sucesso!');
      
      const data = response.data.data;
      console.log('\n📊 Configurações aplicadas:');
      console.log(`   - Bucket: ${data.bucketName}`);
      console.log(`   - Tamanho máximo: ${data.maxFileSize}`);
      console.log(`   - Acesso público: ${data.publicAccess ? 'Sim' : 'Não'}`);
      console.log(`   - Políticas RLS: ${data.rlsPolicies ? 'Configuradas' : 'Usando padrão'}`);
      console.log(`   - Teste de upload: ${data.uploadTest}`);
      console.log(`   - Tipos permitidos: ${data.allowedTypes.length} formatos`);
      
      colorLog('green', '\n🎉 Sistema pronto para upload de vídeos até 25MB!');
      return true;
      
    } else {
      colorLog('red', '❌ Erro na configuração do storage:');
      console.log(`   Status HTTP: ${response.status}`);
      console.log(`   Erro: ${response.data.error || 'Erro desconhecido'}`);
      
      if (response.data.raw) {
        console.log(`   Resposta raw: ${response.data.raw.substring(0, 200)}`);
      }
      
      return false;
    }
  } catch (error) {
    colorLog('red', '❌ Erro na comunicação com a API:');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('timeout')) {
      colorLog('yellow', '\n💡 Dica: O setup pode demorar alguns minutos na primeira vez');
    }
    
    colorLog('yellow', '\n💡 Certifique-se de que:');
    console.log('   - O servidor está rodando em:', config.apiUrl);
    console.log('   - As variáveis de ambiente estão configuradas');
    console.log('   - O Supabase está acessível');
    
    return false;
  }
}

async function showFinalInstructions() {
  colorLog('cyan', '\n📋 Próximos passos:');
  console.log('   1. ✅ O sistema está configurado para upload direto');
  console.log('   2. 🎬 Agora você pode enviar vídeos até 25MB pelo painel');
  console.log('   3. 🚀 O upload acontece direto do navegador para o Supabase');
  console.log('   4. 📱 Os vídeos funcionarão automaticamente no Telegram');
  
  colorLog('magenta', '\n🔧 Tecnologia utilizada:');
  console.log('   - Upload direto para Supabase Storage');
  console.log('   - Contorna o limite de 4MB do Vercel');
  console.log('   - URLs públicas otimizadas');
  console.log('   - Políticas de segurança configuradas');
  
  colorLog('green', '\n✨ Configuração concluída com sucesso!');
}

async function main() {
  colorLog('bright', '🚀 Setup do Supabase Storage - Black In Bot');
  colorLog('blue', '📦 Configurando upload de vídeos até 25MB\n');
  
  try {
    // 1. Verificar ambiente
    const envOk = await checkEnvironment();
    if (!envOk) {
      process.exit(1);
    }
    
    // 2. Verificar servidor
    await checkServerHealth();
    
    // 3. Verificar se já está configurado
    const isConfigured = await checkStorageStatus();
    
    // 4. Configurar se necessário
    if (!isConfigured) {
      const setupOk = await setupStorage();
      if (!setupOk) {
        process.exit(1);
      }
    }
    
    // 5. Mostrar instruções finais
    await showFinalInstructions();
    
  } catch (error) {
    colorLog('red', '\n❌ Erro inesperado durante o setup:');
    console.error(error);
    process.exit(1);
  }
}

// Verificar se é execução direta
if (require.main === module) {
  main().catch((error) => {
    colorLog('red', '\n💥 Erro crítico:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { 
  setupStorage, 
  checkStorageStatus,
  checkEnvironment,
  config
}; 