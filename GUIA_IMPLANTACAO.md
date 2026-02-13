# 🚀 Guia de Implantação - Priceus Sistema de Leads

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (gratuita)
- Editor de código (VS Code recomendado)
- Conhecimento básico de terminal/linha de comando

---

## 🎯 Passo 1: Configuração do Supabase

### 1.1 Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: Priceus
   - **Database Password**: Crie uma senha forte
   - **Region**: Escolha o mais próximo (ex: São Paulo)
5. Aguarde 2-3 minutos para o projeto ser criado

### 1.2 Obter Credenciais

1. No dashboard do projeto, vá em **Settings** → **API**
2. Copie as seguintes informações:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public key** (uma chave longa começando com `eyJ...`)

### 1.3 Criar Banco de Dados

✅ **ATENÇÃO**: O banco já foi criado automaticamente via migração!

As seguintes tabelas já existem:
- `profiles`
- `templates`
- `produtos`
- `campos`
- `formas_pagamento`
- `cupons`
- `acrescimos_sazonais`
- `acrescimos_localidade`
- `leads` ⭐ (Nova)
- `cookies_consent` ⭐ (Nova)

Para verificar, vá em **Table Editor** no Supabase e confirme que todas as tabelas estão visíveis.

---

## 🔧 Passo 2: Configuração Local

### 2.1 Clonar/Baixar o Projeto

Se ainda não tem o projeto:
```bash
# Se estiver no Git
git clone <url-do-repositorio>
cd priceus

# OU apenas entre na pasta do projeto
cd /caminho/para/priceus
```

### 2.2 Instalar Dependências

```bash
npm install
```

### 2.3 Configurar Variáveis de Ambiente

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua os valores pelas suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

# Session tracking
VITE_SESSION_TIMEOUT=1800000
```

⚠️ **IMPORTANTE**: Substitua `SEU_PROJETO` e `sua_chave_anon_aqui` pelos valores reais do Supabase!

### 2.4 Testar Localmente

```bash
npm run dev
```

Abra o navegador em: `http://localhost:5173`

Você deve ver a tela de login do Priceus! 🎉

---

## 🧪 Passo 3: Testar o Sistema

### 3.1 Criar Primeira Conta

1. Na tela de login, clique em **"Não tem uma conta? Cadastre-se"**
2. Preencha:
   - Email: seu@email.com
   - Senha: mínimo 6 caracteres
3. Clique em **"Criar Conta"**
4. Após o cadastro, faça login com as mesmas credenciais

### 3.2 Verificar Dashboard

Após o login, você deve ver:
- ✅ Header com "Priceus" e botão "Sair"
- ✅ Seção "Gestão de Leads"
- ✅ 4 cards de estatísticas (todos zerados inicialmente)
- ✅ Filtros de status
- ✅ Mensagem "Nenhum lead encontrado"

### 3.3 Testar Captura de Lead (Simulação)

Para testar a captura, você precisaria criar um template e compartilhar o link do orçamento. Por enquanto, vamos apenas verificar que o sistema está funcionando.

---

## 🌐 Passo 4: Deploy em Produção

### Opção A: Vercel (Recomendado - Gratuito)

1. **Criar conta na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com GitHub

2. **Importar Projeto**
   - Clique em "New Project"
   - Conecte seu repositório Git
   - Selecione o projeto Priceus

3. **Configurar Variáveis de Ambiente**
   - Na aba "Environment Variables", adicione:
     - `VITE_SUPABASE_URL`: sua URL do Supabase
     - `VITE_SUPABASE_ANON_KEY`: sua chave anon
     - `VITE_SESSION_TIMEOUT`: 1800000

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde 2-3 minutos
   - Seu site estará no ar! 🎉

### Opção B: Netlify (Alternativa)

1. **Criar conta na Netlify**
   - Acesse [netlify.com](https://netlify.com)
   - Faça login

2. **Deploy Manual**
   ```bash
   npm run build
   ```
   - Arraste a pasta `dist` para o Netlify

3. **Configurar Variáveis**
   - Em Site Settings → Environment Variables
   - Adicione as mesmas variáveis da Opção A

---

## 🔐 Passo 5: Segurança Pós-Deploy

### 5.1 Configurar Domínio Permitido no Supabase

1. No Supabase, vá em **Authentication** → **URL Configuration**
2. Em **Site URL**, adicione sua URL de produção:
   ```
   https://seu-site.vercel.app
   ```
3. Em **Redirect URLs**, adicione:
   ```
   https://seu-site.vercel.app/**
   ```

### 5.2 Verificar RLS (Row Level Security)

1. No Supabase, vá em **Table Editor**
2. Clique em cada tabela
3. Verifique que o ícone **RLS** está ativo (verde)
4. Clique em **View Policies** para ver as políticas

---

## 📊 Passo 6: Monitoramento

### 6.1 Supabase Dashboard

Monitore em **Database** → **Tables**:
- Quantos leads foram capturados
- Quantos usuários cadastrados
- Estatísticas de uso

### 6.2 Analytics (Opcional)

Para adicionar Google Analytics:
1. Crie uma conta em [analytics.google.com](https://analytics.google.com)
2. Obtenha o código de tracking
3. Adicione ao `index.html` do projeto

---

## 🆘 Troubleshooting

### Erro: "Missing Supabase environment variables"

**Solução**: Verifique que o arquivo `.env` existe e tem os valores corretos.

### Erro: "Failed to fetch"

**Solução**:
1. Verifique que o Supabase está online
2. Confirme que as credenciais estão corretas
3. Verifique a conexão com internet

### Modal de Cookies não aparece

**Solução**: Limpe o localStorage do navegador:
```javascript
// No console do navegador (F12)
localStorage.clear()
// Recarregue a página
```

### Leads não estão sendo salvos

**Solução**:
1. Abra o console do navegador (F12)
2. Procure por erros em vermelho
3. Verifique que a tabela `leads` existe no Supabase
4. Confirme que as políticas de RLS permitem inserção anônima

### Build falha com erro de TypeScript

**Solução**:
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🎓 Próximos Passos

Após a implantação bem-sucedida:

1. **Criar Templates de Orçamento**
   - Adicione produtos/serviços
   - Configure formas de pagamento
   - Personalize campos do formulário

2. **Testar Fluxo Completo**
   - Gere um orçamento como cliente
   - Verifique captura automática
   - Teste mensagem WhatsApp

3. **Personalizar Visual**
   - Edite cores em `tailwind.config.js`
   - Customize textos e mensagens
   - Adicione logo da empresa

4. **Configurar Domínio Próprio**
   - Compre um domínio (ex: priceus.com.br)
   - Configure no Vercel/Netlify
   - Atualize URLs no Supabase

---

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação React](https://react.dev)
- [Guia Tailwind CSS](https://tailwindcss.com/docs)
- [Documentação Vite](https://vitejs.dev)

---

## ✅ Checklist de Implantação

- [ ] Projeto Supabase criado
- [ ] Tabelas do banco criadas
- [ ] Variáveis de ambiente configuradas
- [ ] Sistema testado localmente
- [ ] Deploy em produção realizado
- [ ] Domínios configurados no Supabase
- [ ] RLS verificado e ativo
- [ ] Primeira conta criada e testada
- [ ] Lead de teste capturado com sucesso
- [ ] WhatsApp testado e funcionando

---

**🎉 Parabéns! Seu sistema de captura de leads está no ar!**

Em caso de dúvidas, revise este guia ou consulte a documentação no arquivo `SISTEMA_LEADS.md`.
