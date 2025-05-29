# 🤖 Bot do Telegram - Black-in-Bot

Este é o bot genérico do Telegram que funciona com qualquer bot criado no sistema Black-in-Bot.

## 🚀 Como funciona

1. **Usuário envia `/start`** para o bot no Telegram
2. **Bot consulta a API** do painel web (`/api/telegram/welcome`)
3. **API retorna** mensagem personalizada, mídia e planos
4. **Bot envia** a resposta formatada para o usuário
5. **Usuário é registrado** automaticamente no banco de dados

## 📋 Pré-requisitos

- Python 3.8+
- Token do bot do Telegram (via @BotFather)
- Painel web rodando na porta 3025

## ⚙️ Instalação

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Configurar variáveis de ambiente
cp env_example.txt .env
# Editar .env com seu token do bot

# 3. Executar o bot
python telegram_bot.py
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
API_BASE_URL=http://localhost:3025/api
WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
LOG_LEVEL=INFO
```

### Modo de Operação

O bot pode funcionar em dois modos:

#### 1. **Polling** (Desenvolvimento)
- Bot fica consultando o Telegram por novas mensagens
- Ideal para desenvolvimento local
- Executar: `python telegram_bot.py`

#### 2. **Webhook** (Produção)
- Telegram envia mensagens diretamente para sua API
- Mais eficiente para produção
- Requer URL pública e HTTPS

## 📱 Funcionalidades

### Comando `/start`

Quando um usuário envia `/start`:

1. **Consulta a API** com os dados do bot e usuário
2. **Personaliza mensagem** substituindo `{nome}` pelo nome do usuário
3. **Envia mídia** (foto/vídeo) se configurada
4. **Lista planos** disponíveis automaticamente
5. **Registra usuário** no banco de dados

### Exemplo de Resposta

```
Olá João! 👋

Bem-vindo ao MeuBot Premium!

💰 **Planos Disponíveis:**

1. **Plano Mensal**
   💵 R$ 9,90
   ⏰ 1 mês

2. **Plano Trimestral**
   💵 R$ 24,90
   ⏰ 3 meses

🔗 Entre em contato para adquirir seu plano!
```

## 🔗 Integração com o Painel

### API Endpoint: `/api/telegram/welcome`

**Request:**
```json
{
  "bot_token": "1234567890:ABC-DEF...",
  "user_id": 123456789,
  "chat_id": 123456789,
  "user_name": "João"
}
```

**Response:**
```json
{
  "success": true,
  "bot": {
    "id": "uuid",
    "name": "MeuBot Premium",
    "owner_id": "uuid"
  },
  "welcome": {
    "message": "Olá João! 👋\n\nBem-vindo ao MeuBot Premium!...",
    "media_url": "https://example.com/video.mp4",
    "has_media": true
  },
  "plans": [
    {
      "id": "uuid",
      "name": "Plano Mensal",
      "price": 9.90,
      "period_days": 30,
      "description": "Acesso por 1 mês",
      "is_active": true
    }
  ],
  "user_registered": true
}
```

## 🗄️ Banco de Dados

O bot automaticamente:

- **Registra usuários** na tabela `bot_users`
- **Atualiza última interação** (`last_seen`)
- **Vincula ao bot correto** via `bot_id`

## 🛠️ Estrutura do Código

```
bot/
├── telegram_bot.py       # Bot principal
├── requirements.txt      # Dependências Python
├── env_example.txt      # Exemplo de configuração
└── README.md           # Esta documentação
```

### Classes Principais

#### `BlackInBot`
- **`__init__(token)`**: Inicializa bot com token
- **`start_command()`**: Handler do comando /start
- **`get_welcome_data()`**: Consulta API de boas-vindas
- **`set_webhook()`**: Configura webhook
- **`start_polling()`**: Inicia em modo polling

## 🚀 Deploy

### Desenvolvimento Local

```bash
# Executar o painel web
cd web && npm run dev

# Em outro terminal, executar o bot
cd bot && python telegram_bot.py
```

### Produção

1. **Hospedar o painel** (Vercel, Railway, etc.)
2. **Hospedar o bot** (Railway, Heroku, VPS)
3. **Configurar webhook** para melhor performance

## 🔍 Logs e Debugging

O bot fornece logs detalhados:

```
2025-01-25 10:30:00 - INFO - 🤖 Bot inicializado com token: 1234567890...
2025-01-25 10:30:15 - INFO - 📨 /start recebido de João (ID: 123456789)
2025-01-25 10:30:16 - INFO - ✅ Dados de boas-vindas obtidos da API
2025-01-25 10:30:17 - INFO - ✅ Boas-vindas enviadas para João no bot MeuBot Premium
```

## 🧪 Teste

Para testar o bot:

1. **Configure** as variáveis de ambiente
2. **Execute** o bot em modo polling
3. **Envie** `/start` para seu bot no Telegram
4. **Verifique** se a mensagem personalizada é enviada

## ❓ Troubleshooting

### Bot não responde
- Verificar se o token está correto
- Verificar se a API está rodando na porta 3025
- Verificar logs para erros de conexão

### Mensagem não personalizada
- Verificar se o bot existe no banco de dados
- Verificar se os planos estão ativos
- Verificar estrutura da API response

### Mídia não enviada
- Verificar se a URL da mídia está acessível
- Verificar formato do arquivo (JPG, PNG, MP4)
- Ver logs para erros específicos 