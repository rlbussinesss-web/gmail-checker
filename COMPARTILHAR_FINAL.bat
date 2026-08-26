@echo off
chcp 65001 >nul
cls

echo.
echo ════════════════════════════════════════════════════════
echo    COMPARTILHANDO GMAIL CHECKER
echo ════════════════════════════════════════════════════════
echo.
echo Iniciando tunnel na porta 3000...
echo.
echo Aguarde alguns segundos...
echo A URL vai aparecer abaixo!
echo.
echo ════════════════════════════════════════════════════════
echo.

npx localtunnel --port 3000

echo.
echo ════════════════════════════════════════════════════════
echo URL compartilhada!
echo ════════════════════════════════════════════════════════
echo.
echo Copie a URL acima (https://...)
echo.
echo Mantenha esta janela aberta para seu amigo acessar!
echo.
pause
