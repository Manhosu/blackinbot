#!/usr/bin/env node

/**
 * Script de teste para a nova API de ativação via link
 * 
 * Como usar:
 * node test_novo_sistema.js
 */

const testGroupLinks = [
  'https://t.me/+ABC123DEF456',
  'https://t.me/joinchat/ABC123DEF456',
  'https://t.me/meugrupo',
  '@meugrupo',
  '-100123456789',
  '-123456789'
];

console.log('🧪 Testando extração de IDs de grupo...\n');

// Função de extração copiada da API
function extractGroupIdFromLink(link) {
  const cleanLink = link.trim();

  // Se já é um ID direto (negativo para grupos)
  if (/^-?\d+$/.test(cleanLink)) {
    return cleanLink;
  }

  // Extrair de links de convite
  const inviteMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]+)/);
  if (inviteMatch) {
    return inviteMatch[1];
  }

  // Para grupos públicos (@username) - incluindo links com @
  if (cleanLink.startsWith('@')) {
    return cleanLink;
  }
  
  const usernameMatch = cleanLink.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z0-9_]+)/);
  if (usernameMatch) {
    return `@${usernameMatch[1]}`;
  }

  return null;
}

// Testar cada formato
testGroupLinks.forEach((link, index) => {
  const result = extractGroupIdFromLink(link);
  console.log(`${index + 1}. Link: ${link}`);
  console.log(`   Resultado: ${result || 'ERRO - Não reconhecido'}`);
  console.log(`   Status: ${result ? '✅ Válido' : '❌ Inválido'}\n`);
});

console.log('🎯 Teste de validação de formatos concluído!');
console.log('\n📋 Próximos passos para testar em produção:');
console.log('1. Crie um bot no BotFather');
console.log('2. Adicione o bot a um grupo como admin');
console.log('3. Copie o link do grupo');
console.log('4. Use a interface /dashboard/bots/[id]/activate');
console.log('5. Escolha "Ativação Automática" e cole o link');
console.log('6. Verifique se o bot envia a mensagem de boas-vindas');

// Testar se a API está acessível
async function testAPIEndpoint() {
  try {
    const response = await fetch('http://localhost:3025/api/test-env');
    if (response.ok) {
      console.log('\n✅ Servidor local está funcionando na porta 3025');
    } else {
      console.log('\n⚠️ Servidor respondeu mas com erro:', response.status);
    }
  } catch (error) {
    console.log('\n❌ Servidor não está acessível:', error.message);
    console.log('Execute: npm run dev (dentro da pasta web)');
  }
}

// Executar teste da API se fetch estiver disponível
if (typeof fetch !== 'undefined') {
  testAPIEndpoint();
} else {
  console.log('\n💡 Para testar a API, execute este script com Node.js 18+');
} 