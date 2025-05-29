# 🚀 Sistema de Webhook Dinâmico - Black-in-Bot

Sistema completo de bots do Telegram usando webhooks dinâmicos baseados em `botId`, com suporte a múltiplos bots, mídia personalizada e planos interativos.

## 📋 Índice

- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Estrutura de Endpoints](#estrutura-de-endpoints)
- [Funcionalidades](#funcionalidades)
- [Configuração](#configuração)
- [Deploy na Vercel](#deploy-na-vercel)
- [Testes](#testes)

## 🏗️ Arquitetura do Sistema

### **Webhook Dinâmico por Bot**
Cada bot possui sua própria URL de webhook baseada em seu ID único:
```
https://seu-app.vercel.app/api/webhook/{BOT_ID}
```

### **Componentes Principais**

#### 1. **Biblioteca Telegram** (`/src/lib/telegram.ts`)
- 🔄 Gerenciamento de handlers por bot
- 💾 Cache inteligente de configurações
- 🎯 Processamento específico por tipo de update
- 🛡️ Tratamento de erros robusto

#### 2. **Endpoint Dinâmico** (`/src/app/api/webhook/[botId]/route.ts`)
- 🆔 Identificação automática do bot por ID
- 🔀 Roteamento para handler específico
- ✅ Validação de parâmetros
- 🚫 Bloqueio de métodos não permitidos

#### 3. **API de Configuração** (`/src/app/api/telegram/setup-webhook/route.ts`)
- ⚙️ Configuração automatizada de webhooks
- 🔧 Gerenciamento de múltiplos bots
- 📊 Verificação de status
- 🗑️ Remoção de webhooks

## 🌐 Estrutura de Endpoints

### **Webhooks Dinâmicos**
```
POST /api/webhook/{botId}
```
- Recebe updates do Telegram para bot específico
- Processa automaticamente: `/start`, callbacks, códigos de ativação

### **Configuração de Webhooks**
```
POST /api/telegram/setup-webhook
GET  /api/telegram/setup-webhook
DELETE /api/telegram/setup-webhook
```

### **Gestão de Bots**
```
GET /api/telegram/bots
```
- Lista todos os bots com tokens (uso interno)

### **Dashboard**
```
GET /dashboard/webhooks
```
- Interface visual para monitoramento

## 🎯 Funcionalidades

### **1. Comando /start**
```typescript
// Funcionalidades:
✅ Mensagem personalizada por bot
✅ Mídia (foto/vídeo) personalizada
✅ Botões interativos com planos
✅ Cache de configurações
```

**Exemplo de resposta:**
- 🖼️ Imagem/vídeo de boas-vindas
- 📝 Texto personalizado
- 🔘 Botões com planos e preços

### **2. Seleção de Planos**
```typescript
// Callback handlers:
✅ Resposta imediata ao clique
✅ Edição da mensagem original
✅ Confirmação visual
✅ Informações detalhadas do plano
```

### **3. Códigos de Ativação**
```typescript
// Formato: XXXX-XXXX
✅ Validação automática em grupos
✅ Verificação de expiração
✅ Rastreamento de uso
✅ Ativação do bot
```

### **4. Mídia Personalizada**
```sql
-- Campos no banco:
welcome_text         -- Texto de boas-vindas
welcome_media_url    -- URL da mídia
welcome_media_type   -- 'photo' ou 'video'
```

## ⚙️ Configuração

### **1. Variáveis de Ambiente**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Webhook (produção)
VERCEL_URL=https://seu-app.vercel.app
WEBHOOK_DOMAIN=https://seu-app.vercel.app
```

### **2. Banco de Dados**

#### **Tabela: bots**
```sql
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  welcome_text TEXT,
  welcome_media_url TEXT,
  welcome_media_type VARCHAR(10) DEFAULT 'photo',
  webhook_url TEXT,
  webhook_configured_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by_user_id BIGINT,
  activated_in_chat_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Tabela: plans**
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Tabela: bot_activation_codes**
```sql
CREATE TABLE bot_activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id),
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_user_id BIGINT,
  used_in_chat_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Deploy na Vercel

### **1. Preparação**
```bash
# Instalar dependências
cd web
npm install

# Build do projeto
npm run build
```

### **2. Deploy**
```bash
# Via Vercel CLI
vercel

# Ou conectar GitHub repository
# https://vercel.com/new
```

### **3. Configurar Webhooks**
```bash
# Após deploy, configurar webhooks
cd bot
export VERCEL_URL=https://seu-app.vercel.app
python setup_webhooks_vercel.py

# Verificar status
python setup_webhooks_vercel.py status
```

### **4. Verificação**
```bash
# Testar endpoint
curl -X POST https://seu-app.vercel.app/api/webhook/{BOT_ID} \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"message_id":1,"from":{"id":123,"is_bot":false,"first_name":"Test"},"chat":{"id":123,"type":"private"},"date":1735107600,"text":"/start"}}'
```

## 🧪 Testes

### **1. Teste Local**
```bash
# Iniciar servidor
cd web
npm run dev

# Testar endpoints
cd ../bot
$botId = "seu-bot-id"
$body = '{"update_id":123,"message":{"text":"/start","chat":{"id":123,"type":"private"},"from":{"id":123,"is_bot":false,"first_name":"Test"},"date":1735107600}}'
Invoke-RestMethod -Uri "http://localhost:3025/api/webhook/$botId" -Method Post -Body $body -ContentType "application/json"
```

### **2. Teste de Produção**
```bash
# Enviar mensagem real para bot
# Verificar logs na Vercel
# Monitorar dashboard em /dashboard/webhooks
```

## 📊 Monitoramento

### **1. Logs**
- **Vercel Functions**: Logs automáticos por função
- **Console Browser**: Debugs em tempo real
- **Supabase**: Logs do banco de dados

### **2. Dashboard**
```
https://seu-app.vercel.app/dashboard/webhooks
```
- 📊 Status de todos os bots
- 🔗 URLs dos webhooks
- ⏰ Timestamps de configuração
- ❗ Erros e alertas

### **3. Verificação de Status**
```bash
# Via API
curl https://seu-app.vercel.app/api/telegram/setup-webhook

# Via script
python setup_webhooks_vercel.py status
```

## 🔧 Personalização

### **1. Adicionar Novo Bot**
```sql
INSERT INTO bots (name, token, username, welcome_text, welcome_media_url) 
VALUES (
  'Meu Bot',
  '1234567890:AAABBBCCCDDDEEEFFFGGGHHH',
  'meu_bot',
  '🎉 *Bem-vindo ao Meu Bot!*\n\nEscolha um plano:',
  'https://example.com/welcome.jpg'
);
```

### **2. Configurar Planos**
```sql
INSERT INTO plans (name, price) VALUES 
('Básico', 29.90),
('Premium', 79.90),
('VIP', 199.90);
```

### **3. Gerar Código de Ativação**
```sql
INSERT INTO bot_activation_codes (bot_id, code, expires_at) 
VALUES (
  'bot-uuid-aqui',
  'PROD-2025',
  NOW() + INTERVAL '10 minutes'
);
```

## 🛡️ Segurança

### **1. Validações**
- ✅ Validação de botId na URL
- ✅ Verificação de tokens válidos
- ✅ Sanitização de inputs
- ✅ Rate limiting via Vercel

### **2. RLS Policies**
```sql
-- Política para acesso da API
CREATE POLICY "API pode ativar bots" ON bots 
FOR ALL USING (true);

-- Política para planos públicos
CREATE POLICY "Planos são públicos" ON plans 
FOR SELECT USING (true);
```

## 📈 Escalabilidade

### **Suporte a Múltiplos Bots**
- ✅ Cada bot tem endpoint próprio
- ✅ Cache independente por bot
- ✅ Configuração isolada
- ✅ Monitoramento individual

### **Performance**
- ⚡ Cache em memória
- 🔄 Conexões reutilizadas
- 📊 Queries otimizadas
- 🚀 Serverless Vercel Functions

## 🆘 Troubleshooting

### **Webhook não funciona**
```bash
# 1. Verificar configuração
python setup_webhooks_vercel.py status

# 2. Reconfigurar
python setup_webhooks_vercel.py

# 3. Verificar logs
# Acessar Vercel Dashboard > Functions > Logs
```

### **Bot não responde**
1. ✅ Verificar se webhook está ativo
2. ✅ Verificar token do bot
3. ✅ Verificar logs da função
4. ✅ Testar endpoint manualmente

### **Erro de cache**
```typescript
// Limpar cache manualmente
botCache.clear();
planCache.clear();
```

## 🎉 Conclusão

O sistema de webhook dinâmico oferece:

- 🔄 **Escalabilidade**: Suporte ilimitado de bots
- ⚡ **Performance**: Cache inteligente e otimizações
- 🛠️ **Flexibilidade**: Configuração independente por bot
- 🔒 **Segurança**: Validações e isolamento
- 📊 **Monitoramento**: Dashboard e logs completos
- 🚀 **Produção**: Deploy simples na Vercel

**Sistema 100% funcional e pronto para produção!** 🎊 