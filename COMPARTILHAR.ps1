# Script para compartilhar o checker via Localtunnel

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "     📧 GMAIL CHECKER - COMPARTILHANDO COM LINK" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se localtunnel está instalado
Write-Host "⏳ Verificando localtunnel..." -ForegroundColor Yellow
$lt = npm list -g localtunnel 2>$null

if ($lt -like "*not installed*" -or -not $lt) {
    Write-Host "📦 Instalando localtunnel..." -ForegroundColor Yellow
    npm install -g localtunnel
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Erro ao instalar localtunnel!" -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}

Write-Host "✅ Localtunnel disponível" -ForegroundColor Green
Write-Host ""

# Verificar se servidor está rodando
Write-Host "⏳ Verificando servidor..." -ForegroundColor Yellow
$testServer = $null
try {
    $testServer = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
} catch {
    $testServer = $null
}

if (-not $testServer) {
    Write-Host ""
    Write-Host "❌ ERRO: Servidor não está rodando!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Você precisa executar INICIAR.bat PRIMEIRO" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Passos:" -ForegroundColor Cyan
    Write-Host "1. Abra INICIAR.bat em outra janela" -ForegroundColor Cyan
    Write-Host "2. Aguarde aparecer '✅ Servidor iniciando'" -ForegroundColor Cyan
    Write-Host "3. Então execute COMPARTILHAR.ps1 novamente" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Servidor detectado em http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Criando link público..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ Aguarde alguns segundos..." -ForegroundColor Yellow
Write-Host ""

# Iniciar localtunnel
lt --port 3000

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ COMPARTILHANDO!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Mantenha essa janela ABERTA" -ForegroundColor Yellow
Write-Host "- Seu amigo consegue acessar enquanto isso está rodando" -ForegroundColor Yellow
Write-Host "- Se fechar, o link cai" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione CTRL+C para parar de compartilhar" -ForegroundColor Yellow
Write-Host ""

Read-Host "Pressione Enter para sair"
