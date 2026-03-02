# Correções Aplicadas - Erros do Console

## 📋 Resumo dos Erros Corrigidos

### 1. ✅ create-lead (400 Bad Request) - CORRIGIDO
**Arquivo:** `supabase/create-lead/index.ts`

**Problema:** O payload enviado pelo frontend não correspondia às colunas do banco de dados.

**Correção:** Adicionado mapeamento de campos:
- `nome_cliente` → `client_name`
- `email_cliente` → `client_email`
- `telefone_cliente` → `client_phone`
- `valor_total` → `total_value`
- `orcamento_detalhe` → `orcamento_detalhes`

---

### 2. ✅ create-analytics-session (500 Internal Server Error) - CORRIGIDO
**Arquivo:** `supabase/functions/create-analytics-session/index.ts` (NOVO)

**Problema:** Edge Function não existia.

**Correção:** Criada a Edge Function completa que:
- Cria sessões de analytics para tracking de comportamento
- Lida com caso onde a tabela não existe
- Retorna ID temporário se necessário para não quebrar o fluxo

**Arquivo SQL:** `supabase/migrations/create_analytics_orcamentos_table.sql`
- Criar a tabela `analytics_orcamentos` se não existir

---

### 3. ✅ configuracao_agenda (403 Forbidden) - CORRIGIDO
**Arquivo:** `supabase/migrations/fix_configuracao_agenda_rls.sql` (NOVO)

**Problema:** Política RLS bloqueava acesso anônimo.

**Correção:** Criadas políticas RLS para:
- Leitura anônima permitida
- Insert/update apenas para usuário logado/dono

---

### 4. ⚠️ Service Worker (Non-Critical)
**Arquivo:** `netlify.toml`

**Problema:** MIME type incorreto ('text/html' ao invés de 'application/javascript')

**Correção:** Adicionadas regras de redirect específicas para os arquivos Service Worker.

---

## 🚀 Como Aplicar as Correções

### Passo 1: Aplicar SQL Migrations

Execute no Supabase SQL Editor:

```sql
-- 1. Criar tabela de analytics (se não existir)
\i supabase/migrations/create_analytics_orcamentos_table.sql

-- 2. Corrigir RLS da agenda
\i supabase/migrations/fix_configuracao_agenda_rls.sql
```

Ou execute manualmente o conteúdo dos arquivos.

### Passo 2: Implantar Edge Functions

No diretório do projeto, execute:

```bash
# Deploy da Edge Function create-lead
supabase functions deploy create-lead

# Deploy da nova Edge Function create-analytics-session  
supabase functions deploy create-analytics-session
```

Ou usando npx:
```bash
npx supabase functions deploy create-lead
npx supabase functions deploy create-analytics-session
```

### Passo 3: Fazer Rebuild do Frontend

```bash
npm run build
```

E fazer deploy para o Netlify.

---

## 📝 Notas

- O erro do Service Worker é menor e pode não aparecer em todos os ambientes
- Após aplicar as correções, os leads serão salvos corretamente no banco de dados
- O analytics também funcionará após a criação da tabela e deploy da função

