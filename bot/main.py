import os
import logging
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Estados para conversação
SELECIONAR_PLANO, PROCESSAR_PAGAMENTO = range(2)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando para iniciar o bot"""
    user = update.effective_user
    await update.message.reply_text(
        f"Olá, {user.first_name}! Bem-vindo ao Bot de Acesso VIP.\n\n"
        "Use /planos para ver os planos disponíveis."
    )

async def planos(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Mostra os planos disponíveis"""
    # Aqui seria feita uma consulta à API para obter os planos
    # Por enquanto, vamos usar planos fictícios
    planos = [
        {"id": "1", "nome": "Plano Mensal", "preco": 29.90, "periodo": "mensal"},
        {"id": "2", "nome": "Plano Trimestral", "preco": 79.90, "periodo": "trimestral"},
        {"id": "3", "nome": "Plano Anual", "preco": 199.90, "periodo": "anual"},
    ]
    
    keyboard = []
    for plano in planos:
        keyboard.append([
            InlineKeyboardButton(
                f"{plano['nome']} - R$ {plano['preco']:.2f}", 
                callback_data=f"plano_{plano['id']}"
            )
        ])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Escolha um plano para acessar nosso conteúdo VIP:",
        reply_markup=reply_markup,
    )
    
    return SELECIONAR_PLANO

async def selecionar_plano(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Processa a seleção de plano"""
    query = update.callback_query
    await query.answer()
    
    # Extrair o ID do plano selecionado
    plano_id = query.data.split("_")[1]
    context.user_data["plano_id"] = plano_id
    
    # Aqui seria feita uma consulta à API para obter os detalhes do plano
    # Por enquanto, vamos usar dados fictícios
    planos = {
        "1": {"nome": "Plano Mensal", "preco": 29.90, "periodo": "mensal"},
        "2": {"nome": "Plano Trimestral", "preco": 79.90, "periodo": "trimestral"},
        "3": {"nome": "Plano Anual", "preco": 199.90, "periodo": "anual"},
    }
    
    plano = planos[plano_id]
    
    # Gerar um QR Code de pagamento fictício
    # Em uma implementação real, isso seria gerado pela API de pagamento
    keyboard = [
        [InlineKeyboardButton("Já realizei o pagamento", callback_data="pagamento_verificar")],
        [InlineKeyboardButton("Cancelar", callback_data="pagamento_cancelar")],
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        f"Você selecionou o {plano['nome']} por R$ {plano['preco']:.2f}.\n\n"
        f"Para confirmar, realize o pagamento via PIX:\n\n"
        f"Chave PIX: exemplo@email.com\n"
        f"Valor: R$ {plano['preco']:.2f}\n\n"
        f"Após o pagamento, clique em 'Já realizei o pagamento'.",
        reply_markup=reply_markup,
    )
    
    return PROCESSAR_PAGAMENTO

async def verificar_pagamento(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Verifica se o pagamento foi realizado"""
    query = update.callback_query
    await query.answer()
    
    # Em uma implementação real, aqui seria feita uma verificação na API de pagamento
    # Por enquanto, vamos simular um pagamento realizado com sucesso
    
    await query.edit_message_text(
        "Estamos verificando seu pagamento. Isso pode levar alguns minutos...\n\n"
        "Assim que confirmado, você será adicionado automaticamente ao grupo VIP."
    )
    
    # Simulação de pagamento realizado
    user = update.effective_user
    
    # Em uma implementação real, aqui seria chamada a API para registrar o pagamento
    # e adicionar o usuário ao grupo VIP
    
    await query.edit_message_text(
        "Pagamento confirmado! 🎉\n\n"
        "Você já tem acesso ao nosso grupo VIP. Confira seu inbox para o link de acesso.\n\n"
        "Obrigado pela compra!"
    )
    
    return ConversationHandler.END

async def cancelar_pagamento(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancela o processo de pagamento"""
    query = update.callback_query
    await query.answer()
    
    await query.edit_message_text(
        "Pagamento cancelado. Você pode escolher um plano a qualquer momento com o comando /planos."
    )
    
    return ConversationHandler.END

async def ajuda(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Mostra os comandos disponíveis"""
    await update.message.reply_text(
        "Comandos disponíveis:\n\n"
        "/start - Inicia o bot\n"
        "/planos - Mostra os planos disponíveis\n"
        "/ajuda - Mostra esta mensagem de ajuda"
    )

def main() -> None:
    """Inicializa e executa o bot"""
    # Obter o token do bot do Telegram
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN não encontrado no arquivo .env")
        return
    
    # Criar o aplicativo
    application = Application.builder().token(token).build()
    
    # Adicionar handlers
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("planos", planos)],
        states={
            SELECIONAR_PLANO: [
                CallbackQueryHandler(selecionar_plano, pattern=r"^plano_"),
            ],
            PROCESSAR_PAGAMENTO: [
                CallbackQueryHandler(verificar_pagamento, pattern=r"^pagamento_verificar$"),
                CallbackQueryHandler(cancelar_pagamento, pattern=r"^pagamento_cancelar$"),
            ],
        },
        fallbacks=[CommandHandler("planos", planos)],
    )
    
    application.add_handler(conv_handler)
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("ajuda", ajuda))
    
    # Iniciar o bot
    application.run_polling()

if __name__ == "__main__":
    main() 