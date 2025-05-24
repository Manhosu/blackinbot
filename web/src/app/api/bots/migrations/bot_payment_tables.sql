-- Tabela para armazenar os usuários do bot
CREATE TABLE IF NOT EXISTS bot_users (
  id BIGSERIAL PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  username TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_info JSONB,
  access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(bot_id, telegram_id)
);

-- Índice para buscas rápidas por telegram_id
CREATE INDEX IF NOT EXISTS bot_users_telegram_id_idx ON bot_users(telegram_id);
CREATE INDEX IF NOT EXISTS bot_users_bot_id_idx ON bot_users(bot_id);
CREATE INDEX IF NOT EXISTS bot_users_status_idx ON bot_users(status);

-- Tabela para armazenar pagamentos
CREATE TABLE IF NOT EXISTS bot_payments (
  id TEXT PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES bot_plans(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'pix',
  payment_details JSONB,
  payment_proof TEXT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS bot_payments_bot_id_idx ON bot_payments(bot_id);
CREATE INDEX IF NOT EXISTS bot_payments_telegram_user_id_idx ON bot_payments(telegram_user_id);
CREATE INDEX IF NOT EXISTS bot_payments_status_idx ON bot_payments(status);

-- Adicionar campos nas tabelas existentes
ALTER TABLE bots 
ADD COLUMN IF NOT EXISTS welcome_message TEXT,
ADD COLUMN IF NOT EXISTS success_payment_message TEXT,
ADD COLUMN IF NOT EXISTS expiration_message TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
ADD COLUMN IF NOT EXISTS pix_beneficiary_name TEXT; 