# Script de debug especifico para API de criacao de bots
Write-Host "Debug da API de Criacao de Bots" -ForegroundColor Cyan

# Dados de teste
$testData = @{
    name = "Bot Debug Especifico"
    token = "test_debug_token_$(Get-Date -Format 'HHmmss')"
    welcome_message = "Mensagem de debug"
    telegram_group_link = ""
    plan_name = "Plano Debug"
    plan_price = "15.50"
    plan_days_access = "30"
} | ConvertTo-Json

Write-Host "Dados de teste:" -ForegroundColor Yellow
Write-Host $testData

try {
    Write-Host "Enviando requisicao..." -ForegroundColor Green
    
    $response = Invoke-RestMethod -Uri "http://localhost:3025/api/bots/create" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testData `
        -ErrorAction Stop
    
    Write-Host "Resposta recebida:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
    # Verificar especificamente o status do Supabase
    if ($response.save_to_supabase -eq $false) {
        Write-Host "PROBLEMA IDENTIFICADO: save_to_supabase = false" -ForegroundColor Red
        Write-Host "Isso indica que houve erro ao salvar no Supabase" -ForegroundColor Red
    } else {
        Write-Host "Salvamento no Supabase: OK" -ForegroundColor Green
    }
    
    if ($response.save_to_localStorage -eq $true) {
        Write-Host "Salvamento no localStorage: OK" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Erro na requisicao:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "Verificando logs do servidor..." -ForegroundColor Cyan
Write-Host "Verifique o terminal do servidor Next.js para logs detalhados" -ForegroundColor Yellow 