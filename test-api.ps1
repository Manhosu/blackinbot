# Script para testar a API de criação de bots
Write-Host "Testando API de criação de bots (Versão simplificada)" -ForegroundColor Cyan

# Criar um arquivo JSON com os dados de teste
$testData = @{
    name = "Bot de Teste PowerShell v2"
    description = "Bot criado via script PowerShell para teste da API simplificada"
    token = "7018128699:AAEZTpUtMSLc83PHMPwqNamIwiZ5P8lCvq4"
    plan_info = @{
        name = "Plano Mensal"
        price = 9.90
        days = 30
    }
} | ConvertTo-Json -Depth 10

# Salvar em arquivo
$testData | Out-File -FilePath "test-bot-data.json" -Encoding utf8

# Mostrar os dados de teste
Write-Host "Dados de teste criados:" -ForegroundColor Yellow
Write-Host $testData

# Fazer a requisição usando Invoke-RestMethod para processamento em PowerShell
Write-Host "`nEnviando requisição para API usando Invoke-RestMethod:" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3025/api/bots" -Method Post -ContentType "application/json" -Body $testData -ErrorAction Stop
    
    Write-Host "Resposta de sucesso:" -ForegroundColor Green
    $responseJson = $response | ConvertTo-Json -Depth 10
    Write-Host $responseJson
    
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
    Write-Host "Erro na requisição:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    
    # Tentar obter o corpo da resposta de erro
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorResponse = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "Detalhes do erro:" -ForegroundColor Red
        Write-Host $errorResponse
    } catch {
        Write-Host "Não foi possível obter detalhes do erro" -ForegroundColor Red
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