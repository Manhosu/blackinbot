# Script para atualizar o banco de dados Supabase
# Este script verifica e cria as tabelas necessárias para o funcionamento do sistema

# Função para exibir mensagens coloridas
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [Parameter(Mandatory=$false)]
        [string]$Color = "White"
    )
    
    $OldColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $OldColor
}

# Verificar se as variáveis de ambiente necessárias estão definidas
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseKey = $env:NEXT_PUBLIC_SUPABASE_SERVICE_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-ColorOutput "❌ Erro: Variáveis de ambiente do Supabase não definidas!" "Red"
    Write-ColorOutput "Por favor, defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_SERVICE_KEY" "Yellow"
    exit 1
}

Write-ColorOutput "🔍 Verificando banco de dados Supabase..." "Cyan"

# Verificar se a tabela webhook_configs existe
Write-ColorOutput "🔍 Verificando tabela webhook_configs..." "Cyan"

$tableExistsQuery = @"
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'webhook_configs'
);
"@

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

try {
    $tableExistsResult = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/execute" -Method POST -Headers $headers -Body (@{
        "query" = $tableExistsQuery
    } | ConvertTo-Json)

    if (-not $tableExistsResult.execute) {
        Write-ColorOutput "➕ Tabela webhook_configs não encontrada. Criando..." "Yellow"
        
        $createTableQuery = @"
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    configured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    UNIQUE(token_hash)
);

-- Adicionar políticas RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler qualquer configuração de webhook"
ON public.webhook_configs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem inserir seus próprios webhooks"
ON public.webhook_configs FOR INSERT
TO authenticated
WITH CHECK (bot_id IS NULL OR bot_id IN (
    SELECT id FROM public.bots WHERE owner_id = auth.uid()
));

CREATE POLICY "Usuários autenticados podem atualizar seus próprios webhooks"
ON public.webhook_configs FOR UPDATE
TO authenticated
USING (bot_id IS NULL OR bot_id IN (
    SELECT id FROM public.bots WHERE owner_id = auth.uid()
));

CREATE POLICY "Usuários autenticados podem excluir seus próprios webhooks"
ON public.webhook_configs FOR DELETE
TO authenticated
USING (bot_id IS NULL OR bot_id IN (
    SELECT id FROM public.bots WHERE owner_id = auth.uid()
));
"@
        
        $createResult = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/execute" -Method POST -Headers $headers -Body (@{
            "query" = $createTableQuery
        } | ConvertTo-Json)
        
        Write-ColorOutput "✅ Tabela webhook_configs criada com sucesso!" "Green"
    } else {
        Write-ColorOutput "✅ Tabela webhook_configs já existe!" "Green"
    }

    # Verificar se a coluna webhook_set_at existe na tabela bots
    Write-ColorOutput "🔍 Verificando coluna webhook_set_at na tabela bots..." "Cyan"

    $columnExistsQuery = @"
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bots'
    AND column_name = 'webhook_set_at'
);
"@

    $columnExistsResult = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/execute" -Method POST -Headers $headers -Body (@{
        "query" = $columnExistsQuery
    } | ConvertTo-Json)

    if (-not $columnExistsResult.execute) {
        Write-ColorOutput "➕ Coluna webhook_set_at não encontrada. Adicionando à tabela bots..." "Yellow"
        
        $addColumnQuery = @"
ALTER TABLE public.bots 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_set_at TIMESTAMP WITH TIME ZONE;
"@
        
        $addColumnResult = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/execute" -Method POST -Headers $headers -Body (@{
            "query" = $addColumnQuery
        } | ConvertTo-Json)
        
        Write-ColorOutput "✅ Colunas webhook_url e webhook_set_at adicionadas com sucesso!" "Green"
    } else {
        Write-ColorOutput "✅ Coluna webhook_set_at já existe na tabela bots!" "Green"
    }

    Write-ColorOutput "✅ Banco de dados verificado e atualizado com sucesso!" "Green"
    Write-ColorOutput "🚀 O sistema está pronto para uso." "Cyan"
} catch {
    Write-ColorOutput "Erro ao executar script: $_" "Red"
    exit 1
} 