# Script PowerShell para testar webhook
$API_BASE = "http://localhost:3025"
$BOT_TOKEN = "7940039994:AAGLXFQNGHasfyrjsmTSvWTjQ2c-_0Dfy2w"

# Mensagem /start
$startMessage = @{
    update_id = 123456789
    message = @{
        message_id = 1
        from = @{
            id = 123456789
            is_bot = $false
            first_name = "Teste"
            username = "teste_user"
            language_code = "pt-br"
        }
        chat = @{
            id = 123456789
            first_name = "Teste"
            username = "teste_user"
            type = "private"
        }
        date = [int][double]::Parse((Get-Date -UFormat %s))
        text = "/start"
    }
} | ConvertTo-Json -Depth 10

Write-Host "🧪 Testando comando /start..." -ForegroundColor Yellow
Write-Host "📤 Enviando para: $API_BASE/api/telegram/webhook?token=$BOT_TOKEN" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/telegram/webhook?token=$BOT_TOKEN" -Method Post -Body $startMessage -ContentType "application/json"
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "📋 Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n" -NoNewline

# Mensagem de ativação em grupo
$activationMessage = @{
    update_id = 123456790
    message = @{
        message_id = 2
        from = @{
            id = 123456789
            is_bot = $false
            first_name = "Teste"
            username = "teste_user"
            language_code = "pt-br"
        }
        chat = @{
            id = -1001234567890
            title = "Grupo de Teste"
            type = "supergroup"
        }
        date = [int][double]::Parse((Get-Date -UFormat %s))
        text = "TESTE-2025"
    }
} | ConvertTo-Json -Depth 10

Write-Host "🧪 Testando código de ativação em grupo..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/telegram/webhook?token=$BOT_TOKEN" -Method Post -Body $activationMessage -ContentType "application/json"
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "📋 Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n🎉 Testes concluídos!" -ForegroundColor Green 