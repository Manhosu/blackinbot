# Script para testar API com cookies de sessao
Write-Host "Testando API com cookies de sessao..." -ForegroundColor Yellow

# Primeiro, vamos fazer login para obter os cookies
Write-Host "`nPasso 1: Fazendo login para obter cookies..." -ForegroundColor Green

$loginData = @{
    email = "delas9776@gmail.com"
    password = "142536"
} | ConvertTo-Json

try {
    # Fazer login para obter sessao
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3025/api/auth/session" -Method Post -ContentType "application/json" -Body $loginData -SessionVariable 'session'
    
    Write-Host "Login realizado, status:" $loginResponse.StatusCode
    
    # Agora testar criacao de bot com a sessao
    Write-Host "`nPasso 2: Criando bot com sessao autenticada..." -ForegroundColor Green
    
    $botData = @{
        name = "Test Bot com Sessao"
        token = "123:abc"
        description = "Teste com autenticacao"
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
    
    $botResponse = Invoke-WebRequest -Uri "http://localhost:3025/api/bots" -Method Post -ContentType "application/json" -Body $botData -WebSession $session
    
    Write-Host "Bot criado com sucesso!" -ForegroundColor Green
    Write-Host "Status:" $botResponse.StatusCode
    Write-Host "Resposta:" ($botResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3)
    
} catch {
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode"
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Erro detalhado:" $errorBody
        } catch {
            Write-Host "Nao foi possivel ler o corpo da resposta de erro"
        }
    }
} 