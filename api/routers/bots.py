from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from ..models import BotCreate, BotResponse, BotStatus
from ..database import get_db

router = APIRouter(
    prefix="/bots",
    tags=["bots"],
    responses={404: {"description": "Bot não encontrado"}}
)

logger = logging.getLogger(__name__)

@router.post("/", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
async def create_bot(bot: BotCreate):
    """
    Cria um novo bot para o usuário.
    """
    try:
        supabase = get_db()
        
        # Verifica se já existe um bot com o mesmo token
        response = supabase.table("bots").select("*").eq("token", bot.token).execute()
        
        if len(response.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um bot com este token"
            )
        
        # Criar o bot
        response = supabase.table("bots").insert({
            "name": bot.name,
            "token": bot.token,
            "description": bot.description,
            "owner_id": bot.owner_id,
            "webhook_url": bot.webhook_url,
            "status": bot.status,
        }).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar o bot"
            )
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Erro ao criar bot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar bot: {str(e)}"
        )

@router.get("/", response_model=List[BotResponse])
async def get_user_bots(owner_id: str):
    """
    Obtém todos os bots de um usuário.
    """
    try:
        supabase = get_db()
        response = supabase.table("bots").select("*").eq("owner_id", owner_id).execute()
        
        return response.data
    except Exception as e:
        logger.error(f"Erro ao buscar bots do usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar bots do usuário: {str(e)}"
        )

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(bot_id: str):
    """
    Obtém um bot específico pelo ID.
    """
    try:
        supabase = get_db()
        response = supabase.table("bots").select("*").eq("id", bot_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar bot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar bot: {str(e)}"
        )

@router.patch("/{bot_id}/status", response_model=BotResponse)
async def update_bot_status(bot_id: str, status: BotStatus):
    """
    Atualiza o status de um bot.
    """
    try:
        supabase = get_db()
        
        # Verifica se o bot existe
        response = supabase.table("bots").select("*").eq("id", bot_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        # Atualiza o status do bot
        response = supabase.table("bots").update({
            "status": status,
            "updated_at": "now()"
        }).eq("id", bot_id).execute()
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar status do bot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar status do bot: {str(e)}"
        ) 