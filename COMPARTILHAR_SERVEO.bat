@echo off
chcp 65001 >nul
cls

echo.
echo ════════════════════════════════════════════════════════
echo    COMPARTILHANDO COM SERVEO
echo ════════════════════════════════════════════════════════
echo.
echo Iniciando tunnel SSH para porta 3000...
echo.
echo Aguarde aparecer a URL (tipo: https://seu-id.serveo.net)
echo.
echo ════════════════════════════════════════════════════════
echo.

ssh -R 80:localhost:3000 serveo.net

echo.
echo ════════════════════════════════════════════════════════
echo ✅ URL criada acima!
echo ════════════════════════════════════════════════════════
echo.
echo Copie a URL e compartilhe com seu amigo
echo.
echo Mantenha esta janela aberta!
echo.
pause
