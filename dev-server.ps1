# Script para iniciar o servidor de desenvolvimento Next.js
Write-Host "🚀 Iniciando servidor de desenvolvimento na porta 3025..." -ForegroundColor Cyan

# Verificar se há processos usando a porta 3025
$portInUse = Get-NetTCPConnection -LocalPort 3025 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "⚠️ Porta 3025 está ocupada. Tentando liberar..." -ForegroundColor Yellow
    
    # Encontrar o PID do processo usando a porta
    $pid = $portInUse.OwningProcess
    
    # Obter informações sobre o processo
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "🔍 Encontrado processo: $($process.Name) (PID: $pid)" -ForegroundColor Yellow
        
        # Tentar matar o processo
        try {
            Stop-Process -Id $pid -Force
            Write-Host "✅ Processo interrompido com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Falha ao interromper o processo: $_" -ForegroundColor Red
            Write-Host "Por favor, encerre manualmente o processo ou reinicie o computador." -ForegroundColor Red
            exit 1
        }
    }
}

# Navegar para o diretório web e iniciar o servidor
Write-Host "📂 Navegando para o diretório web..." -ForegroundColor Cyan
Set-Location -Path .\web

Write-Host "🚀 Iniciando Next.js na porta 3025..." -ForegroundColor Green
npm run dev 