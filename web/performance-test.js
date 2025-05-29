// 🚀 Teste de Performance - Navegação de Bots
// Rode no console do navegador para medir tempos

console.log('🔍 Iniciando teste de performance...');

// Função para medir tempo de carregamento
function measurePageLoad() {
  const start = performance.now();
  
  // Observar quando o DOM está pronto
  const observer = new MutationObserver(() => {
    const botCards = document.querySelectorAll('[class*="glass"]');
    if (botCards.length > 0) {
      const end = performance.now();
      console.log(`⚡ Lista de bots carregada em: ${(end - start).toFixed(2)}ms`);
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Função para medir clique em bot
function measureBotClick() {
  const botCards = document.querySelectorAll('[class*="glass"]');
  if (botCards.length > 0) {
    const firstBot = botCards[0];
    const start = performance.now();
    
    // Simular clique
    firstBot.click();
    
    // Observar navegação
    const observer = new MutationObserver(() => {
      const detailsPage = document.querySelector('h1');
      if (detailsPage && detailsPage.textContent !== 'Seus Bots') {
        const end = performance.now();
        console.log(`🚀 Navegação para bot concluída em: ${(end - start).toFixed(2)}ms`);
        observer.disconnect();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Função para testar cache
function testCache() {
  const cacheKeys = Object.keys(localStorage).filter(key => 
    key.includes('bot_') || key.includes('my_bots_cache')
  );
  
  console.log('📦 Itens no cache:');
  cacheKeys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    const age = Date.now() - (data._cached_at || 0);
    console.log(`  ${key}: ${(age / 1000).toFixed(0)}s atrás`);
  });
}

// Executar testes
measurePageLoad();
testCache();

console.log('📋 Comandos disponíveis:');
console.log('  measureBotClick() - Medir tempo de clique em bot');
console.log('  testCache() - Verificar cache');
console.log('  measurePageLoad() - Medir carregamento da página'); 