-- Usuários
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  telegram_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Bots
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  username TEXT,
  description TEXT,
  welcome_message TEXT,
  owner_id UUID REFERENCES public.users(id),
  webhook_url TEXT,
  webhook_set_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  welcome_media_url TEXT,
  telegram_group_link TEXT,
  plan_name TEXT,
  plan_price DECIMAL,
  plan_days_access INTEGER,
  media_url TEXT,
  media_text TEXT,
  plans_media_url TEXT,
  plans_media_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Configurações de Webhook
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT UNIQUE NOT NULL,
  webhook_url TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id),
  configured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Grupos
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id),
  description TEXT,
  is_vip BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Planos
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id),
  price DECIMAL NOT NULL,
  period TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  days_access INTEGER NOT NULL,
  sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Usuários de bot
CREATE TABLE IF NOT EXISTS public.bot_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES public.bots(id),
  telegram_id TEXT NOT NULL,
  name TEXT,
  username TEXT,
  status TEXT DEFAULT 'pending',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_telegram_id TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id),
  plan_id UUID REFERENCES public.plans(id),
  amount DECIMAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  external_id TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id),
  bot_id UUID REFERENCES public.bots(id),
  plan_id UUID REFERENCES public.plans(id),
  user_telegram_id TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lembretes
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id),
  user_telegram_id TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id),
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Política para usuários
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Política para bots
CREATE POLICY "Usuários podem ver seus próprios bots" ON public.bots 
  FOR ALL 
  USING (auth.uid() = owner_id);

-- Política para webhooks
CREATE POLICY "Usuários podem gerenciar webhooks dos seus bots" ON public.webhook_configs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.id = webhook_configs.bot_id AND bots.owner_id = auth.uid()
  ));

-- Política para planos
CREATE POLICY "Usuários podem gerenciar seus próprios planos" ON public.plans 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.bots 
    WHERE bots.id = plans.bot_id AND bots.owner_id = auth.uid()
  ));

-- Política para usuários de bot (todos podem visualizar)
CREATE POLICY "Todos podem visualizar usuários dos bots" ON public.bot_users 
  FOR SELECT 
  USING (true);

-- Política para proprietários gerenciarem usuários dos seus bots
CREATE POLICY "Proprietários podem gerenciar usuários dos seus bots" ON public.bot_users 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.bots 
    WHERE bots.id = bot_users.bot_id AND bots.owner_id = auth.uid()
  ));

-- Outras políticas podem ser criadas conforme necessário

-- Adicionar coluna webhook_set_at à tabela bots se não existir
ALTER TABLE public.bots 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_set_at TIMESTAMP WITH TIME ZONE;

-- Criar tabela webhook_configs se não existir
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    configured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    UNIQUE(token_hash)
);

-- Adicionar políticas RLS para a tabela webhook_configs
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados leiam qualquer configuração de webhook
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem ler qualquer configuração de webhook"
ON public.webhook_configs FOR SELECT
TO authenticated
USING (true);

-- Política para permitir que usuários autenticados insiram seus próprios webhooks
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem inserir seus próprios webhooks"
ON public.webhook_configs FOR INSERT
TO authenticated
WITH CHECK (bot_id IS NULL OR bot_id IN (
    SELECT id FROM public.bots WHERE owner_id = auth.uid()
));

-- Política para permitir que usuários autenticados atualizem seus próprios webhooks
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem atualizar seus próprios webhooks"
ON public.webhook_configs FOR UPDATE
TO authenticated
USING (bot_id IS NULL OR bot_id IN (
    SELECT id FROM public.bots WHERE owner_id = auth.uid()
));

-- Política para permitir que usuários autenticados excluam seus próprios webhooks
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem excluir seus próprios webhooks"
ON public.webhook_configs FOR DELETE
TO authenticated
USING (bot_id IS NULL OR bot_id IN (
    SELECT id FROM public.bots WHERE owner_id = auth.uid()
)); 