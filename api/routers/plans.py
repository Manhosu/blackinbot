from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from ..models import PlanCreate, PlanResponse, PlanPeriod
from ..database import get_db

router = APIRouter(
    prefix="/plans",
    tags=["plans"],
    responses={404: {"description": "Plano não encontrado"}}
)

logger = logging.getLogger(__name__)

@router.post("/", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(plan: PlanCreate):
    """
    Cria um novo plano de acesso para um bot
    """
    try:
        supabase = get_db()
        
        # Verificar se o bot existe
        bot_response = supabase.table("bots").select("*").eq("id", plan.bot_id).execute()
        
        if len(bot_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        # Criar o plano
        plan_data = plan.dict()
        
        response = supabase.table("plans").insert(plan_data).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar o plano"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar plano: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar plano: {str(e)}"
        )

@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(plan_id: str):
    """
    Obtém detalhes de um plano específico
    """
    try:
        supabase = get_db()
        response = supabase.table("plans").select("*").eq("id", plan_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano não encontrado"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar plano: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar plano: {str(e)}"
        )

@router.get("/bot/{bot_id}", response_model=List[PlanResponse])
async def get_bot_plans(bot_id: str):
    """
    Obtém todos os planos de um bot específico
    """
    try:
        supabase = get_db()
        response = supabase.table("plans").select("*").eq("bot_id", bot_id).eq("is_active", True).execute()
        
        return response.data
    except Exception as e:
        logger.error(f"Erro ao buscar planos do bot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar planos do bot: {str(e)}"
        )

@router.patch("/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: str, plan_update: dict):
    """
    Atualiza um plano existente
    """
    try:
        supabase = get_db()
        
        # Verificar se o plano existe
        plan_response = supabase.table("plans").select("*").eq("id", plan_id).execute()
        
        if len(plan_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano não encontrado"
            )
        
        # Atualizar o plano
        plan_update["updated_at"] = "now()"
        
        response = supabase.table("plans").update(plan_update).eq("id", plan_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao atualizar o plano"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar plano: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar plano: {str(e)}"
        )

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(plan_id: str):
    """
    Remove um plano (desativa)
    """
    try:
        supabase = get_db()
        
        # Verificar se o plano existe
        plan_response = supabase.table("plans").select("*").eq("id", plan_id).execute()
        
        if len(plan_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano não encontrado"
            )
        
        # Desativar o plano ao invés de excluir
        response = supabase.table("plans").update({
            "is_active": False,
            "updated_at": "now()"
        }).eq("id", plan_id).execute()
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover plano: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover plano: {str(e)}"
        ) 