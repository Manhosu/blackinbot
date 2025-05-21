from fastapi import APIRouter, HTTPException, Request, Depends, status
import logging
import json
from telegram import Update
from telegram.ext import Application, Dispatcher

from ..database import get_db

router = APIRouter(
    prefix="/telegram",
    tags=["telegram"],
    responses={404: {"description": "Bot não encontrado"}}
)

logger = logging.getLogger(__name__)

# Dicionário para armazenar as instâncias dos dispatchers dos bots
# Chave: token do bot, Valor: instância do dispatcher
bot_dispatchers = {}

@router.post("/webhook/{bot_token}")
async def telegram_webhook(bot_token: str, request: Request):
    """
    Endpoint para receber atualizações do Telegram via webhook
    """
    try:
        # Verificar se o bot existe no banco de dados
        supabase = get_db()
        bot_response = supabase.table("bots").select("*").eq("token", bot_token).execute()
        
        if len(bot_response.data) == 0:
            logger.error(f"Bot com token {bot_token} não encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        bot = bot_response.data[0]
        
        # Obter o dispatcher para este bot (criar um novo se não existir)
        if bot_token not in bot_dispatchers:
            # Criar uma nova instância do dispatcher para este bot
            # em uma aplicação real, você pode querer carregar e configurar 
            # o dispatcher com os handlers específicos para este bot
            application = Application.builder().token(bot_token).build()
            bot_dispatchers[bot_token] = application.dispatcher
            
            # Registrar handlers para este bot
            # Isso seria feito de forma dinâmica com base nas configurações do bot
            # Por enquanto, estamos apenas simulando
            logger.info(f"Novo dispatcher criado para o bot {bot_token}")
        
        # Obter o dispatcher para este bot
        dispatcher = bot_dispatchers[bot_token]
        
        # Processar a atualização
        update_data = await request.json()
        update = Update.de_json(update_data, dispatcher.bot)
        
        # Processar a atualização no dispatcher
        await dispatcher.process_update(update)
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar webhook do Telegram: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar webhook: {str(e)}"
        )

@router.post("/setup-webhook/{bot_token}")
async def setup_webhook(bot_token: str, webhook_url: str):
    """
    Configura o webhook para um bot do Telegram
    """
    from ...bot.webhook import setup_webhook as setup_bot_webhook
    
    try:
        # Verificar se o bot existe no banco de dados
        supabase = get_db()
        bot_response = supabase.table("bots").select("*").eq("token", bot_token).execute()
        
        if len(bot_response.data) == 0:
            logger.error(f"Bot com token {bot_token} não encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        # Configurar o webhook
        success = await setup_bot_webhook(bot_token, webhook_url)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao configurar webhook"
            )
        
        # Atualizar a URL do webhook no banco de dados
        supabase.table("bots").update({
            "webhook_url": webhook_url,
            "updated_at": "now()"
        }).eq("token", bot_token).execute()
        
        return {"status": "success", "webhook_url": webhook_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao configurar webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao configurar webhook: {str(e)}"
        )

@router.post("/remove-webhook/{bot_token}")
async def remove_webhook(bot_token: str):
    """
    Remove o webhook de um bot do Telegram
    """
    from ...bot.webhook import remove_webhook as remove_bot_webhook
    
    try:
        # Verificar se o bot existe no banco de dados
        supabase = get_db()
        bot_response = supabase.table("bots").select("*").eq("token", bot_token).execute()
        
        if len(bot_response.data) == 0:
            logger.error(f"Bot com token {bot_token} não encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        # Remover o webhook
        success = await remove_bot_webhook(bot_token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao remover webhook"
            )
        
        # Atualizar a URL do webhook no banco de dados
        supabase.table("bots").update({
            "webhook_url": None,
            "updated_at": "now()"
        }).eq("token", bot_token).execute()
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover webhook: {str(e)}"
        )

@router.post("/add-user-to-group")
async def add_user_to_group(user_telegram_id: str, group_id: str, bot_token: str):
    """
    Adiciona um usuário a um grupo VIP
    """
    from ...bot.webhook import add_user_to_group as add_user
    
    try:
        # Verificar se o bot existe no banco de dados
        supabase = get_db()
        bot_response = supabase.table("bots").select("*").eq("token", bot_token).execute()
        
        if len(bot_response.data) == 0:
            logger.error(f"Bot com token {bot_token} não encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        # Verificar se o grupo existe
        group_response = supabase.table("groups").select("*").eq("telegram_id", group_id).execute()
        
        if len(group_response.data) == 0:
            logger.error(f"Grupo com ID {group_id} não encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grupo não encontrado"
            )
        
        # Adicionar o usuário ao grupo
        success = await add_user(user_telegram_id, group_id, bot_token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao adicionar usuário ao grupo"
            )
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao adicionar usuário ao grupo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao adicionar usuário ao grupo: {str(e)}"
        ) 