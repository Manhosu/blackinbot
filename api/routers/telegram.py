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

@router.post("/config")
async def get_bot_config(request: dict):
    """
    Busca configuração do bot pelo token
    """
    try:
        bot_token = request.get('token')
        if not bot_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token do bot é obrigatório"
            )
        
        supabase = get_db()
        
        # Buscar bot pelo token
        bot_response = supabase.table("bots").select("*").eq("token", bot_token).execute()
        
        if len(bot_response.data) == 0:
            return {"success": False, "error": "Bot não encontrado"}
        
        bot = bot_response.data[0]
        
        return {
            "success": True,
            "bot": {
                "id": bot["id"],
                "name": bot["name"],
                "description": bot.get("description"),
                "is_activated": bot.get("is_activated", False),
                "welcome_message": bot.get("welcome_message"),
                "welcome_media_url": bot.get("welcome_media_url"),
                "welcome_media_type": bot.get("welcome_media_type")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar configuração do bot: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/activate-bot")
async def activate_bot(request: dict):
    """
    Ativa um bot usando código de ativação
    """
    try:
        activation_code = request.get('activation_code', '').strip().upper()
        telegram_user_id = request.get('telegram_user_id')
        chat_id = request.get('chat_id')
        chat_type = request.get('chat_type')
        
        if not all([activation_code, telegram_user_id, chat_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parâmetros obrigatórios: activation_code, telegram_user_id, chat_id"
            )
        
        supabase = get_db()
        
        # Buscar código de ativação válido
        from datetime import datetime
        current_time = datetime.utcnow().isoformat()
        
        code_response = supabase.table("bot_activation_codes").select("""
            *,
            bots!inner(id, name, token)
        """).eq("activation_code", activation_code).gt("expires_at", current_time).eq("used_at", None).execute()
        
        if len(code_response.data) == 0:
            return {
                "success": False, 
                "message": "❌ Código de ativação inválido ou expirado"
            }
        
        code_data = code_response.data[0]
        bot_data = code_data["bots"]
        
        # Marcar código como usado
        supabase.table("bot_activation_codes").update({
            "used_at": current_time,
            "used_by_telegram_id": telegram_user_id
        }).eq("id", code_data["id"]).execute()
        
        # Ativar o bot
        supabase.table("bots").update({
            "is_activated": True,
            "activated_at": current_time,
            "activated_by_telegram_id": telegram_user_id
        }).eq("id", bot_data["id"]).execute()
        
        return {
            "success": True,
            "message": "✅ Bot ativado com sucesso!",
            "bot": {
                "id": bot_data["id"],
                "name": bot_data["name"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao ativar bot: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/check-access")
async def check_user_access(request: dict):
    """
    Verifica se um usuário tem acesso a um bot
    """
    try:
        bot_id = request.get('bot_id')
        telegram_user_id = request.get('telegram_user_id')
        
        if not all([bot_id, telegram_user_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parâmetros obrigatórios: bot_id, telegram_user_id"
            )
        
        supabase = get_db()
        
        # Verificar acesso do usuário
        from datetime import datetime
        current_time = datetime.utcnow().isoformat()
        
        access_response = supabase.table("user_accesses").select("""
            *,
            plans!inner(name, duration_days)
        """).eq("bot_id", bot_id).eq("telegram_user_id", telegram_user_id).eq("active", True).execute()
        
        if len(access_response.data) == 0:
            return {"has_access": False}
        
        access = access_response.data[0]
        
        # Verificar se ainda está válido
        if access.get("expires_at") and access["expires_at"] < current_time:
            # Desativar acesso expirado
            supabase.table("user_accesses").update({
                "active": False
            }).eq("id", access["id"]).execute()
            
            return {"has_access": False}
        
        return {
            "has_access": True,
            "access_info": {
                "plan_name": access["plans"]["name"],
                "expires_at": access.get("expires_at")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar acesso: {str(e)}")
        return {"has_access": False, "error": str(e)}

@router.post("/list-plans")
async def list_plans(request: dict):
    """
    Lista planos disponíveis para um bot
    """
    try:
        bot_id = request.get('bot_id')
        
        if not bot_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="bot_id é obrigatório"
            )
        
        supabase = get_db()
        
        # Buscar planos ativos do bot
        plans_response = supabase.table("plans").select("*").eq("bot_id", bot_id).eq("is_active", True).execute()
        
        return {
            "success": True,
            "plans": plans_response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar planos: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/create-payment")
async def create_payment(request: dict):
    """
    Cria um novo pagamento para um plano
    """
    try:
        bot_id = request.get('bot_id')
        plan_id = request.get('plan_id') 
        telegram_user_id = request.get('telegram_user_id')
        customer_name = request.get('customer_name', 'Cliente')
        
        if not all([bot_id, plan_id, telegram_user_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parâmetros obrigatórios: bot_id, plan_id, telegram_user_id"
            )
        
        supabase = get_db()
        
        # Buscar o plano
        plan_response = supabase.table("plans").select("*").eq("id", plan_id).execute()
        
        if len(plan_response.data) == 0:
            return {"success": False, "error": "Plano não encontrado"}
        
        plan = plan_response.data[0]
        
        # Criar entrada de pagamento
        from datetime import datetime, timedelta
        expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        
        payment_data = {
            "bot_id": bot_id,
            "plan_id": plan_id,
            "telegram_user_id": telegram_user_id,
            "user_name": customer_name,
            "amount": plan["price"],
            "method": "pix",
            "status": "pending",
            "expires_at": expires_at
        }
        
        payment_response = supabase.table("payments").insert(payment_data).execute()
        
        if len(payment_response.data) == 0:
            return {"success": False, "error": "Erro ao criar pagamento"}
        
        payment = payment_response.data[0]
        
        # Aqui você integraria com PushinPay para gerar QR code
        # Por enquanto, vamos simular
        payment["plan_name"] = plan["name"]
        payment["pix_copy_paste"] = f"00020126580014BR.GOV.BCB.PIX0136{payment['id'][:36]}520400005303986540{plan['price']:.2f}5802BR6009SAO PAULO62070503***6304"
        payment["qr_code_image_url"] = f"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        return {
            "success": True,
            "payment": payment
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar pagamento: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/payment-details/{payment_id}")
async def get_payment_details(payment_id: str):
    """
    Busca detalhes de um pagamento
    """
    try:
        supabase = get_db()
        
        payment_response = supabase.table("payments").select("""
            *,
            plans!inner(name)
        """).eq("id", payment_id).execute()
        
        if len(payment_response.data) == 0:
            return {"success": False, "error": "Pagamento não encontrado"}
        
        payment = payment_response.data[0]
        
        # Adicionar dados simulados do PIX
        payment["pix_copy_paste"] = f"00020126580014BR.GOV.BCB.PIX0136{payment['id'][:36]}520400005303986540{payment['amount']:.2f}5802BR6009SAO PAULO62070503***6304"
        payment["qr_code_image_url"] = f"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        return {
            "success": True,
            "payment": payment
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do pagamento: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/payment-status/{payment_id}")
async def check_payment_status(payment_id: str, request: dict):
    """
    Verifica status de um pagamento
    """
    try:
        telegram_user_id = request.get('telegram_user_id')
        
        supabase = get_db()
        
        payment_response = supabase.table("payments").select("""
            *,
            plans!inner(name, period_days)
        """).eq("id", payment_id).eq("telegram_user_id", telegram_user_id).execute()
        
        if len(payment_response.data) == 0:
            return {"success": False, "error": "Pagamento não encontrado"}
        
        payment = payment_response.data[0]
        
        # Por enquanto, vamos simular aprovação para teste
        # Em produção, você verificaria com PushinPay
        
        if payment["status"] == "pending":
            # Simular aprovação para testes (opcional)
            return {
                "success": True,
                "payment": {
                    **payment,
                    "plan_name": payment["plans"]["name"]
                }
            }
        elif payment["status"] == "approved":
            return {
                "success": True,
                "payment": {
                    **payment,
                    "plan_name": payment["plans"]["name"]
                },
                "access_info": {
                    "expires_at": payment.get("expires_at")
                }
            }
        
        return {
            "success": True,
            "payment": {
                **payment,
                "plan_name": payment["plans"]["name"]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar status do pagamento: {str(e)}")
        return {"success": False, "error": str(e)} 