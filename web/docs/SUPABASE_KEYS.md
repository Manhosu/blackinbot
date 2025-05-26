# 🔑 Guia de Chaves do Supabase - BLACKINPAY

## 📋 **Resumo das Chaves**

### **NEXT_PUBLIC_SUPABASE_ANON_KEY** (Cliente + Algumas APIs)
- ✅ Respeita RLS (Row Level Security)
- ✅ Frontend (componentes React) 
- ✅ APIs que acessam dados do usuário autenticado
- ✅ Autenticação de usuários

### **SUPABASE_SERVICE_ROLE_KEY** (Apenas Servidor)
- ⚠️ **BYPASS RLS** - Acesso total ao banco
- ✅ Webhooks (processamento automático)
- ✅ APIs administrativas
- ✅ Operações entre usuários diferentes

---

## 🎯 **APIs que PRECISAM de Service Role Key:**

### ✅ **Webhooks** - `/api/webhooks/pushinpay/route.ts`
**Por quê?** Processa pagamentos automaticamente, cria vendas e acessos para qualquer usuário
```typescript
// ✅ CORRETO - Precisa de Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### ✅ **Status de Pagamento** - `/api/payments/[id]/status/route.ts`
**Por quê?** Atualiza status de pagamentos e cria acessos para usuários
```typescript
// ✅ CORRETO - Precisa de Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### ✅ **Saque** - `/api/financeiro/solicitar-saque/route.ts`
**Por quê?** Manipula saldos e transações financeiras entre usuários
```typescript
// ✅ CORRETO - Precisa de Service Role Key para split financeiro
```

---

## 🚫 **APIs que PODEM usar Anon Key:**

### ❓ **Criar Pagamento** - `/api/payments/create/route.ts`
**Situação atual:** Usa Service Role Key
**Poderia usar:** Anon Key com RLS configurado

### ❓ **Ativar Bot** - `/api/telegram/activate-bot/route.ts`
**Situação atual:** Agora usa supabase padrão (Anon Key)
**Status:** ✅ Correto após correção

---

## 🛠️ **Configuração Recomendada**

### **1. Variáveis de Ambiente Obrigatórias:**
```env
# Cliente (públicas)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Servidor (privadas)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### **2. Validação nas APIs:**
```typescript
// Para APIs que precisam de Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
}
```

### **3. Frontend e APIs com RLS:**
```typescript
// Usar o cliente padrão
import { supabase } from '@/lib/supabase';
```

---

## 🔒 **Segurança**

### **❌ NUNCA fazer:**
- Usar Service Role Key no frontend
- Hardcodar chaves no código
- Fazer commit de chaves no repositório

### **✅ SEMPRE fazer:**
- Service Role Key apenas em variáveis de ambiente
- Validar se as chaves existem antes de usar
- Usar Anon Key quando possível (com RLS)

---

## 📦 **Para Deploy no Vercel**

### **Variáveis obrigatórias:**
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
3. `SUPABASE_SERVICE_ROLE_KEY` (apenas para APIs específicas)
4. `NEXT_PUBLIC_PUSHINPAY_API_KEY`
5. `WEBHOOK_URL` (URL do deploy + /api/webhooks/pushinpay)

### **Comando para testar:**
```bash
# Verificar se todas as variáveis estão configuradas
npm run build
``` 