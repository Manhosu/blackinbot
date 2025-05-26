-- Script SQL para Sistema de Ativação de Bots
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar campos de ativação na tabela bots
ALTER TABLE bots 
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS activated_by_telegram_id VARCHAR(50) NULL;

-- 2. Criar tabela para códigos de ativação temporários
CREATE TABLE IF NOT EXISTS bot_activation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  activation_code VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  used_by_telegram_id VARCHAR(50) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_bot_activation_codes_bot_id ON bot_activation_codes(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_activation_codes_expires_at ON bot_activation_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_bot_activation_codes_code ON bot_activation_codes(activation_code);

-- 4. Habilitar RLS na tabela de códigos de ativação
ALTER TABLE bot_activation_codes ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS para bot_activation_codes
CREATE POLICY "Users can view their own activation codes" ON bot_activation_codes
  FOR SELECT USING (
    bot_id IN (
      SELECT id FROM bots WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create codes for their own bots" ON bot_activation_codes
  FOR INSERT WITH CHECK (
    bot_id IN (
      SELECT id FROM bots WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own activation codes" ON bot_activation_codes
  FOR UPDATE USING (
    bot_id IN (
      SELECT id FROM bots WHERE owner_id = auth.uid()
    )
  );

-- 6. Função para gerar código de ativação único
CREATE OR REPLACE FUNCTION generate_activation_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code VARCHAR(20) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Formato: XXXX-XXXX para facilitar digitação
  RETURN substr(code, 1, 4) || '-' || substr(code, 5, 4);
END;
$$ LANGUAGE plpgsql;

-- 7. Função para criar código de ativação para um bot
CREATE OR REPLACE FUNCTION create_bot_activation_code(p_bot_id UUID)
RETURNS JSON AS $$
DECLARE
  v_code VARCHAR(20);
  v_expires_at TIMESTAMP WITH TIME ZONE;
  result JSON;
BEGIN
  -- Remover códigos expirados/não utilizados do bot
  DELETE FROM bot_activation_codes 
  WHERE bot_id = p_bot_id 
    AND (expires_at < NOW() OR used_at IS NULL);
  
  -- Gerar novo código único
  LOOP
    v_code := generate_activation_code();
    
    -- Verificar se o código já existe (muito improvável, mas segurança)
    IF NOT EXISTS (
      SELECT 1 FROM bot_activation_codes 
      WHERE activation_code = v_code 
        AND expires_at > NOW() 
        AND used_at IS NULL
    ) THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Definir expiração em 10 minutos
  v_expires_at := NOW() + INTERVAL '10 minutes';
  
  -- Inserir novo código
  INSERT INTO bot_activation_codes (bot_id, activation_code, expires_at)
  VALUES (p_bot_id, v_code, v_expires_at);
  
  -- Retornar dados do código
  result := json_build_object(
    'success', true,
    'activation_code', v_code,
    'expires_at', v_expires_at,
    'expires_in_minutes', 10,
    'bot_id', p_bot_id
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função para validar e usar código de ativação
CREATE OR REPLACE FUNCTION activate_bot_with_code(
  p_activation_code VARCHAR(20),
  p_telegram_user_id VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
  v_bot_id UUID;
  v_bot_record RECORD;
  result JSON;
BEGIN
  -- Buscar código válido
  SELECT bot_id INTO v_bot_id
  FROM bot_activation_codes
  WHERE activation_code = p_activation_code
    AND expires_at > NOW()
    AND used_at IS NULL;
  
  -- Verificar se código foi encontrado
  IF v_bot_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Código inválido ou expirado'
    );
  END IF;
  
  -- Verificar se bot já está ativado
  SELECT * INTO v_bot_record FROM bots WHERE id = v_bot_id;
  
  IF v_bot_record.is_activated = true THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bot já está ativado'
    );
  END IF;
  
  -- Marcar código como usado
  UPDATE bot_activation_codes
  SET used_at = NOW(),
      used_by_telegram_id = p_telegram_user_id
  WHERE activation_code = p_activation_code;
  
  -- Ativar o bot
  UPDATE bots
  SET is_activated = true,
      activated_at = NOW(),
      activated_by_telegram_id = p_telegram_user_id
  WHERE id = v_bot_id;
  
  -- Retornar sucesso
  result := json_build_object(
    'success', true,
    'message', 'Bot ativado com sucesso!',
    'bot_id', v_bot_id,
    'bot_name', v_bot_record.name,
    'activated_at', NOW(),
    'activated_by', p_telegram_user_id
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para verificar se bot está ativado
CREATE OR REPLACE FUNCTION is_bot_activated(p_bot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(is_activated, false)
    FROM bots
    WHERE id = p_bot_id
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Função para limpar códigos expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_activation_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bot_activation_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentários para documentação
COMMENT ON TABLE bot_activation_codes IS 'Códigos de ativação temporários para validar bots';
COMMENT ON FUNCTION create_bot_activation_code IS 'Gera código de ativação único válido por 10 minutos';
COMMENT ON FUNCTION activate_bot_with_code IS 'Valida código e ativa bot se válido';
COMMENT ON FUNCTION cleanup_expired_activation_codes IS 'Remove códigos expirados (executar via cron)';

-- 12. Atualizar bots existentes (opcional - apenas para desenvolvimento)
-- DESCOMENTE APENAS SE QUISER ATIVAR TODOS OS BOTS EXISTENTES
-- UPDATE bots SET is_activated = true, activated_at = NOW() WHERE is_activated IS NULL OR is_activated = false;

-- 13. Verificar se as tabelas foram criadas corretamente
SELECT 
  'bot_activation_codes' as table_name,
  COUNT(*) as record_count
FROM bot_activation_codes
UNION ALL
SELECT 
  'bots_with_activation_fields' as table_name,
  COUNT(*) as record_count
FROM bots 
WHERE is_activated IS NOT NULL; 