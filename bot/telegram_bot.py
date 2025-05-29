#!/usr/bin/env python3
"""
Bot do Telegram para o sistema Black-in-Bot
Sistema completo de ativação e vendas
"""

import os
import asyncio
import logging
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import aiohttp
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from telegram.constants import ParseMode

# Carregar variáveis de ambiente
load_dotenv()

# Configuração de logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configurações
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:3025')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

if not BOT_TOKEN:
    BOT_TOKEN = "7940039994:AAGLXFQNGHasfyrjsmTSvWTjQ2c-_0Dfy2w"

print(f"🔑 Token: {BOT_TOKEN[:25]}...")
print(f"🌐 API: {API_BASE_URL}")

class BotManager:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def init_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def make_request(self, method: str, url: str, **kwargs) -> Dict:
        await self.init_session()
        try:
            async with self.session.request(method, url, **kwargs) as response:
                if response.content_type == 'application/json':
                    return await response.json()
                else:
                    text = await response.text()
                    return {'error': f'Resposta não-JSON: {text}'}
        except Exception as e:
            logger.error(f"Erro na requisição {method} {url}: {e}")
            return {'error': str(e)}
    
    async def check_activation_code(self, code: str) -> Dict:
        """Verificar se código de ativação é válido"""
        try:
            url = f"{API_BASE_URL}/api/telegram/activate-bot"
            response = await self.make_request('POST', url, json={
                'activation_code': code,
                'telegram_user_id': '0',
                'chat_id': '0',
                'chat_type': 'check'
            })
            return response
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def activate_bot(self, code: str, user_id: str, chat_id: str) -> Dict:
        """Ativar bot com código"""
        try:
            url = f"{API_BASE_URL}/api/telegram/activate-bot"
            response = await self.make_request('POST', url, json={
                'activation_code': code,
                'telegram_user_id': user_id,
                'chat_id': chat_id,
                'chat_type': 'supergroup'
            })
            return response
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_bot_config(self) -> Dict:
        """Buscar configuração do bot"""
        try:
            url = f"{API_BASE_URL}/api/telegram/config"
            response = await self.make_request('POST', url, json={'token': BOT_TOKEN})
            return response
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_plans(self, bot_id: str) -> Dict:
        """Buscar planos do bot"""
        try:
            url = f"{API_BASE_URL}/api/telegram/list-plans"
            response = await self.make_request('POST', url, json={'bot_id': bot_id})
            return response
        except Exception as e:
            return {'success': False, 'error': str(e)}

# Instância global
bot_manager = BotManager()

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para comando /start"""
    try:
        print(f"🔄 /start recebido de usuário {update.effective_user.id}")
        
        # Buscar configuração do bot
        config_response = await bot_manager.get_bot_config()
        
        if not config_response.get('success'):
            await update.message.reply_text(
                "❌ Erro ao carregar configuração do bot. Tente novamente mais tarde."
            )
            return
        
        bot_data = config_response.get('bot')
        if not bot_data:
            await update.message.reply_text(
                "❌ Bot não encontrado na base de dados."
            )
            return
        
        # Verificar se bot está ativado
        if not bot_data.get('is_activated'):
            message = """
🤖 **Bot ainda não ativado**

Este bot ainda não foi ativado pelo proprietário.

📋 **Para ativar:**
1. Adicione este bot a um grupo como administrador
2. Gere um código de ativação no painel
3. Envie o código no grupo (formato: XXXX-XXXX)

⏰ Códigos expiram em 10 minutos
            """
            await update.message.reply_text(message.strip(), parse_mode=ParseMode.MARKDOWN)
            return
        
        print(f"✅ Bot ativado! Carregando planos...")
        
        # Bot ativado - buscar planos
        plans_response = await bot_manager.get_plans(bot_data['id'])
        
        if not plans_response.get('success'):
            await update.message.reply_text(
                "❌ Erro ao carregar planos. Tente novamente mais tarde."
            )
            return
        
        plans = plans_response.get('plans', [])
        
        # Mensagem de boas-vindas
        welcome_message = bot_data.get('welcome_message', f"🤖 Bem-vindo ao {bot_data['name']}!")
        
        if not plans:
            await update.message.reply_text(
                f"{welcome_message}\n\n❌ Nenhum plano disponível no momento."
            )
            return
        
        # Criar botões dos planos
        keyboard = []
        for plan in plans:
            price_text = f"R$ {plan['price']:.2f}".replace('.', ',')
            button_text = f"💎 {plan['name']} - {price_text}"
            callback_data = f"plan_{plan['id']}"
            keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Enviar mensagem com mídia se disponível
        media_url = bot_data.get('welcome_media_url')
        media_type = bot_data.get('welcome_media_type')
        
        try:
            if media_url and media_type == 'photo':
                await context.bot.send_photo(
                    chat_id=update.effective_chat.id,
                    photo=media_url,
                    caption=welcome_message,
                    reply_markup=reply_markup,
                    parse_mode=ParseMode.MARKDOWN
                )
            elif media_url and media_type == 'video':
                await context.bot.send_video(
                    chat_id=update.effective_chat.id,
                    video=media_url,
                    caption=welcome_message,
                    reply_markup=reply_markup,
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await update.message.reply_text(
                    welcome_message,
                    reply_markup=reply_markup,
                    parse_mode=ParseMode.MARKDOWN
                )
        except Exception as e:
            print(f"❌ Erro ao enviar mídia: {e}")
            await update.message.reply_text(
                welcome_message,
                reply_markup=reply_markup,
                parse_mode=ParseMode.MARKDOWN
            )
        
        print(f"✅ Mensagem de boas-vindas enviada para usuário {update.effective_user.id}")
        
    except Exception as e:
        print(f"❌ Erro no /start: {e}")
        await update.message.reply_text(
            "❌ Erro interno. Tente novamente mais tarde."
        )

async def group_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para mensagens nos grupos (códigos de ativação)"""
    try:
        message_text = update.message.text.strip().upper()
        user_id = update.effective_user.id
        chat_id = update.effective_chat.id
        
        print(f"📱 Mensagem no grupo: '{message_text}' de {user_id} no chat {chat_id}")
        
        # Verificar se é código de ativação (formato: XXXX-XXXX)
        if not re.match(r'^[A-Z0-9]{4}-[A-Z0-9]{4}$', message_text):
            print(f"⚠️ Não é código de ativação: {message_text}")
            return
        
        print(f"🔑 Código de ativação detectado: {message_text}")
        
        # Verificar e ativar bot
        result = await bot_manager.activate_bot(message_text, str(user_id), str(chat_id))
        
        print(f"🔄 Resultado: {result}")
        
        if result.get('success'):
            print(f"🎉 BOT ATIVADO COM SUCESSO!")
            await update.message.reply_text(
                "✅ Bot ativado com sucesso!",
                reply_to_message_id=update.message.message_id
            )
        else:
            error_msg = result.get('message', 'Código inválido ou expirado')
            print(f"❌ Erro na ativação: {error_msg}")
            await update.message.reply_text(
                f"❌ {error_msg}",
                reply_to_message_id=update.message.message_id
            )
    
    except Exception as e:
        print(f"❌ Erro ao processar mensagem do grupo: {e}")

async def plan_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para seleção de planos"""
    try:
        query = update.callback_query
        await query.answer()
        
        if not query.data.startswith('plan_'):
            return
        
        plan_id = query.data.replace('plan_', '')
        print(f"💎 Plano selecionado: {plan_id}")
        
        # Aqui você pode implementar a lógica de pagamento
        await query.edit_message_text(
            f"💳 Plano selecionado!\n\nEm breve você receberá as instruções de pagamento.",
            parse_mode=ParseMode.MARKDOWN
        )
        
    except Exception as e:
        print(f"❌ Erro na seleção de plano: {e}")

def main():
    """Função principal"""
    if not BOT_TOKEN:
        print("❌ TOKEN não configurado!")
        return
    
    print(f"🚀 Iniciando bot...")
    
    # Criar aplicação
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    
    # Configurar handlers
    print("⚙️ Configurando handlers...")
    
    # Handler para /start
    app.add_handler(CommandHandler("start", start_command))
    
    # Handler para mensagens em grupos (códigos de ativação)
    app.add_handler(MessageHandler(
        filters.TEXT & filters.ChatType.GROUPS & ~filters.COMMAND, 
        group_message_handler
    ))
    
    # Handler para callback de planos
    app.add_handler(CallbackQueryHandler(plan_callback_handler, pattern=r"^plan_"))
    
    print("📱 Iniciando polling...")
    print("🔥 BOT FUNCIONANDO!")
    
    # Iniciar polling
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main() 