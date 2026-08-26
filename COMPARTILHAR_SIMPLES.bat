@echo off
chcp 65001 >nul
cls

echo.
echo ════════════════════════════════════════════════════════
echo    COMPARTILHANDO GMAIL CHECKER
echo ════════════════════════════════════════════════════════
echo.
echo Instalando localtunnel...
call npm install -g localtunnel

echo.
echo Iniciando tunnel na porta 3000...
echo.
echo A URL vai aparecer abaixo. Copie e compartilhe!
echo.
echo ════════════════════════════════════════════════════════
echo.

call lt --port 3000

echo.
echo ════════════════════════════════════════════════════════
echo.
echo URL compartilhada acima!
echo.
echo Mantenha esta janela aberta para seu amigo acessar.
echo.
pause
