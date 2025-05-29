# Script para reiniciar o servidor Next.js (modo limpo - sem localStorage)
Write-Host "Reiniciando servidor Next.js (modo limpo - sem localStorage)..." -ForegroundColor Cyan

# Verificar se há processo usando a porta 3025
try {
    $processesUsingPort = netstat -ano | findstr :3025 | findstr LISTENING
    if ($processesUsingPort) {
        $processPid = ($processesUsingPort -split '\s+')[-1]
        Write-Host "Encontrado processo usando a porta 3025 (PID: $processPid)" -ForegroundColor Yellow
        Write-Host "Finalizando processo..." -ForegroundColor Yellow
        Stop-Process -Id $processPid -Force
        Write-Host "Processo finalizado com sucesso" -ForegroundColor Green
        # Aguardar um momento para garantir que a porta seja liberada
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "Erro ao verificar/encerrar processos: $_" -ForegroundColor Red
}

# Determinar o caminho do diretório web
$webDir = Join-Path $PSScriptRoot "web"

# Limpar o cache do Next.js
try {
    $nextCacheDir = Join-Path $webDir ".next\cache"
    if (Test-Path $nextCacheDir) {
        Write-Host "Limpando cache do Next.js..." -ForegroundColor Yellow
        Remove-Item -Path $nextCacheDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cache limpo com sucesso" -ForegroundColor Green
    }
} catch {
    Write-Host "Erro ao limpar cache: $_" -ForegroundColor Red
}

# Executar o comando no diretório web
try {
    Write-Host "Executando npm run dev no diretório $webDir..." -ForegroundColor Cyan
    Push-Location $webDir
    Write-Host "Iniciando servidor Next.js na porta 3025..." -ForegroundColor Cyan
    npm run dev
} catch {
    Write-Host "Erro ao iniciar servidor: $_" -ForegroundColor Red
} finally {
    Pop-Location
} 