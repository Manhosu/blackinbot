import os
import logging
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Dict, Any, Optional, Tuple
import mercadopago

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de logging
logger = logging.getLogger(__name__)

# Classe para integração com Mercado Pago
class MercadoPago:
    def __init__(self):
        self.access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
        
        if not self.access_token:
            logger.error("MERCADOPAGO_ACCESS_TOKEN não definido nas variáveis de ambiente")
            raise ValueError("MERCADOPAGO_ACCESS_TOKEN não definido nas variáveis de ambiente")
        
        # Inicializar o SDK do Mercado Pago
        self.sdk = mercadopago.SDK(self.access_token)
    
    def generate_payment(
        self, 
        amount: float, 
        description: str, 
        customer: Dict[str, str], 
        external_reference: str,
        payment_method: str = "pix",
        expires_in_minutes: int = 30
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Gera um pagamento no Mercado Pago
        
        Args:
            amount: Valor do pagamento em reais
            description: Descrição do pagamento
            customer: Dicionário com informações do cliente (nome, email, etc)
            external_reference: Referência externa
            payment_method: Método de pagamento (pix, credit_card, etc)
            expires_in_minutes: Tempo de expiração em minutos (apenas para PIX)
            
        Returns:
            Tupla com (success, data)
            success: True se o pagamento foi gerado com sucesso, False caso contrário
            data: Dicionário com informações do pagamento ou erro
        """
        try:
            # Preparar os dados para a requisição
            payment_data = {
                "transaction_amount": float(amount),
                "description": description,
                "payment_method_id": payment_method,
                "external_reference": external_reference,
                "payer": {
                    "email": customer.get("email", ""),
                    "first_name": customer.get("first_name", ""),
                    "last_name": customer.get("last_name", "")
                }
            }
            
            # Se for PIX, adicionar data de expiração
            if payment_method == "pix":
                expiration_date = datetime.now() + timedelta(minutes=expires_in_minutes)
                payment_data["date_of_expiration"] = expiration_date.isoformat()
            
            # Fazer a requisição para a API
            response = self.sdk.payment().create(payment_data)
            
            if response["status"] == 201:
                data = response["response"]
                logger.info(f"Pagamento gerado com sucesso: {data['id']}")
                return True, data
            else:
                logger.error(f"Erro ao gerar pagamento: {response}")
                return False, {"error": response}
        except Exception as e:
            logger.error(f"Erro ao gerar pagamento: {str(e)}")
            return False, {"error": str(e)}
    
    def check_payment_status(self, payment_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Verifica o status de um pagamento no Mercado Pago
        
        Args:
            payment_id: ID do pagamento no Mercado Pago
            
        Returns:
            Tupla com (success, data)
            success: True se a consulta foi bem-sucedida, False caso contrário
            data: Dicionário com informações do pagamento ou erro
        """
        try:
            response = self.sdk.payment().get(payment_id)
            
            if response["status"] == 200:
                data = response["response"]
                logger.info(f"Status do pagamento {payment_id}: {data['status']}")
                return True, data
            else:
                logger.error(f"Erro ao verificar status do pagamento: {response}")
                return False, {"error": response}
        except Exception as e:
            logger.error(f"Erro ao verificar status do pagamento: {str(e)}")
            return False, {"error": str(e)}
    
    def process_webhook(self, webhook_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Processa um webhook recebido do Mercado Pago
        
        Args:
            webhook_data: Dados recebidos no webhook
            
        Returns:
            Tupla com (success, data)
            success: True se o webhook foi processado com sucesso, False caso contrário
            data: Dicionário com informações processadas ou erro
        """
        try:
            # Verificar o tipo de notificação
            topic = webhook_data.get("topic", "")
            
            if topic != "payment":
                logger.error(f"Webhook com tópico não suportado: {topic}")
                return False, {"error": f"Tópico não suportado: {topic}"}
            
            # Extrair o ID do pagamento
            payment_id = webhook_data.get("id", "")
            
            if not payment_id:
                logger.error("Webhook não contém ID do pagamento")
                return False, {"error": "Webhook inválido"}
            
            # Buscar informações do pagamento
            success, payment_data = self.check_payment_status(payment_id)
            
            if not success:
                logger.error(f"Erro ao buscar informações do pagamento: {payment_data}")
                return False, payment_data
            
            # Extrair informações relevantes
            status = payment_data.get("status", "")
            external_reference = payment_data.get("external_reference", "")
            
            logger.info(f"Webhook processado para pagamento {payment_id}: {status}")
            
            return True, {
                "payment_id": payment_id,
                "status": status,
                "external_reference": external_reference
            }
        except Exception as e:
            logger.error(f"Erro ao processar webhook: {str(e)}")
            return False, {"error": str(e)} 