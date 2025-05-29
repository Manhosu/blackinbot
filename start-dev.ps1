# Tentar matar qualquer processo Node em execução
Write-Host "Tentando matar processos node anteriores..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Navegar para o diretório web
Write-Host "Navegando para o diretório web..." -ForegroundColor Cyan
cd .\web

# Iniciar o servidor Next.js
Write-Host "Iniciando o servidor Next.js na porta 3025..." -ForegroundColor Green
npm run dev 