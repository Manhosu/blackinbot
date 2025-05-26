# 🚀 Guia de Deploy para Produção - Vercel

Este guia mostra como fazer deploy do sistema Black-in-Bot na Vercel com suporte a múltiplos bots via webhook.

## 📋 Pré-requisitos

1. **Conta na Vercel**: [vercel.com](https://vercel.com)
2. **Projeto no Supabase** configurado com:
   - Tabelas: `bots`, `bot_activation_codes`, `plans`
   - RLS policies configuradas
   - API Keys
3. **Bots do Telegram** criados via @BotFather

## 🛠️ Configuração Inicial

### 1. Configurar Variáveis de Ambiente na Vercel

No painel da Vercel, vá em **Settings > Environment Variables** e adicione:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_key
```

### 2. Deploy do Projeto

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
cd web
vercel --prod
```

### 3. Configurar Domínio (Opcional)

Na Vercel, vá em **Settings > Domains** e configure seu domínio personalizado.

## 🔗 Configuração de Webhooks

### Passo 1: Configurar Bots no Banco

Certifique-se que seus bots estão cadastrados na tabela `bots` com:

```sql
INSERT INTO bots (name, token, username, is_activated, welcome_message) VALUES
('Meu Bot 1', '123456789:AAG...', 'meubot1', true, 'Bem-vindo ao meu bot!'),
('Meu Bot 2', '987654321:BBH...', 'meubot2', true, 'Olá! Como posso ajudar?');
```

### Passo 2: Configurar Webhooks Automaticamente

1. **Via Dashboard**: Acesse `/dashboard/webhooks` e clique em "Configurar Webhooks Automaticamente"

2. **Via API Manual**:
```bash
curl -X POST https://seu-app.vercel.app/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://seu-app.vercel.app"}'
```

### Passo 3: Verificar Status

```bash
curl https://seu-app.vercel.app/api/telegram/setup-webhook
```

## 🤖 Estrutura de Múltiplos Bots

### URLs de Webhook

Cada bot terá sua própria URL de webhook:

```
https://seu-app.vercel.app/api/telegram/webhook?token=BOT_TOKEN_1
https://seu-app.vercel.app/api/telegram/webhook?token=BOT_TOKEN_2
```

### Configuração Dinâmica

O sistema automaticamente:
- ✅ Identifica o bot pelo token na URL
- ✅ Carrega configurações do banco de dados
- ✅ Processa comandos específicos do bot
- ✅ Aplica personalizações (mídia, texto, planos)

## 📱 Funcionalidades por Bot

### Comando /start
- **Bot não ativado**: Exibe instruções de ativação
- **Bot ativado**: Mostra mídia personalizada + planos

### Códigos de Ativação
- Detecta códigos `XXXX-XXXX` em grupos
- Valida contra o banco de dados
- Ativa o bot automaticamente

### Seleção de Planos
- Botões inline dinâmicos
- Preços do banco de dados
- Integração com sistema de pagamento

## 🎨 Personalização por Bot

### Campos Personalizáveis

```typescript
interface BotConfig {
  name: string;              // Nome do bot
  token: string;             // Token do Telegram
  username: string;          // @username
  welcome_message: string;   // Texto personalizado
  welcome_media_url?: string; // URL da mídia
  welcome_media_type?: 'photo' | 'video'; // Tipo
}
```

### Upload de Mídia

Use a API `/api/media/upload` para fazer upload de imagens/vídeos:

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('bot_id', botId);

const response = await fetch('/api/media/upload', {
  method: 'POST',
  body: formData
});
```

## 🔄 Gerenciamento de Webhooks

### Comandos Úteis

```bash
# Configurar webhook para bot específico
curl -X POST https://seu-app.vercel.app/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "uuid-do-bot"}'

# Remover webhook
curl -X DELETE https://seu-app.vercel.app/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "uuid-do-bot"}'

# Status de todos os webhooks
curl https://seu-app.vercel.app/api/telegram/setup-webhook
```

### Dashboard de Monitoramento

Acesse `/dashboard/webhooks` para:
- ✅ Ver status de todos os bots
- ✅ Configurar/remover webhooks
- ✅ Monitorar erros
- ✅ Copiar URLs de webhook

## 🐛 Troubleshooting

### Bot não responde
1. Verifique se o webhook está ativo
2. Confirme o token no banco de dados
3. Verifique logs da Vercel

### Webhook com erro
1. Vá em `/dashboard/webhooks`
2. Verifique a mensagem de erro
3. Reconfigure o webhook

### Mídia não carrega
1. Confirme a URL da mídia
2. Verifique se é uma URL pública
3. Teste o tipo de mídia (photo/video)

## 🔧 APIs Disponíveis

### Webhook Principal
```
POST /api/telegram/webhook?token=BOT_TOKEN
```

### Configuração de Webhook
```
POST   /api/telegram/setup-webhook
DELETE /api/telegram/setup-webhook  
GET    /api/telegram/setup-webhook
```

### Telegram APIs
```
POST /api/telegram/config
POST /api/telegram/activate-bot
POST /api/telegram/list-plans
```

### Gerenciamento
```
POST /api/bots/generate-activation-code
POST /api/media/upload
```

## 🚀 Deploy em Produção

### Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Bots cadastrados no banco
- [ ] Webhooks configurados
- [ ] Domínio personalizado (opcional)
- [ ] Teste de ativação funcionando
- [ ] Planos configurados
- [ ] Mídia de boas-vindas testada

### Monitoramento

- **Logs**: Vercel Dashboard > Functions
- **Webhooks**: `/dashboard/webhooks`
- **Banco**: Supabase Dashboard
- **Telegram**: @BotFather > Bot Settings

## 🎯 Próximos Passos

1. **Pagamentos**: Integrar PIX/MercadoPago
2. **Analytics**: Adicionar métricas
3. **Automações**: Campanhas de remarketing
4. **Backup**: Rotinas de backup automático

---

**🎉 Sistema pronto para produção com suporte a múltiplos bots via webhook na Vercel!** 