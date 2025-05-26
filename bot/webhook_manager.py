"""
Gerenciador de Webhooks para múltiplos bots do Telegram
Substitui o polling por webhook para produção
"""

import asyncio
import os
import logging
from typing import Dict, List, Optional
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
from telegram import Update
from telegram.ext import ContextTypes
import aiohttp
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

class WebhookManager:
    def __init__(self, domain: str, api_base_url: str):
        """
        Inicializa o gerenciador de webhooks
        
        Args:
            domain: Domínio da aplicação (ex: https://seu-app.vercel.app)
            api_base_url: URL base da API (ex: http://localhost:3025)
        """
        self.domain = domain.rstrip('/')
        self.api_base_url = api_base_url.rstrip('/')
        self.bots: Dict[str, Application] = {}
        
    async def buscar_bots_do_banco(self) -> List[Dict]:
        """Busca todos os bots ativos do banco de dados via API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_base_url}/api/telegram/bots") as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            return data.get('bots', [])
                    return []
        except Exception as e:
            logger.error(f"Erro ao buscar bots do banco: {e}")
            return []
    
    async def configurar_webhook_para_bot(self, bot_token: str, bot_id: str) -> bool:
        """Configura webhook para um bot específico usando botId"""
        try:
            webhook_url = f"{self.domain}/api/webhook/{bot_id}"
            
            async with aiohttp.ClientSession() as session:
                payload = {
                    "bot_id": bot_id,
                    "webhook_url": self.domain
                }
                
                async with session.post(
                    f"{self.api_base_url}/api/telegram/setup-webhook",
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('success', False)
                    return False
                    
        except Exception as e:
            logger.error(f"Erro ao configurar webhook para bot {bot_id}: {e}")
            return False
    
    async def inicializar_bot(self, bot_config: Dict) -> Optional[Application]:
        """Inicializa um bot individual com webhook"""
        try:
            token = bot_config.get('token')
            bot_id = bot_config.get('bot_id')
            bot_name = bot_config.get('bot_name', 'Unknown')
            
            if not token:
                logger.error(f"Token não encontrado para bot {bot_name}")
                return None
            
            logger.info(f"🤖 Inicializando bot: {bot_name}")
            
            # Criar aplicação do bot
            application = Application.builder().token(token).build()
            
            # Adicionar handlers (estes serão processados via webhook, não diretamente)
            # Os handlers reais estão na API Next.js, mas podemos manter para compatibilidade
            application.add_handler(CommandHandler("start", self.handle_start))
            application.add_handler(CallbackQueryHandler(self.handle_callback))
            application.add_handler(MessageHandler(
                filters.TEXT & ~filters.COMMAND, 
                self.handle_message
            ))
            
            # Configurar webhook
            webhook_configured = await self.configurar_webhook_para_bot(token, bot_id)
            
            if webhook_configured:
                logger.info(f"✅ Webhook configurado para bot {bot_name}")
                
                # Inicializar aplicação sem polling
                await application.initialize()
                await application.start()
                
                return application
            else:
                logger.error(f"❌ Falha ao configurar webhook para bot {bot_name}")
                return None
                
        except Exception as e:
            logger.error(f"Erro ao inicializar bot {bot_config.get('bot_name', 'Unknown')}: {e}")
            return None
    
    async def handle_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handler para comando /start (fallback - processamento real é na API)"""
        logger.info(f"📱 Comando /start recebido via fallback: {update.effective_user.id}")
        # Na produção, isso será processado pela API Next.js
        
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handler para callbacks (fallback - processamento real é na API)"""
        logger.info(f"💎 Callback recebido via fallback: {update.callback_query.data}")
        # Na produção, isso será processado pela API Next.js
        
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handler para mensagens (fallback - processamento real é na API)"""
        logger.info(f"📨 Mensagem recebida via fallback: {update.message.text}")
        # Na produção, isso será processado pela API Next.js
    
    async def inicializar_todos_os_bots(self):
        """Inicializa todos os bots do banco de dados"""
        logger.info("🚀 Iniciando configuração de webhooks para todos os bots...")
        
        # Buscar bots do banco
        bots_config = await self.buscar_bots_do_banco()
        
        if not bots_config:
            logger.warning("⚠️ Nenhum bot encontrado no banco de dados")
            return
        
        logger.info(f"📋 Encontrados {len(bots_config)} bots para configurar")
        
        # Inicializar cada bot
        for bot_config in bots_config:
            bot_name = bot_config.get('bot_name', 'Unknown')
            bot_id = bot_config.get('bot_id')
            
            try:
                application = await self.inicializar_bot(bot_config)
                if application:
                    self.bots[bot_id] = application
                    logger.info(f"✅ Bot {bot_name} inicializado com sucesso")
                else:
                    logger.error(f"❌ Falha ao inicializar bot {bot_name}")
            except Exception as e:
                logger.error(f"❌ Erro ao inicializar bot {bot_name}: {e}")
        
        logger.info(f"🎉 Configuração concluída! {len(self.bots)} bots ativos com webhook")
    
    async def parar_todos_os_bots(self):
        """Para todos os bots"""
        logger.info("🔄 Parando todos os bots...")
        
        for bot_id, application in self.bots.items():
            try:
                await application.stop()
                await application.shutdown()
                logger.info(f"✅ Bot {bot_id} parado")
            except Exception as e:
                logger.error(f"❌ Erro ao parar bot {bot_id}: {e}")
        
        self.bots.clear()
        logger.info("🏁 Todos os bots foram parados")
    
    def status(self):
        """Retorna status dos bots"""
        return {
            'total_bots': len(self.bots),
            'bots_ativos': list(self.bots.keys()),
            'domain': self.domain,
            'api_base_url': self.api_base_url
        }

async def main():
    """Função principal para executar o gerenciador de webhooks"""
    
    # Configurações
    DOMAIN = os.getenv('WEBHOOK_DOMAIN', 'https://seu-app.vercel.app')
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3025')
    
    # Criar gerenciador
    manager = WebhookManager(DOMAIN, API_BASE_URL)
    
    try:
        # Inicializar todos os bots
        await manager.inicializar_todos_os_bots()
        
        # Exibir status
        status = manager.status()
        logger.info(f"📊 Status: {status}")
        
        # Manter rodando (em produção, isso não é necessário pois o webhook é serverless)
        if os.getenv('ENVIRONMENT') == 'development':
            logger.info("🔄 Modo desenvolvimento - mantendo processo ativo...")
            try:
                while True:
                    await asyncio.sleep(60)  # Verifica status a cada minuto
                    logger.info(f"💓 Heartbeat - {len(manager.bots)} bots ativos")
            except KeyboardInterrupt:
                logger.info("⚠️ Interrupção detectada")
        
    except Exception as e:
        logger.error(f"❌ Erro fatal: {e}")
    finally:
        # Cleanup
        await manager.parar_todos_os_bots()

if __name__ == "__main__":
    # Executar o gerenciador
    asyncio.run(main()) 