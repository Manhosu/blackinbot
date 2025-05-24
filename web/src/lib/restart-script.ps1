# Script para reiniciar o servidor Next.js
Write-Host "Reiniciando servidor Next.js..." -ForegroundColor Cyan

# Encontrar e encerrar processos node
try {
    $nodePids = Get-Process -Name "node" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
    if ($nodePids) {
        Write-Host "Encontrados $($nodePids.Count) processos node em execução." -ForegroundColor Yellow
        foreach ($pid in $nodePids) {
            Write-Host "Encerrando processo node (PID: $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force
        }
        Write-Host "Processos node encerrados com sucesso" -ForegroundColor Green
        # Aguardar um momento para garantir que a porta seja liberada
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Nenhum processo node em execução" -ForegroundColor Green
    }
} catch {
    Write-Host "Erro ao encerrar processos node: $_" -ForegroundColor Red
}

# Limpar o cache do Next.js
try {
    if (Test-Path ".next/cache") {
        Write-Host "Limpando cache do Next.js..." -ForegroundColor Yellow
        Remove-Item -Path ".next/cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cache limpo com sucesso" -ForegroundColor Green
    }
} catch {
    Write-Host "Erro ao limpar cache: $_" -ForegroundColor Red
}

# Iniciar o servidor Next.js
try {
    Write-Host "Iniciando servidor Next.js na porta 3025..." -ForegroundColor Cyan
    npm run dev
} catch {
    Write-Host "Erro ao iniciar servidor: $_" -ForegroundColor Red
} 