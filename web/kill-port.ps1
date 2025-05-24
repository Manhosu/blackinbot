# Script para matar processos que estão usando a porta 3025
Write-Host "Verificando processos que estão usando a porta 3025..." -ForegroundColor Yellow

try {
    # Encontrar processos que usam a porta 3025
    $processingUsingPort = netstat -ano | findstr :3025
    
    if ($processingUsingPort) {
        Write-Host "Processos encontrados na porta 3025:" -ForegroundColor Yellow
        Write-Host $processingUsingPort
        
        # Extrair os PIDs
        $pids = @()
        $processingUsingPort | ForEach-Object {
            if ($_ -match '\s+(\d+)$') {
                $pids += $matches[1]
            }
        }
        
        # Remover duplicatas
        $uniquePids = $pids | Select-Object -Unique
        
        # Matar os processos
        foreach ($pid in $uniquePids) {
            Write-Host "Terminando processo com PID $pid..." -ForegroundColor Red
            taskkill /F /PID $pid
        }
        
        Write-Host "Todos os processos na porta 3025 foram encerrados." -ForegroundColor Green
    } else {
        Write-Host "Nenhum processo encontrado usando a porta 3025." -ForegroundColor Green
    }
} catch {
    Write-Host "Erro ao verificar ou matar processos: $_" -ForegroundColor Red
} 