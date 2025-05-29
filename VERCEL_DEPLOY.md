# 🚀 Deploy no Vercel - Black In Bot

## ✅ **Variáveis de Ambiente Necessárias**

Configure as seguintes variáveis no painel do Vercel:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xcnhlmqkovfaqyjxwdje.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY5MDQ1NiwiZXhwIjoyMDYzMjY2NDU2fQ.-nZKTJD77uUtCglMY3zs1Jkcoq_KiZsy9NLIbJlW9Eg

# Gateway de Pagamento
PUSHINPAY_API_KEY=30054|WAhgfJDCfZrHGRqsdaCvYjOh4wUncQm4rhLtHszK34b10bea
PUSHINPAY_BASE_URL=https://api.pushinpay.com.br

# Bot Telegram
TELEGRAM_BOT_TOKEN=8024035874:AAFkCR5uyBamtuP35OiyiiQtssZurZ6rjic

# URL da Aplicação (IMPORTANTE!)
NEXT_PUBLIC_APP_URL=https://blackinbot.vercel.app

# Opcional - Segurança do Webhook
TELEGRAM_SECRET_TOKEN=blackinbot2025secure
```

## 🔧 **Configurações do Projeto**

### Build Command:
```bash
cd web && npm run build
```

### Output Directory:
```bash
web/.next
```

### Install Command:
```bash
cd web && npm install
```

### Framework Preset:
```
Next.js
```

## 📱 **Configuração do Webhook do Bot**

Após o deploy, configure o webhook do bot usando a API:

```bash
POST https://blackinbot.vercel.app/api/telegram/set-webhook
Content-Type: application/json

{
  "botToken": "8024035874:AAFkCR5uyBamtuP35OiyiiQtssZurZ6rjic",
  "webhookUrl": "https://blackinbot.vercel.app/api/telegram/webhook"
}
```

## 🐛 **Debug de Problemas**

### 1. Erro 413 (Payload Too Large)
- ✅ Ajustado limite para 4MB nos uploads
- ✅ Configurado memory: 1024MB nas functions

### 2. Bot não responde
- Verificar webhook: `GET /api/telegram/set-webhook?botToken=SEU_TOKEN`
- Reconfigurar webhook se necessário

### 3. Upload não funciona
- Verificar políticas RLS do Supabase
- Verificar bucket 'bot-media' existe e é público

## 🔍 **Monitoramento**

### Logs da API:
```bash
vercel logs --project=blackinbot
```

### Teste de saúde:
```bash
GET https://blackinbot.vercel.app/api/health
```

## 🎯 **Checklist Pós-Deploy**

- [ ] Variáveis de ambiente configuradas
- [ ] Webhook do bot configurado
- [ ] Upload de mídia funcionando
- [ ] Planos sendo exibidos no bot
- [ ] Pagamento PIX sendo gerado
- [ ] Dashboard web acessível

---

**Status**: ✅ Pronto para deploy
**Data**: 2025-01-27 