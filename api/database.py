import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente
load_dotenv()

# Obter configurações do Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Função para obter cliente Supabase
def get_supabase_client() -> Client:
    """Cria e retorna uma instância do cliente Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY devem ser definidas")
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# Cliente Supabase singleton
_client = None

def get_db():
    """Retorna uma instância singleton do cliente Supabase"""
    global _client
    if _client is None:
        _client = get_supabase_client()
    return _client

# Definição das tabelas principais
USERS_TABLE = "users"
BOTS_TABLE = "bots"
PLANS_TABLE = "plans"
SALES_TABLE = "sales"
GROUPS_TABLE = "groups"
PAYMENTS_TABLE = "payments"
REMINDERS_TABLE = "reminders"

# Funções utilitárias para operações no banco de dados

async def get_user_by_id(user_id: str):
    """Busca um usuário pelo ID"""
    client = get_db()
    response = client.table(USERS_TABLE).select("*").eq("id", user_id).execute()
    
    if len(response.data) == 0:
        return None
    
    return response.data[0]

async def get_bot_by_token(bot_token: str):
    """Busca um bot pelo token"""
    client = get_db()
    response = client.table(BOTS_TABLE).select("*").eq("token", bot_token).execute()
    
    if len(response.data) == 0:
        return None
    
    return response.data[0] 