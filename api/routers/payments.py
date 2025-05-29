from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from typing import Dict, Any, Optional
import logging
import uuid
from datetime import datetime, timedelta

from ..database import get_db
from ..models import PaymentCreate, PaymentResponse, PaymentStatus, PaymentMethod
from ..payments import PushinPay, MercadoPago

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
    responses={404: {"description": "Pagamento não encontrado"}}
)

logger = logging.getLogger(__name__)

@router.post("/create", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_payment(
    user_telegram_id: str,
    bot_id: str,
    plan_id: str,
    amount: float,
    payment_method: PaymentMethod,
    customer_data: Dict[str, str]
):
    """
    Cria um novo pagamento
    """
    try:
        supabase = get_db()
        
        # Gerar ID externo único para o pagamento
        external_id = str(uuid.uuid4())
        
        # Buscar informações do plano
        plan_response = supabase.table("plans").select("*").eq("id", plan_id).execute()
        
        if len(plan_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano não encontrado"
            )
        
        plan = plan_response.data[0]
        
        # Buscar informações do bot
        bot_response = supabase.table("bots").select("*").eq("id", bot_id).execute()
        
        if len(bot_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot não encontrado"
            )
        
        bot = bot_response.data[0]
        
        # Registrar o pagamento no banco de dados inicialmente como pendente
        payment_data = {
            "user_telegram_id": user_telegram_id,
            "bot_id": bot_id,
            "plan_id": plan_id,
            "amount": amount,
            "method": payment_method,
            "status": PaymentStatus.PENDING,
            "external_id": external_id,
            "metadata": {}
        }
        
        payment_response = supabase.table("payments").insert(payment_data).execute()
        
        if len(payment_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar o pagamento no banco de dados"
            )
        
        payment = payment_response.data[0]
        payment_id = payment["id"]
        
        # Gerar o pagamento no gateway conforme o método escolhido
        payment_info = {}
        
        if payment_method == PaymentMethod.PUSHINPAY:
            # Usar o PushinPay
            pushinpay = PushinPay()
            
            # Descrição do pagamento
            description = f"Acesso ao grupo VIP de {bot['name']} - Plano {plan['name']}"
            
            # Gerar o pagamento
            success, payment_info = await pushinpay.generate_pix_payment(
                amount=amount,
                description=description,
                customer=customer_data,
                external_id=external_id,
                expires_in_minutes=30
            )
            
            if not success:
                # Se falhar, atualizar o status para falha
                supabase.table("payments").update({
                    "status": PaymentStatus.FAILED,
                    "updated_at": "now()"
                }).eq("id", payment_id).execute()
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao gerar pagamento no PushinPay: {payment_info.get('error', '')}"
                )
        
        elif payment_method == PaymentMethod.MERCADO_PAGO:
            # Usar o Mercado Pago
            mercadopago_client = MercadoPago()
            
            # Descrição do pagamento
            description = f"Acesso ao grupo VIP de {bot['name']} - Plano {plan['name']}"
            
            # Gerar o pagamento
            success, payment_info = mercadopago_client.generate_payment(
                amount=amount,
                description=description,
                customer=customer_data,
                external_reference=external_id,
                payment_method="pix",
                expires_in_minutes=30
            )
            
            if not success:
                # Se falhar, atualizar o status para falha
                supabase.table("payments").update({
                    "status": PaymentStatus.FAILED,
                    "updated_at": "now()"
                }).eq("id", payment_id).execute()
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao gerar pagamento no Mercado Pago: {payment_info.get('error', '')}"
                )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Método de pagamento {payment_method} não suportado"
            )
        
        # Atualizar o pagamento no banco de dados com as informações do gateway
        supabase.table("payments").update({
            "transaction_id": payment_info.get("id", ""),
            "metadata": payment_info,
            "updated_at": "now()"
        }).eq("id", payment_id).execute()
        
        # Retornar informações do pagamento
        return {
            "payment_id": payment_id,
            "external_id": external_id,
            "status": PaymentStatus.PENDING,
            "qr_code": payment_info.get("qr_code", ""),
            "qr_code_base64": payment_info.get("qr_code_base64", ""),
            "payment_url": payment_info.get("payment_url", ""),
            "expires_at": payment_info.get("expires_at", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar pagamento: {str(e)}"
        )

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str):
    """
    Obtém informações de um pagamento específico
    """
    try:
        supabase = get_db()
        response = supabase.table("payments").select("*").eq("id", payment_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pagamento não encontrado"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar pagamento: {str(e)}"
        )

@router.post("/webhook/pushinpay")
async def pushinpay_webhook(request: Request):
    """
    Webhook para notificações do PushinPay
    """
    try:
        # Obter os dados do webhook
        webhook_data = await request.json()
        
        # Processar o webhook
        pushinpay = PushinPay()
        success, data = await pushinpay.process_webhook(webhook_data)
        
        if not success:
            logger.error(f"Erro ao processar webhook do PushinPay: {data}")
            return {"status": "error", "message": "Erro ao processar webhook"}
        
        # Extrair informações relevantes
        payment_id = data.get("payment_id")
        status = data.get("status")
        external_id = data.get("external_id")
        
        # Atualizar o status do pagamento no banco de dados
        supabase = get_db()
        
        # Buscar o pagamento pelo external_id
        payment_response = supabase.table("payments").select("*").eq("external_id", external_id).execute()
        
        if len(payment_response.data) == 0:
            logger.error(f"Pagamento com external_id {external_id} não encontrado")
            return {"status": "error", "message": "Pagamento não encontrado"}
        
        payment = payment_response.data[0]
        
        # Mapear o status do PushinPay para o status do sistema
        payment_status = PaymentStatus.PENDING
        
        if status == "approved" or status == "completed":
            payment_status = PaymentStatus.COMPLETED
        elif status == "cancelled" or status == "failed":
            payment_status = PaymentStatus.FAILED
        
        # Atualizar o status do pagamento
        supabase.table("payments").update({
            "status": payment_status,
            "updated_at": "now()"
        }).eq("id", payment["id"]).execute()
        
        # Se o pagamento foi completado, registrar a venda e adicionar o usuário ao grupo
        if payment_status == PaymentStatus.COMPLETED:
            # Buscar informações do plano
            plan_response = supabase.table("plans").select("*").eq("id", payment["plan_id"]).execute()
            
            if len(plan_response.data) > 0:
                plan = plan_response.data[0]
                
                # Calcular a data de expiração
                expires_at = None
                if plan["days_access"] > 0:
                    expires_at = (datetime.now() + timedelta(days=plan["days_access"])).isoformat()
                
                # Registrar a venda
                sale_data = {
                    "payment_id": payment["id"],
                    "bot_id": payment["bot_id"],
                    "plan_id": payment["plan_id"],
                    "user_telegram_id": payment["user_telegram_id"],
                    "amount": payment["amount"],
                    "expires_at": expires_at
                }
                
                supabase.table("sales").insert(sale_data).execute()
                
                # TODO: Adicionar o usuário ao grupo VIP
                # Isso seria feito através da integração com o bot do Telegram
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Erro ao processar webhook do PushinPay: {str(e)}")
        return {"status": "error", "message": f"Erro ao processar webhook: {str(e)}"}

@router.post("/webhook/mercadopago")
async def mercadopago_webhook(request: Request):
    """
    Webhook para notificações do Mercado Pago
    """
    try:
        # Obter os dados do webhook
        webhook_data = await request.json()
        
        # Processar o webhook
        mercadopago_client = MercadoPago()
        success, data = mercadopago_client.process_webhook(webhook_data)
        
        if not success:
            logger.error(f"Erro ao processar webhook do Mercado Pago: {data}")
            return {"status": "error", "message": "Erro ao processar webhook"}
        
        # Extrair informações relevantes
        payment_id = data.get("payment_id")
        status = data.get("status")
        external_reference = data.get("external_reference")
        
        # Atualizar o status do pagamento no banco de dados
        supabase = get_db()
        
        # Buscar o pagamento pelo external_id
        payment_response = supabase.table("payments").select("*").eq("external_id", external_reference).execute()
        
        if len(payment_response.data) == 0:
            logger.error(f"Pagamento com external_id {external_reference} não encontrado")
            return {"status": "error", "message": "Pagamento não encontrado"}
        
        payment = payment_response.data[0]
        
        # Mapear o status do Mercado Pago para o status do sistema
        payment_status = PaymentStatus.PENDING
        
        if status == "approved":
            payment_status = PaymentStatus.COMPLETED
        elif status == "cancelled" or status == "rejected":
            payment_status = PaymentStatus.FAILED
        
        # Atualizar o status do pagamento
        supabase.table("payments").update({
            "status": payment_status,
            "updated_at": "now()"
        }).eq("id", payment["id"]).execute()
        
        # Se o pagamento foi completado, registrar a venda e adicionar o usuário ao grupo
        if payment_status == PaymentStatus.COMPLETED:
            # Buscar informações do plano
            plan_response = supabase.table("plans").select("*").eq("id", payment["plan_id"]).execute()
            
            if len(plan_response.data) > 0:
                plan = plan_response.data[0]
                
                # Calcular a data de expiração
                expires_at = None
                if plan["days_access"] > 0:
                    expires_at = (datetime.now() + timedelta(days=plan["days_access"])).isoformat()
                
                # Registrar a venda
                sale_data = {
                    "payment_id": payment["id"],
                    "bot_id": payment["bot_id"],
                    "plan_id": payment["plan_id"],
                    "user_telegram_id": payment["user_telegram_id"],
                    "amount": payment["amount"],
                    "expires_at": expires_at
                }
                
                supabase.table("sales").insert(sale_data).execute()
                
                # TODO: Adicionar o usuário ao grupo VIP
                # Isso seria feito através da integração com o bot do Telegram
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Erro ao processar webhook do Mercado Pago: {str(e)}")
        return {"status": "error", "message": f"Erro ao processar webhook: {str(e)}"}

@router.get("/check/{payment_id}")
async def check_payment_status(payment_id: str):
    """
    Verifica o status atual de um pagamento no gateway
    """
    try:
        supabase = get_db()
        response = supabase.table("payments").select("*").eq("id", payment_id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pagamento não encontrado"
            )
        
        payment = response.data[0]
        transaction_id = payment.get("transaction_id")
        
        if not transaction_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pagamento não possui transaction_id"
            )
        
        # Verificar o status do pagamento no gateway correspondente
        if payment["method"] == PaymentMethod.PUSHINPAY:
            pushinpay = PushinPay()
            success, data = await pushinpay.check_payment_status(transaction_id)
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao verificar status do pagamento no PushinPay: {data.get('error', '')}"
                )
            
            return {"status": data.get("status", "unknown"), "payment_data": data}
        
        elif payment["method"] == PaymentMethod.MERCADO_PAGO:
            mercadopago_client = MercadoPago()
            success, data = mercadopago_client.check_payment_status(transaction_id)
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao verificar status do pagamento no Mercado Pago: {data.get('error', '')}"
                )
            
            return {"status": data.get("status", "unknown"), "payment_data": data}
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Método de pagamento {payment['method']} não suportado para verificação de status"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar status do pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar status do pagamento: {str(e)}"
        ) 