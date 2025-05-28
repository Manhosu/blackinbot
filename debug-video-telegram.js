// Debug específico para vídeos no Telegram
async function testVideoTelegram() {
  const botToken = '7661233806:AAFYxUXjS2N-7l_obGBvyWBSzTuMHLPZlI0';
  const chatId = '5173071848'; // Substitua pelo seu chat ID real
  
  console.log('🎬 TESTE ESPECÍFICO DE VÍDEO NO TELEGRAM');
  console.log('==========================================');
  
  // URLs de teste diferentes
  const testVideos = [
    'https://test-videos.co.uk/vids/mp4/mp4/SampleVideo_1280x720_1mb.mp4',
    'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4'
  ];
  
  for (let i = 0; i < testVideos.length; i++) {
    const videoUrl = testVideos[i];
    console.log(`\n📹 Teste ${i + 1}: ${videoUrl}`);
    
    try {
      // Teste 1: sendVideo básico
      console.log('  📤 Tentando sendVideo...');
      const videoResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          video: videoUrl,
          caption: `🎬 Teste de vídeo ${i + 1}`,
          parse_mode: 'Markdown'
        })
      });
      
      const videoResult = await videoResponse.json();
      console.log(`  📋 Resultado sendVideo:`, videoResult);
      
      if (videoResult.ok) {
        console.log(`  ✅ Vídeo ${i + 1} enviado com sucesso!`);
        break; // Se funcionou, não precisa testar os outros
      } else {
        console.log(`  ❌ Erro no vídeo ${i + 1}:`, videoResult.description);
        
        // Se falhou, tentar como documento
        console.log('  📄 Tentando como documento...');
        const docResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            document: videoUrl,
            caption: `📄 Documento de teste ${i + 1}`
          })
        });
        
        const docResult = await docResponse.json();
        console.log(`  📋 Resultado sendDocument:`, docResult);
      }
    } catch (error) {
      console.log(`  💥 Erro na requisição ${i + 1}:`, error.message);
    }
    
    // Aguardar 2 segundos entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Executar teste
testVideoTelegram().catch(console.error); 