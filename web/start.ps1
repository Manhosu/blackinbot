# Script para iniciar o servidor Next.js na porta 3025
Write-Host "Iniciando servidor Next.js na porta 3025..." -ForegroundColor Green

# Tentar matar processos node existentes que possam estar bloqueando a porta 3025
try {
    Write-Host "Verificando processos node que possam estar usando a porta 3025..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Finalizando processos node existentes..." -ForegroundColor Yellow
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "Não foi possível verificar ou finalizar processos node: $_" -ForegroundColor Red
}

# Iniciar o servidor Next.js
try {
    Write-Host "Executando 'npm run dev'..." -ForegroundColor Green
    npm run dev
} catch {
    Write-Host "Erro ao iniciar o servidor: $_" -ForegroundColor Red
} 