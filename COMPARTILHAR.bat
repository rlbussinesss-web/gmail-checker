@echo off
chcp 65001 >nul
cls

echo.
echo ════════════════════════════════════════════════════════
echo     📧 GMAIL CHECKER - COMPARTILHANDO COM LINK
echo ════════════════════════════════════════════════════════
echo.

REM Verificar se localtunnel está instalado
where lt >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Localtunnel não está instalado!
    echo.
    echo Instalando agora...
    npm install -g localtunnel
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Erro ao instalar! Tente manualmente:
        echo npm install -g localtunnel
        echo.
        pause
        exit /b 1
    )
)

REM Verificar se servidor está rodando
netstat -ano | findstr ":3000" >nul
if %errorlevel% neq 0 (
    echo ⚠️  ERRO: Servidor não está rodando!
    echo.
    echo Você precisa executar INICIAR.bat PRIMEIRO
    echo.
    echo Passos:
    echo 1. Abra INICIAR.bat em outra janela
    echo 2. Aguarde aparecer "✅ Servidor iniciando"
    echo 3. Então execute COMPARTILHAR.bat novamente
    echo.
    pause
    exit /b 1
)

echo ✅ Servidor detectado em http://localhost:3000
echo.
echo 🌐 Criando link público...
echo.
echo ⏳ Aguarde alguns segundos...
echo.

REM Iniciar localtunnel
lt --port 3000 --subdomain gmail-checker-%RANDOM%

echo.
echo ════════════════════════════════════════════════════════
echo ✅ LINK CRIADO COM SUCESSO!
echo ════════════════════════════════════════════════════════
echo.
echo 📌 Copie a URL acima (https://...) e compartilhe
echo.
echo ⚠️  IMPORTANTE:
echo - Mantenha essa janela ABERTA
echo - Seu amigo consegue acessar enquanto isso está rodando
echo - Se fechar, o link cai
echo.
echo Pressione CTRL+C para parar de compartilhar
echo.
pause
