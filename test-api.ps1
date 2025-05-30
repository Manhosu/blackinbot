# Script para testar a API de criação de bots
Write-Host "Testando API de criação de bots (Versão simplificada)" -ForegroundColor Cyan

# Criar um arquivo JSON com os dados de teste
$body = @{
    name = "Test Bot"
    token = "123:abc"
    description = "Teste"
    owner_id = "test-user"
    plans = @(
        @{
            name = "VIP"
            price = 9.90
            period = "monthly"
            period_days = 30
            is_active = $true
        }
    )
} | ConvertTo-Json -Depth 3

# Salvar em arquivo
$body | Out-File -FilePath "test-bot-data.json" -Encoding utf8

# Mostrar os dados de teste
Write-Host "Dados de teste criados:" -ForegroundColor Yellow
Write-Host $body

# Fazer a requisição usando Invoke-RestMethod para processamento em PowerShell
Write-Host "`nEnviando requisição para API usando Invoke-RestMethod:" -ForegroundColor Green
try {
    Write-Host "Testando API de criação de bot..."
    $response = Invoke-RestMethod -Uri "http://localhost:3025/api/bots" -Method Post -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "✅ Resposta:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    
    # Extrair e mostrar informações importantes do bot
    Write-Host "`nDetalhes do bot criado:" -ForegroundColor Cyan
    Write-Host "ID: $($response.bot.id)" -ForegroundColor White
    Write-Host "Nome: $($response.bot.name)" -ForegroundColor White
    Write-Host "Token: $($response.bot.token.Substring(0, 10))..." -ForegroundColor White
    Write-Host "Mensagem: $($response.message)" -ForegroundColor White
    
    # Verificar se é um fallback de desenvolvimento
    if ($response.bot._dev_fallback -eq $true) {
        Write-Host "Tipo: Fallback de desenvolvimento (simulado)" -ForegroundColor Yellow
    } else {
        Write-Host "Tipo: Bot real inserido no banco" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode"
        
        # Tentar ler o corpo da resposta de erro
        try {
            $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $streamReader.ReadToEnd()
            Write-Host "Erro detalhado:"
            Write-Host $errorBody
        } catch {
            Write-Host "Não foi possível ler o corpo da resposta de erro"
        }
    }
}

# Testar também a API GET para listar bots
Write-Host "`nTestando API GET para listar bots:" -ForegroundColor Green
try {
    $getResponse = Invoke-RestMethod -Uri "http://localhost:3025/api/bots" -Method Get -ErrorAction Stop
    
    Write-Host "Resposta de sucesso:" -ForegroundColor Green
    $getResponseJson = $getResponse | ConvertTo-Json -Depth 5
    Write-Host $getResponseJson
    
    Write-Host "`nBots encontrados: $($getResponse.bots.Count)" -ForegroundColor Cyan
    
    if ($getResponse.bots.Count -gt 0) {
        Write-Host "Listando primeiros 3 bots:" -ForegroundColor Yellow
        $counter = 0
        foreach ($bot in $getResponse.bots) {
            $counter++
            if ($counter -le 3) {
                Write-Host "[$counter] $($bot.name) (ID: $($bot.id))" -ForegroundColor White
            }
        }
    }
} catch {
    Write-Host "Erro na requisição GET:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
} 