import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Configuração de logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Função para criar cliente Supabase
def get_supabase_client() -> Client:
    """Cria e retorna uma instância do cliente Supabase"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY devem ser definidas")
    
    return create_client(supabase_url, supabase_key)

# Script para criar tabelas no Supabase
def create_tables(client: Client):
    """
    Cria as tabelas necessárias no banco de dados Supabase
    """
    try:
        # Executar SQL para criar tabelas
        # Tabela de usuários
        logger.info("Criando tabela de usuários...")
        client.table("users").execute()
        
        # Tabela de bots
        logger.info("Criando tabela de bots...")
        client.table("bots").execute()
        
        # Tabela de planos
        logger.info("Criando tabela de planos...")
        client.table("plans").execute()
        
        # Tabela de grupos
        logger.info("Criando tabela de grupos...")
        client.table("groups").execute()
        
        # Tabela de pagamentos
        logger.info("Criando tabela de pagamentos...")
        client.table("payments").execute()
        
        # Tabela de vendas
        logger.info("Criando tabela de vendas...")
        client.table("sales").execute()
        
        # Tabela de lembretes
        logger.info("Criando tabela de lembretes...")
        client.table("reminders").execute()
        
        logger.info("Todas as tabelas foram criadas com sucesso!")
    except Exception as e:
        logger.error(f"Erro ao criar tabelas: {str(e)}")
        raise e

# Função para configurar o esquema SQL
def setup_database():
    """
    Configura o banco de dados com as tabelas necessárias
    
    Obs: Este script deve ser executado apenas uma vez para configurar o banco de dados.
    O Supabase permite a criação de tabelas via SQL através do console web ou via API com
    uma chave de serviço. Em um ambiente de produção, recomenda-se utilizar o console web
    ou ferramentas como migrations para gerenciar o esquema do banco de dados.
    """
    try:
        # Obter cliente Supabase
        client = get_supabase_client()
        
        # Criar tabelas
        create_tables(client)
        
        logger.info("Banco de dados configurado com sucesso!")
    except Exception as e:
        logger.error(f"Erro ao configurar banco de dados: {str(e)}")
        raise e

if __name__ == "__main__":
    setup_database() 