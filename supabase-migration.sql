-- Configuração do esquema e extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de bots
CREATE TABLE IF NOT EXISTS public.bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    description TEXT,
    token VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    welcome_message TEXT,
    avatar_url TEXT,
    welcome_media_url TEXT,
    telegram_group_link TEXT,
    plan_name VARCHAR(255),
    plan_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    plan_period VARCHAR(50) DEFAULT '30',
    plan_days_access INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    totalRevenue DECIMAL(10, 2) DEFAULT 0,
    totalSales INTEGER DEFAULT 0
);

-- Tabela de planos
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    days_access INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sales INTEGER DEFAULT 0
);

-- Tabela de grupos
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    telegram_id VARCHAR(255),
    invite_link TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    member_count INTEGER DEFAULT 0
);

-- Tabela de assinantes
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    user_id UUID,
    telegram_user_id VARCHAR(255),
    telegram_username VARCHAR(255),
    telegram_first_name VARCHAR(255),
    telegram_last_name VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    subscription_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas RLS para permitir acesso aos proprietários dos bots
-- Habilitar RLS nas tabelas
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Política para bots
CREATE POLICY "Proprietários podem acessar seus próprios bots" 
ON public.bots FOR ALL 
USING (owner_id = auth.uid());

-- Política para planos
CREATE POLICY "Proprietários podem acessar planos dos seus bots" 
ON public.plans FOR ALL 
USING (
    bot_id IN (
        SELECT id FROM public.bots 
        WHERE owner_id = auth.uid()
    )
);

-- Política para grupos
CREATE POLICY "Proprietários podem acessar grupos dos seus bots" 
ON public.groups FOR ALL 
USING (
    bot_id IN (
        SELECT id FROM public.bots 
        WHERE owner_id = auth.uid()
    )
);

-- Política para assinantes
CREATE POLICY "Proprietários podem acessar assinantes dos seus bots" 
ON public.subscribers FOR ALL 
USING (
    bot_id IN (
        SELECT id FROM public.bots 
        WHERE owner_id = auth.uid()
    )
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON public.bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_plans_bot_id ON public.plans(bot_id);
CREATE INDEX IF NOT EXISTS idx_groups_bot_id ON public.groups(bot_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_bot_id ON public.subscribers(bot_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_plan_id ON public.subscribers(plan_id);

-- Função para atualizar o timestamp de 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar o timestamp de 'updated_at'
CREATE TRIGGER update_bots_updated_at
BEFORE UPDATE ON public.bots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para criar um usuário de teste e um bot de demonstração
DO $$
DECLARE
    test_user_id UUID;
    test_bot_id UUID;
    test_plan_id UUID;
BEGIN
    -- Verifica se já existe um usuário de teste
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@example.com' LIMIT 1;
    
    -- Se não existir, cria um novo usuário de teste
    IF test_user_id IS NULL THEN
        -- Nota: Na prática, você não pode inserir diretamente na tabela auth.users
        -- Esta parte é apenas ilustrativa e deve ser substituída pela API do Supabase
        -- Aqui estamos apenas gerando um ID para continuar o script
        test_user_id := uuid_generate_v4();
    END IF;
    
    -- Cria um bot de demonstração
    INSERT INTO public.bots (
        name, username, description, token, owner_id, welcome_message,
        plan_name, plan_price, plan_days_access, status
    ) VALUES (
        'Bot Demo', 'bot_demo', 'Bot de demonstração', '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        test_user_id, 'Bem-vindo ao bot de demonstração!',
        'Plano Mensal', 29.90, 30, 'active'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_bot_id;
    
    -- Se o bot foi criado, adiciona um plano
    IF test_bot_id IS NOT NULL THEN
        INSERT INTO public.plans (
            bot_id, name, price, days_access, is_active
        ) VALUES (
            test_bot_id, 'Plano Mensal', 29.90, 30, TRUE
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO test_plan_id;
    END IF;
END;
$$ LANGUAGE plpgsql; 