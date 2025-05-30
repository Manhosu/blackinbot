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

try {
    Write-Host "Testando API de criação de bot..."
    $response = Invoke-RestMethod -Uri "http://localhost:3025/api/bots" -Method Post -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "✅ Resposta:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
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