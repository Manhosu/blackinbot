# Script para reiniciar o servidor Next.js
Write-Host "Reiniciando servidor Next.js..." -ForegroundColor Cyan

# Obter processos usando a porta 3025
$processosPorta = Get-NetTCPConnection -LocalPort 3025 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess

if ($processosPorta) {
    foreach ($processId in $processosPorta) {
        Write-Host "Finalizando processo que está usando a porta 3025 (PID: $processId)..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Processo finalizado com sucesso" -ForegroundColor Green
} else {
    Write-Host "Nenhum processo encontrado usando a porta 3025" -ForegroundColor Green
}

# Iniciar servidor Next.js
$webDir = Join-Path -Path $PWD -ChildPath "web"
if (Test-Path $webDir) {
    Write-Host "Iniciando servidor Next.js em $webDir na porta 3025..." -ForegroundColor Green
    Set-Location -Path $webDir
    
    # Usar o comando npm diretamente
    Write-Host "Iniciando npm run dev..." -ForegroundColor Cyan
    
    # Iniciar o servidor em uma nova janela do PowerShell
    Start-Process powershell.exe -ArgumentList "-Command cd '$webDir'; npm run dev"
    
    Write-Host "Servidor iniciado! Acesse http://localhost:3025" -ForegroundColor Green
} else {
    Write-Host "Diretório web não encontrado!" -ForegroundColor Red
} 