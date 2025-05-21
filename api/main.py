import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

# Importar routers
from .routers import bots, payments, plans

# Carregar variáveis de ambiente
load_dotenv()

# Inicializar aplicação FastAPI
app = FastAPI(
    title="Black-In-Bot API",
    description="API para o sistema de bots para venda de acesso a grupos VIP no Telegram",
    version="0.1.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, definir origens específicas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(bots.router)
app.include_router(payments.router)
app.include_router(plans.router)

# Rota raiz para verificar se a API está funcionando
@app.get("/")
async def root():
    return {"message": "Black-In-Bot API está funcionando!"}

# Rota de verificação de saúde da API
@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "version": "0.1.0"
    }

# Iniciar servidor se executado diretamente
if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    debug = os.getenv("API_DEBUG", "False").lower() == "true"
    
    uvicorn.run("main:app", host=host, port=port, reload=debug) 