import os
import logging
import json
import httpx
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Dict, Any, Optional, Tuple

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de logging
logger = logging.getLogger(__name__)

# Classe para integração com PushinPay
class PushinPay:
    def __init__(self):
        self.api_key = os.getenv("PUSHINPAY_API_KEY")
        self.base_url = "https://api.pushinpay.com.br/v1"  # URL fictícia para exemplo
        
        if not self.api_key:
            logger.error("PUSHINPAY_API_KEY não definida nas variáveis de ambiente")
            raise ValueError("PUSHINPAY_API_KEY não definida nas variáveis de ambiente")
    
    async def generate_pix_payment(
        self, 
        amount: float, 
        description: str, 
        customer: Dict[str, str], 
        external_id: str,
        expires_in_minutes: int = 30
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Gera um pagamento PIX no PushinPay
        
        Args:
            amount: Valor do pagamento em reais
            description: Descrição do pagamento
            customer: Dicionário com informações do cliente (nome, email, etc)
            external_id: ID externo para referência
            expires_in_minutes: Tempo de expiração do PIX em minutos
            
        Returns:
            Tupla com (success, data)
            success: True se o pagamento foi gerado com sucesso, False caso contrário
            data: Dicionário com informações do pagamento ou erro
        """
        try:
            expiration_date = datetime.now() + timedelta(minutes=expires_in_minutes)
            
            # Preparar os dados para a requisição
            payment_data = {
                "amount": amount,
                "description": description,
                "customer": customer,
                "external_id": external_id,
                "expires_at": expiration_date.isoformat(),
                "payment_method": "pix"
            }
            
            # Fazer a requisição para a API
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{self.base_url}/payments",
                    json=payment_data,
                    headers=headers
                )
                
                if response.status_code == 201:
                    data = response.json()
                    logger.info(f"Pagamento PIX gerado com sucesso: {data['id']}")
                    return True, data
                else:
                    logger.error(f"Erro ao gerar pagamento PIX: {response.text}")
                    return False, {"error": response.text}
        except Exception as e:
            logger.error(f"Erro ao gerar pagamento PIX: {str(e)}")
            return False, {"error": str(e)}
    
    async def check_payment_status(self, payment_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Verifica o status de um pagamento no PushinPay
        
        Args:
            payment_id: ID do pagamento no PushinPay
            
        Returns:
            Tupla com (success, data)
            success: True se a consulta foi bem-sucedida, False caso contrário
            data: Dicionário com informações do pagamento ou erro
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{self.base_url}/payments/{payment_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Status do pagamento {payment_id}: {data['status']}")
                    return True, data
                else:
                    logger.error(f"Erro ao verificar status do pagamento: {response.text}")
                    return False, {"error": response.text}
        except Exception as e:
            logger.error(f"Erro ao verificar status do pagamento: {str(e)}")
            return False, {"error": str(e)}
    
    async def process_webhook(self, webhook_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Processa um webhook recebido do PushinPay
        
        Args:
            webhook_data: Dados recebidos no webhook
            
        Returns:
            Tupla com (success, data)
            success: True se o webhook foi processado com sucesso, False caso contrário
            data: Dicionário com informações processadas ou erro
        """
        try:
            # Verificar a assinatura do webhook (em uma implementação real)
            # ...
            
            # Extrair informações relevantes
            payment_id = webhook_data.get("payment_id")
            status = webhook_data.get("status")
            external_id = webhook_data.get("external_id")
            
            if not payment_id or not status:
                logger.error("Webhook não contém payment_id ou status")
                return False, {"error": "Webhook inválido"}
            
            logger.info(f"Webhook processado para pagamento {payment_id}: {status}")
            
            return True, {
                "payment_id": payment_id,
                "status": status,
                "external_id": external_id
            }
        except Exception as e:
            logger.error(f"Erro ao processar webhook: {str(e)}")
            return False, {"error": str(e)} 