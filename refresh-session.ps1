# Script para limpar cache de sessão e reiniciar o servidor
Write-Host "Iniciando refresh de sessão e servidor..." -ForegroundColor Cyan

# Obter processos usando a porta 3025
$processoPorta = Get-NetTCPConnection -LocalPort 3025 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess

if ($processoPorta) {
    foreach ($pid in $processoPorta) {
        Write-Host "Finalizando processo que está usando a porta 3025 (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Nenhum processo encontrado usando a porta 3025" -ForegroundColor Green
}

# Limpar cache do Next.js
$cachePaths = @(
    "web\.next\cache",
    "web\node_modules\.cache"
)

Write-Host "Limpando cache do Next.js..." -ForegroundColor Cyan
foreach ($path in $cachePaths) {
    $fullPath = Join-Path -Path $PWD -ChildPath $path
    if (Test-Path $fullPath) {
        Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cache removido: $path" -ForegroundColor Green
    } else {
        Write-Host "Cache não encontrado: $path" -ForegroundColor Yellow
    }
}

# Limpar localStorage do navegador via código JavaScript em páginas abertas
Write-Host "Tentando limpar localStorage em páginas abertas do projeto..." -ForegroundColor Cyan

# Iniciar servidor Next.js
$webDir = Join-Path -Path $PWD -ChildPath "web"
if (Test-Path $webDir) {
    Write-Host "Iniciando servidor Next.js em $webDir na porta 3025..." -ForegroundColor Green
    Set-Location -Path $webDir
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
} else {
    Write-Host "Diretório web não encontrado!" -ForegroundColor Red
}

# Pausa para o usuário ver as mensagens
Write-Host "Servidor iniciado! Aguarde a compilação completa..." -ForegroundColor Cyan
Write-Host "Navegue para http://localhost:3025 para acessar o projeto" -ForegroundColor Green

# Lembrete para limpar localStorage manualmente
Write-Host @"
-------------------------------------------------
IMPORTANTE: Para garantir que a sessão seja limpa completamente, por favor:

1. Abra o DevTools no navegador (F12)
2. Vá para a aba "Application" (ou "Aplicativo")
3. No painel esquerdo, expanda "Storage" > "Local Storage"
4. Clique com o botão direito em "http://localhost:3025" e selecione "Clear" (Limpar)
5. Atualize a página (F5)
-------------------------------------------------
"@ -ForegroundColor Yellow 