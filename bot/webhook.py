import os
import logging
import httpx
from dotenv import load_dotenv
from telegram import Bot
from telegram.ext import Application

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

async def setup_webhook(bot_token: str, webhook_url: str) -> bool:
    """
    Configura o webhook para um bot do Telegram
    
    Args:
        bot_token: Token do bot do Telegram
        webhook_url: URL para o webhook
        
    Returns:
        bool: True se configurado com sucesso, False caso contrário
    """
    try:
        bot = Bot(token=bot_token)
        
        # Obter informações atuais do webhook
        webhook_info = await bot.get_webhook_info()
        
        # Se o webhook já estiver configurado para a URL desejada, não fazer nada
        if webhook_info.url == webhook_url:
            logger.info(f"Webhook para {bot_token} já está configurado corretamente")
            return True
        
        # Configurar o webhook
        await bot.set_webhook(url=webhook_url)
        
        # Verificar se o webhook foi configurado com sucesso
        webhook_info = await bot.get_webhook_info()
        if webhook_info.url == webhook_url:
            logger.info(f"Webhook para {bot_token} configurado com sucesso: {webhook_url}")
            return True
        else:
            logger.error(f"Erro ao configurar webhook para {bot_token}")
            return False
    except Exception as e:
        logger.error(f"Erro ao configurar webhook: {str(e)}")
        return False

async def remove_webhook(bot_token: str) -> bool:
    """
    Remove o webhook de um bot do Telegram
    
    Args:
        bot_token: Token do bot do Telegram
        
    Returns:
        bool: True se removido com sucesso, False caso contrário
    """
    try:
        bot = Bot(token=bot_token)
        
        # Remover o webhook
        await bot.delete_webhook()
        
        # Verificar se o webhook foi removido com sucesso
        webhook_info = await bot.get_webhook_info()
        if not webhook_info.url:
            logger.info(f"Webhook para {bot_token} removido com sucesso")
            return True
        else:
            logger.error(f"Erro ao remover webhook para {bot_token}")
            return False
    except Exception as e:
        logger.error(f"Erro ao remover webhook: {str(e)}")
        return False

async def register_bot_with_api(bot_token: str, user_id: str) -> bool:
    """
    Registra um novo bot com o servidor da API
    
    Args:
        bot_token: Token do bot do Telegram
        user_id: ID do usuário proprietário do bot
        
    Returns:
        bool: True se registrado com sucesso, False caso contrário
    """
    try:
        # Obter URL da API
        api_url = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api")
        
        # Obter informações do bot
        bot = Bot(token=bot_token)
        bot_info = await bot.get_me()
        
        # Preparar dados para enviar à API
        bot_data = {
            "token": bot_token,
            "name": bot_info.first_name,
            "username": bot_info.username,
            "owner_id": user_id,
            "description": bot_info.description or "",
            "status": "setup_required"
        }
        
        # Enviar dados para a API
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{api_url}/bots", json=bot_data)
            
            if response.status_code == 201:
                logger.info(f"Bot {bot_info.username} registrado com sucesso na API")
                return True
            else:
                logger.error(f"Erro ao registrar bot na API: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Erro ao registrar bot na API: {str(e)}")
        return False

async def add_user_to_group(user_telegram_id: str, group_id: str, bot_token: str) -> bool:
    """
    Adiciona um usuário a um grupo VIP
    
    Args:
        user_telegram_id: ID do usuário no Telegram
        group_id: ID do grupo VIP
        bot_token: Token do bot que é administrador do grupo
        
    Returns:
        bool: True se adicionado com sucesso, False caso contrário
    """
    try:
        bot = Bot(token=bot_token)
        
        # Tentar adicionar o usuário ao grupo
        # O bot precisa ser administrador do grupo com permissões para adicionar membros
        await bot.unban_chat_member(
            chat_id=group_id,
            user_id=user_telegram_id,
            only_if_banned=False
        )
        
        # Criar link de convite
        invite_link = await bot.create_chat_invite_link(
            chat_id=group_id,
            member_limit=1  # Limitar a um uso
        )
        
        # Enviar link de convite para o usuário
        await bot.send_message(
            chat_id=user_telegram_id,
            text=f"Seu pagamento foi confirmado! 🎉\n\nAcesse nosso grupo VIP através do link abaixo:\n{invite_link.invite_link}\n\nEste link é válido por apenas 1 uso."
        )
        
        logger.info(f"Usuário {user_telegram_id} adicionado ao grupo {group_id}")
        return True
    except Exception as e:
        logger.error(f"Erro ao adicionar usuário ao grupo: {str(e)}")
        return False 