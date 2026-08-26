# 🔐 Email Checker

Ferramenta para testar suas contas de email com senhas padrão usando API real (SMTP).

## ⚠️ IMPORTANTE

Esta ferramenta é **apenas para testar suas próprias contas**. Usar em contas de terceiros é ilegal!

## 🚀 Instalação

1. **Instale as dependências:**
```bash
npm install
```

2. **Inicie o servidor:**
```bash
npm start
```

3. **Acesse no navegador:**
```
http://localhost:3000
```

## 📋 Como Usar

1. Insira seu email
2. Selecione o provider (Gmail ou Outlook)
3. Clique em "🔍 Testar Email"
4. Aguarde a verificação das senhas padrão

## 💾 Resultados

Os resultados são salvos automaticamente em `results.json` com:
- Email testado
- Senha que funcionou (se houver)
- Provider usado
- Data/hora do teste

## 🔑 Senhas Padrão Testadas

- 123456
- 12345678
- password
- qwerty
- abc123
- password123
- 111111
- 1234567
- letmein
- 123123
- welcome
- monkey
- 1q2w3e4r
- admin
- root

## 🔧 Configuração do Gmail

Se usar Gmail, você pode precisar:
1. Habilitar "[Senhas de Aplicativos](https://myaccount.google.com/apppasswords)" ao invés de usar sua senha normal
2. Ou desabilitar "Verificação em duas etapas" temporariamente

## 📁 Estrutura

```
checker/
├── server.js          # Backend Node.js
├── package.json       # Dependências
├── results.json       # Resultados salvos
└── public/
    └── index.html     # Interface web
```

## ⚖️ Aviso Legal

Use esta ferramenta apenas em contas **suas**. O acesso não autorizado é crime!
