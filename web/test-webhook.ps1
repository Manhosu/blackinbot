# Script PowerShell para testar webhook
$API_BASE = "http://localhost:3025"
$BOT_ID = "d7a8f37c-8367-482a-9df2-cc17101a5677"

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
Write-Host "📤 Enviando para: $API_BASE/api/webhook/$BOT_ID" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/webhook/$BOT_ID" -Method Post -Body $startMessage -ContentType "application/json"
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "📋 Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
} 