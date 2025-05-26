#!/usr/bin/env python3
"""
Script para configurar webhooks após deploy no Vercel
Atualizado para usar sistema baseado em botId
"""

import asyncio
import aiohttp
import logging
import os
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

class VercelWebhookSetup:
    def __init__(self, vercel_url: str):
        """
        Inicializa configurador de webhooks para Vercel
        
        Args:
            vercel_url: URL do projeto na Vercel (ex: https://seu-app.vercel.app)
        """
        self.vercel_url = vercel_url.rstrip('/')
        
    async def buscar_bots(self) -> list:
        """Busca todos os bots do banco de dados"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.vercel_url}/api/telegram/bots") as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            return data.get('bots', [])
                    return []
        except Exception as e:
            logger.error(f"Erro ao buscar bots: {e}")
            return []
    
    async def configurar_webhook_bot(self, bot_id: str, bot_name: str) -> bool:
        """Configura webhook para um bot específico"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "bot_id": bot_id,
                    "webhook_url": self.vercel_url
                }
                
                async with session.post(
                    f"{self.vercel_url}/api/telegram/setup-webhook",
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            result = data.get('results', [{}])[0]
                            if result.get('success'):
                                logger.info(f"✅ Webhook configurado para bot {bot_name}")
                                logger.info(f"   URL: {result.get('webhook_url')}")
                                return True
                            else:
                                logger.error(f"❌ Erro para bot {bot_name}: {result.get('error')}")
                                return False
                        else:
                            logger.error(f"❌ Falha na resposta para bot {bot_name}")
                            return False
                    else:
                        logger.error(f"❌ Status {response.status} para bot {bot_name}")
                        return False
                    
        except Exception as e:
            logger.error(f"❌ Erro ao configurar webhook para bot {bot_name}: {e}")
            return False
    
    async def verificar_webhook_bot(self, bot_id: str, bot_name: str) -> dict:
        """Verifica status do webhook de um bot"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.vercel_url}/api/telegram/setup-webhook?bot_id={bot_id}"
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            bots = data.get('bots', [])
                            if bots:
                                return bots[0]
                    return {'error': 'Falha ao verificar webhook'}
                    
        except Exception as e:
            return {'error': str(e)}
    
    async def configurar_todos_webhooks(self):
        """Configura webhooks para todos os bots"""
        logger.info("🚀 Iniciando configuração de webhooks no Vercel...")
        logger.info(f"🌐 URL da aplicação: {self.vercel_url}")
        
        # Buscar bots
        bots = await self.buscar_bots()
        
        if not bots:
            logger.warning("⚠️ Nenhum bot encontrado no banco de dados")
            return
        
        logger.info(f"📋 Encontrados {len(bots)} bots para configurar")
        
        success_count = 0
        
        # Configurar cada bot
        for bot in bots:
            bot_id = bot.get('bot_id')
            bot_name = bot.get('bot_name')
            
            logger.info(f"\n🔧 Configurando bot: {bot_name}")
            
            success = await self.configurar_webhook_bot(bot_id, bot_name)
            if success:
                success_count += 1
                
                # Verificar se foi configurado corretamente
                status = await self.verificar_webhook_bot(bot_id, bot_name)
                if 'error' not in status:
                    logger.info(f"   ✅ Webhook ativo: {status.get('webhook_active', False)}")
                    logger.info(f"   📡 URL: {status.get('webhook_url', 'N/A')}")
                else:
                    logger.warning(f"   ⚠️ Erro na verificação: {status['error']}")
        
        logger.info(f"\n🎉 Configuração concluída!")
        logger.info(f"   ✅ {success_count}/{len(bots)} webhooks configurados com sucesso")
        
        if success_count == len(bots):
            logger.info("🎊 Todos os webhooks foram configurados com sucesso!")
            logger.info("🚀 Seu sistema está pronto para receber updates do Telegram!")
        else:
            logger.warning("⚠️ Alguns webhooks falharam. Verifique os logs acima.")
    
    async def listar_status_webhooks(self):
        """Lista o status de todos os webhooks"""
        logger.info("📊 Verificando status dos webhooks...")
        
        bots = await self.buscar_bots()
        
        if not bots:
            logger.warning("⚠️ Nenhum bot encontrado")
            return
        
        logger.info(f"📋 Verificando {len(bots)} bots:")
        
        for bot in bots:
            bot_id = bot.get('bot_id')
            bot_name = bot.get('bot_name')
            
            status = await self.verificar_webhook_bot(bot_id, bot_name)
            
            if 'error' not in status:
                active = status.get('webhook_active', False)
                url = status.get('webhook_url', 'N/A')
                status_icon = "✅" if active else "❌"
                
                logger.info(f"   {status_icon} {bot_name}")
                logger.info(f"      URL: {url}")
                logger.info(f"      Ativo: {active}")
            else:
                logger.error(f"   ❌ {bot_name}: {status['error']}")

async def main():
    """Função principal"""
    
    # Obter URL da Vercel
    vercel_url = os.getenv('VERCEL_URL') or os.getenv('WEBHOOK_DOMAIN')
    
    if not vercel_url:
        logger.error("❌ VERCEL_URL ou WEBHOOK_DOMAIN não configurado!")
        logger.info("💡 Configure a variável de ambiente VERCEL_URL com a URL do seu projeto:")
        logger.info("   export VERCEL_URL=https://seu-app.vercel.app")
        return
    
    # Garantir que tem https://
    if not vercel_url.startswith('https://'):
        vercel_url = f"https://{vercel_url}"
    
    setup = VercelWebhookSetup(vercel_url)
    
    # Escolher ação
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'status':
        await setup.listar_status_webhooks()
    else:
        await setup.configurar_todos_webhooks()

if __name__ == "__main__":
    # Executar configuração
    asyncio.run(main()) 