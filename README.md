# Black-In-Bot

Sistema de bots para venda de acesso a grupos VIP no Telegram, inspirado no MadBot.

## Estrutura do Projeto

- `/bot/` - Código do bot do Telegram (python-telegram-bot)
- `/api/` - Backend com FastAPI (recebe webhooks, cria endpoints REST)
- `/web/` - Painel administrativo com Next.js

## Tecnologias Utilizadas

- **Backend**: Python, FastAPI, python-telegram-bot
- **Frontend**: Next.js, TailwindCSS
- **Banco de dados**: Supabase (PostgreSQL + Auth + Storage)
- **Pagamentos**: PushinPay (PIX BRL) e Mercado Pago
- **Hospedagem**: Railway, Vercel ou Render

## Funcionalidades

1. Cadastro e login de clientes
2. Criação de bots personalizados
3. Criação de planos de acesso
4. Integração com gateways de pagamento
5. Sistema de remarketing
6. Painel administrativo completo
7. Controle financeiro
8. Configuração guiada por wizard

3. Executar o servidor de desenvolvimento:
```bash
npm run dev
```

O servidor estará disponível em [http://localhost:3025](http://localhost:3025). 