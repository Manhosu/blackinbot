# Guia de Configuração do Black-In-Bot

Este guia contém todas as etapas necessárias para configurar e executar o sistema Black-In-Bot.

## 1. Configuração do Ambiente

### 1.1 Ambiente Virtual
Se ainda não tiver feito, crie e ative um ambiente virtual Python:

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual (Windows)
.\venv\Scripts\activate.bat

# Ativar ambiente virtual (Linux/Mac)
source venv/bin/activate
```

### 1.2 Instalar Dependências
Instale todas as dependências do projeto:

```bash
pip install -r requirements.txt
```

### 1.3 Configurar Variáveis de Ambiente
Edite o arquivo `.env` na raiz do projeto e preencha com os dados corretos:

```
# Configurações do Supabase
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_supabase

# Configurações do Bot Telegram
TELEGRAM_BOT_TOKEN=token_do_bot_principal
TELEGRAM_WEBHOOK_URL=https://seu-dominio.com/api/telegram/webhook

# Configurações do FastAPI
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=True

# Gateways de Pagamento
PUSHINPAY_API_KEY=sua_chave_pushinpay
MERCADOPAGO_ACCESS_TOKEN=seu_token_mercadopago
```

## 2. Configuração do Supabase

### 2.1 Criar Tabelas
No console do Supabase, navegue até "SQL Editor" e execute o script SQL que está no arquivo `supabase_schema.sql`.

Este script irá criar todas as tabelas necessárias para o funcionamento do sistema:
- `users`: usuários do sistema
- `bots`: bots cadastrados
- `groups`: grupos do Telegram
- `plans`: planos de assinatura
- `payments`: pagamentos realizados
- `sales`: vendas concluídas
- `reminders`: lembretes para usuários

### 2.2 Configurar Autenticação (opcional)
Se desejar usar o sistema de autenticação do Supabase:

1. Navegue até "Authentication" > "Providers"
2. Habilite "Email" para autenticação por email
3. Configure as opções de acordo com suas necessidades

## 3. Configuração do Bot Telegram

### 3.1 Criar Bot no BotFather
1. Abra o Telegram e busque por "@BotFather"
2. Envie o comando `/newbot`
3. Siga as instruções para criar um novo bot
4. Guarde o token fornecido e adicione-o ao arquivo `.env` (TELEGRAM_BOT_TOKEN)

### 3.2 Configurar Comandos do Bot
No BotFather, use o comando `/setcommands` e envie:
```
start - Iniciar o bot
planos - Ver planos disponíveis
ajuda - Obter ajuda
```

## 4. Configuração dos Gateways de Pagamento

### 4.1 PushinPay (PIX)
1. Crie uma conta no PushinPay
2. Obtenha sua API Key
3. Adicione ao arquivo `.env` (PUSHINPAY_API_KEY)

### 4.2 Mercado Pago
1. Crie uma conta no Mercado Pago Developer
2. Crie uma aplicação para obter o Access Token
3. Adicione ao arquivo `.env` (MERCADOPAGO_ACCESS_TOKEN)

## 5. Execução do Sistema

### 5.1 Iniciar o Backend
Execute o servidor FastAPI:

```bash
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 Configurar Webhook
Para desenvolvimento local, recomenda-se usar o ngrok para expor seu servidor local:

```bash
ngrok http 8000
```

Copie a URL HTTPS fornecida pelo ngrok e atualize o arquivo `.env` (TELEGRAM_WEBHOOK_URL) com o seguinte formato:
```
TELEGRAM_WEBHOOK_URL=https://seu-dominio-ngrok.ngrok.io/api/telegram/webhook/{seu_token_bot}
```

### 5.3 Testar o Sistema
1. Acesse a documentação da API: http://localhost:8000/docs
2. Cadastre um usuário
3. Cadastre um bot
4. Crie um grupo no Telegram e adicione seu bot como administrador
5. Cadastre o grupo no sistema
6. Crie planos de acesso
7. Teste o fluxo de pagamento

## 6. Implantação em Produção

### 6.1 Railway ou Render
Para implantar o sistema em produção, recomenda-se usar plataformas como Railway ou Render:

1. Conecte seu repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy do projeto

### 6.2 Configuração do Webhook em Produção
Após o deploy, configure o webhook do Telegram para apontar para sua URL de produção:

```
https://seu-dominio.com/api/telegram/webhook/{seu_token_bot}
```

## 7. Manutenção e Monitoramento

### 7.1 Logs
O sistema registra logs detalhados que podem ser úteis para debugging:

- Logs do backend: no console do servidor
- Logs do Supabase: no painel do Supabase

### 7.2 Backup
Recomenda-se configurar backups regulares do banco de dados no Supabase.

## 8. Próximos Passos

### 8.1 Frontend Web
Desenvolver o painel administrativo usando Next.js e TailwindCSS.

### 8.2 Melhorias
- Implementar sistema de remarketing
- Adicionar mais opções de pagamento
- Criar dashboards avançados 