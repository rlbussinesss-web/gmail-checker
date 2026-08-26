@echo off
chcp 65001 >nul
cls

echo.
echo ================== GMAIL CHECKER PRO ===================
echo.
echo 🚀 Iniciando servidor...
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não está instalado!
    echo.
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

REM Instalar dependências se necessário
if not exist "node_modules\" (
    echo 📦 Instalando dependências...
    call npm install
)

REM Instalar Playwright se necessário
if not exist "node_modules/playwright" (
    echo 🎬 Instalando Playwright...
    call npm install playwright
)

REM Iniciar servidor
echo.
echo ✅ Servidor iniciando em http://localhost:3000
echo.
echo 🌐 Abra seu navegador e acesse: http://localhost:3000
echo.
echo 📊 Página de Estatísticas: http://localhost:3000/stats
echo.
echo Pressione CTRL+C para parar o servidor
echo.

call npm start
