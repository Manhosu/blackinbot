# Configuração de Variáveis de Ambiente

Crie um arquivo `.env.local` na pasta `web/` com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xcnhlmqkovfaqyjxwdje.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmhsbXFrb3ZmYXF5anh3ZGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2OTA0NTYsImV4cCI6MjA2MzI2NjQ1Nn0.SXKnumGDPPBryp0UOuvCK0_9XZ8SdWq35BR_JqlrG4U
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000

# Pushin Pay (Payment Gateway)
PUSHINPAY_API_KEY=30054|WAhgfJDCfZrHGRqsdaCvYjOh4wUncQm4rhLtHszK34b10bea
PUSHINPAY_WEBHOOK_URL=http://localhost:3025/api/webhooks/pushinpay
NEXT_PUBLIC_PUSHINPAY_BASE_URL=https://api.pushinpay.com.br

# App Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3025

# Development
NODE_ENV=development
```

## Como obter as credenciais:

1. **Supabase**: ✅ URLs e chaves já configuradas acima
2. **PushinPay**: ✅ API Key já configurada
3. **Service Role Key**: Acesse seu projeto no Supabase > Settings > API > service_role key
4. **NextAuth Secret**: Gere uma string aleatória segura

## Próximos passos:

1. Copie o conteúdo acima para `web/.env.local`
2. Substitua `your_service_role_key_here` pela chave real do Supabase
3. Substitua `your_nextauth_secret_here` por uma string aleatória
4. Reinicie o servidor de desenvolvimento

## Testando a configuração:

```bash
cd web
npm run dev
```

O servidor deve iniciar na porta 3025 sem erros. 