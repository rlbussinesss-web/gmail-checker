@echo off
chcp 65001 >nul
cls

echo.
echo ════════════════════════════════════════════════════════
echo     📧 GMAIL CHECKER - COMPARTILHANDO COM LINK
echo ════════════════════════════════════════════════════════
echo.

REM Verificar se servidor está rodando
netstat -ano | findstr ":3000" >nul
if %errorlevel% neq 0 (
    echo ⚠️  Servidor não está rodando!
    echo.
    echo Execute INICIAR.bat primeiro
    echo.
    pause
    exit /b 1
)

echo ✅ Servidor detectado em http://localhost:3000
echo.
echo 🌐 Criando link público...
echo.

REM Iniciar localtunnel
lt --port 3000

echo.
echo ✅ Link criado! Copie a URL acima e compartilhe
echo.
pause
