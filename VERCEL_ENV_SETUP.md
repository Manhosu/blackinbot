# 🚀 Configuração de Variáveis de Ambiente no Vercel

## Variáveis Obrigatórias para Produção

Configure as seguintes variáveis de ambiente no painel do Vercel:

### 1. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://xcnhlmqkovfaqyjxwdje.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY5MDQ1NiwiZXhwIjoyMDYzMjY2NDU2fQ.-nZKTJD77uUtCglMY3zs1Jkcoq_KiZsy9NLIbJlW9Eg
```

### 2. API URLs Configuration
```
NEXT_PUBLIC_API_URL=https://blackinbot.vercel.app
API_BASE_URL=https://blackinbot.vercel.app
```

### 3. Webhook Configuration
```
WEBHOOK_DOMAIN=https://blackinbot.vercel.app
WEBHOOK_URL=https://blackinbot.vercel.app
NEXT_PUBLIC_WEBHOOK_URL=https://blackinbot.vercel.app
```

### 4. Telegram Bot Configuration
```
TELEGRAM_BOT_TOKEN=7689157266:AAFbkgijANxbFayQN1oqPdEaNknObS0Ooy0
```

### 5. NextAuth Configuration
```
NEXTAUTH_SECRET=YFfeNsY1AK38V+cBQHroLor7wwtCEdXnKzCsV+AePL8=
NEXTAUTH_URL=https://blackinbot.vercel.app
```

### 6. PushinPay Configuration
```
PUSHINPAY_API_KEY=30054|WAhgfJDCfZrHGRqsdaCvYjOh4wUncQm4rhLtHszK34b10bea
NEXT_PUBLIC_PUSHINPAY_BASE_URL=https://api.pushinpay.com.br
PUSHINPAY_WEBHOOK_URL=https://blackinbot.vercel.app/api/webhooks/pushinpay
```

### 7. Environment Configuration
```
NODE_ENV=production
NEXT_PUBLIC_NODE_ENV=production
```

## 📋 Como Configurar no Vercel

1. Acesse o painel do Vercel: https://vercel.com/dashboard
2. Selecione o projeto `blackinbot`
3. Vá em **Settings** > **Environment Variables**
4. Adicione cada variável acima uma por uma
5. Certifique-se de marcar **Production**, **Preview** e **Development** para cada variável
6. Clique em **Save** após adicionar todas

## 🔄 Redeploy

Após configurar todas as variáveis:
1. Vá em **Deployments**
2. Clique nos três pontos do último deployment
3. Selecione **Redeploy**
4. Aguarde o deploy finalizar

## ✅ Verificação

Após o deploy, verifique se:
- O site está acessível em https://blackinbot.vercel.app
- As APIs estão respondendo corretamente
- Os webhooks dos bots estão funcionando
- A autenticação está operacional

## 🚨 Importante

- **NUNCA** commite as variáveis de ambiente no código
- Mantenha as chaves seguras e não as compartilhe
- Use apenas as URLs de produção nas variáveis de webhook 