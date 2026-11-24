# 🚀 GUIA DE DEPLOYMENT PARA BOLT.NEW

## ⚠️ PROBLEMA COMUM

Se você fez upload do projeto no Bolt.new e não está funcionando, o problema geralmente é um dos seguintes:

1. **Variáveis de ambiente não configuradas**
2. **Build não foi executado antes do upload**
3. **Arquivos incorretos foram enviados**
4. **Rotas não estão configuradas corretamente**

---

## ✅ SOLUÇÃO COMPLETA

### **PASSO 1: Verificar Build Local**

Antes de fazer upload, SEMPRE execute o build:

```bash
npm run build
```

**Resultado esperado:**
```
✓ 1590 modules transformed
✓ built in 5.05s

dist/index.html                   0.47 kB
dist/assets/index-DXwsT_SA.css   39.82 kB
dist/assets/index-B8H3k-iP.js   511.84 kB
```

---

### **PASSO 2: Verificar Variáveis de Ambiente**

O projeto precisa das seguintes variáveis de ambiente no **Bolt.new**:

```env
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY=example-key-placeholder
VITE_SESSION_TIMEOUT=[REDACTED]
```

**Como adicionar no Bolt.new:**
1. Abra as configurações do projeto
2. Vá em "Environment Variables"
3. Adicione cada variável acima

---

### **PASSO 3: Arquivos Necessários para Upload**

#### **Estrutura Mínima:**

```
projeto/
├── dist/                    ← Pasta gerada pelo build
│   ├── index.html          ← Arquivo principal
│   ├── assets/             ← CSS e JS compilados
│   │   ├── index-*.css
│   │   └── index-*.js
│   └── favicon.svg
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
└── .env                    ← Variáveis de ambiente
```

#### **O QUE ENVIAR:**

✅ **ENVIAR:**
- Pasta `dist/` completa (após build)
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- Todos arquivos `.ts` e `.tsx` em `src/`
- `tsconfig.json`
- `tailwind.config.js`
- `postcss.config.js`

❌ **NÃO ENVIAR:**
- `node_modules/`
- `.git/`
- Arquivos temporários
- Logs

---

### **PASSO 4: Configurar Redirects (Importante para SPA)**

Crie ou verifique o arquivo `dist/_redirects`:

```
/*    /index.html   200
```

Este arquivo garante que todas as rotas (ex: `/dashboard`, `/quote/xyz`) sejam redirecionadas para o `index.html` (comportamento SPA).

---

### **PASSO 5: Deploy no Bolt.new**

#### **Opção A: Deploy Manual**

1. Faça build local:
```bash
npm run build
```

2. Compacte a pasta `dist/`:
```bash
zip -r dist.zip dist/
```

3. Faça upload no Bolt.new
4. Configure variáveis de ambiente
5. Deploy!

#### **Opção B: Deploy via Git (Recomendado)**

1. Conecte repositório GitHub ao Bolt.new
2. Configure variáveis de ambiente no painel
3. Bolt.new detecta `vite.config.ts` automaticamente
4. Build e deploy automático!

---

## 🔧 TROUBLESHOOTING

### **Problema: Página em Branco**

**Causas:**
- Variáveis de ambiente não configuradas
- Build não foi feito
- Caminho dos assets incorreto

**Solução:**
1. Abra o console do navegador (F12)
2. Verifique erros de "Failed to load module"
3. Configure variáveis de ambiente
4. Faça novo build

---

### **Problema: "Cannot read properties of undefined"**

**Causa:** Variáveis de ambiente do Supabase não configuradas

**Solução:**
```env
VITE_SUPABASE_URL=https://akgkueojnsjxvbubeojr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

### **Problema: Rotas 404 (Ex: /dashboard dá erro)**

**Causa:** Falta configuração de redirect para SPA

**Solução:**
Criar `dist/_redirects`:
```
/*    /index.html   200
```

Ou configurar no Bolt.new:
- Settings → Redirects
- Add: `/*` → `/index.html` (200)

---

### **Problema: Imagens Não Carregam**

**Causa:** Caminho incorreto ou storage do Supabase com erro

**Solução:**
1. Verificar se URLs das imagens estão corretas
2. Testar diretamente no navegador
3. Verificar políticas RLS no Supabase Storage

---

### **Problema: Login Não Funciona**

**Causas:**
- Variáveis de ambiente erradas
- Conexão com Supabase falhou
- Políticas RLS bloqueando

**Solução:**
1. Verificar console: "Invalid API key"?
2. Conferir `VITE_SUPABASE_ANON_KEY`
3. Testar conexão:
```typescript
console.log(supabase.auth.getSession())
```

---

## 📋 CHECKLIST PRÉ-DEPLOYMENT

Antes de fazer deploy, verifique:

- [ ] Build local funciona (`npm run build`)
- [ ] Teste local funciona (`npm run preview`)
- [ ] Variáveis de ambiente estão no `.env`
- [ ] Arquivo `_redirects` existe em `public/`
- [ ] Pasta `dist/` tem todos arquivos
- [ ] Código commitado no Git (se usar opção B)

---

## 🎯 CONFIGURAÇÃO RECOMENDADA NO BOLT.NEW

### **Build Settings:**

```yaml
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### **Environment Variables:**

```env
VITE_SUPABASE_URL=https://akgkueojnsjxvbubeojr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SESSION_TIMEOUT=[REDACTED]
```

### **Redirects:**

```
/*    /index.html   200
```

---

## 🚀 DEPLOY RÁPIDO (Passo a Passo)

### **Para Netlify (Alternativa ao Bolt.new):**

1. **Instalar Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Login:**
```bash
netlify login
```

3. **Deploy:**
```bash
npm run build
netlify deploy --prod --dir=dist
```

4. **Configurar Variáveis:**
- Painel Netlify → Site Settings → Environment Variables
- Adicionar todas as `VITE_*`

---

### **Para Vercel:**

1. **Instalar Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Configurar Variáveis:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SESSION_TIMEOUT
```

---

## 📊 VERIFICAÇÃO PÓS-DEPLOY

Após deploy, teste:

1. **Página inicial carrega?**
   - ✅ https://seu-site.bolt.new/

2. **Login funciona?**
   - ✅ https://seu-site.bolt.new/login

3. **Dashboard abre?**
   - ✅ https://seu-site.bolt.new/dashboard

4. **Orçamento público funciona?**
   - ✅ https://seu-site.bolt.new/quote/{uuid}

5. **Imagens carregam?**
   - ✅ Produtos com imagens aparecem

6. **WhatsApp funciona?**
   - ✅ Botão abre com mensagem correta

---

## 🆘 SUPORTE

Se ainda não funcionar:

1. **Abra DevTools (F12)**
2. **Veja erros no Console**
3. **Veja erros na aba Network**
4. **Compartilhe prints dos erros**

**Erros Comuns:**

```
❌ "Failed to load module"
→ Build não foi feito ou assets não foram enviados

❌ "Invalid API key"
→ Variáveis de ambiente erradas

❌ "404 Not Found" nas rotas
→ Falta configuração de redirects

❌ "Network Error"
→ Supabase URL errada ou CORS
```

---

## 📝 ARQUIVO _redirects

Certifique-se que existe `public/_redirects`:

```
# Redirecionar todas rotas para index.html (SPA)
/*    /index.html   200
```

Ou `dist/_redirects` após build.

---

**Data:** 01/11/2024
**Status:** ✅ GUIA COMPLETO
**Plataformas:** Bolt.new, Netlify, Vercel

---

**Sistema pronto para deployment! Siga este guia passo a passo.** 🚀
