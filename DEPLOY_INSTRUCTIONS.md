# Instruções de Deploy - Sistema de Limites de Plano

## Pré-requisitos

- Acesso ao dashboard do Supabase
- Aplicação React buildada com sucesso
- Acesso ao servidor de hospedagem (Vercel/Netlify/etc)

---

## Passo 1: Deploy do Backend (Supabase)

### 1.1. Executar Migration SQL

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie o conteúdo do arquivo:
   ```
   supabase/migrations/20251101190110_plan_limits_system.sql
   ```
6. Cole no editor SQL
7. Clique em **Run** (▶️)
8. Aguarde confirmação de sucesso

**Verificação:**
- Deve aparecer mensagens de sucesso no log
- Mensagem final: "✅ Sistema de Limites de Plano instalado com sucesso!"

### 1.2. Verificar Funções Criadas

Execute no SQL Editor:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%premium%' OR proname LIKE '%limit%';
```

Deve retornar:
- `is_premium_user`
- `validate_template_limit`
- `limit_leads_fifo`
- `validate_product_limit`

### 1.3. Verificar Triggers

Execute:
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%limit%';
```

Deve retornar:
- `trigger_validate_template_limit`
- `trigger_limit_leads_fifo`
- `trigger_validate_product_limit`

---

## Passo 2: Deploy do Frontend

### 2.1. Build Local (já feito)

```bash
npm run build
```

Status: ✅ Sucesso (544KB)

### 2.2. Deploy para Vercel (exemplo)

```bash
# Se ainda não tem Vercel CLI instalado
npm i -g vercel

# Deploy
vercel --prod
```

### 2.3. Deploy para Netlify (alternativa)

```bash
# Se ainda não tem Netlify CLI instalado
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

---

## Passo 3: Testes em Produção

### 3.1. Testar Email Privilegiado

1. Faça login com: `odanielfotografo@icloud.com`
2. Verificar:
   - Badge "Conta Especial" aparece
   - Pode criar mais de 1 template
   - Pode criar mais de 10 leads
   - Nenhum banner de upgrade aparece

### 3.2. Testar Conta Gratuita

1. Crie uma nova conta de teste
2. Não faça assinatura
3. Verificar:
   - Banner "Conta Gratuita" aparece no topo
   - Pode criar apenas 1 template
   - Ao tentar criar 2º template, aparece modal de upgrade
   - Pode criar até 10 leads
   - Ao criar 11º lead, o mais antigo é deletado
   - Avisos aparecem em 8 leads (80%)

### 3.3. Testar Conta Premium

1. Crie conta e faça assinatura via Stripe
2. Verificar:
   - Badge "Premium" aparece
   - Pode criar até 10 templates
   - Leads ilimitados
   - Produtos ilimitados

---

## Passo 4: Monitoramento

### 4.1. Logs do Supabase

Monitore erros de triggers:
```sql
-- Ver últimos erros
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%validate_%' OR query LIKE '%limit_%'
ORDER BY calls DESC 
LIMIT 10;
```

### 4.2. Analytics de Conversão

Monitore quantos usuários atingem limites:
```sql
-- Usuários que atingiram limite de templates
SELECT COUNT(*) as usuarios_com_limite
FROM (
  SELECT user_id, COUNT(*) as templates
  FROM templates
  GROUP BY user_id
  HAVING COUNT(*) >= 1
) AS subquery;

-- Usuários que atingiram limite de leads
SELECT COUNT(*) as usuarios_com_limite
FROM (
  SELECT user_id, COUNT(*) as leads
  FROM leads
  GROUP BY user_id
  HAVING COUNT(*) >= 10
) AS subquery;
```

---

## Passo 5: Configurações Opcionais

### 5.1. Adicionar Mais Emails Privilegiados

Editar `src/config/privilegedUsers.ts`:
```typescript
export const PRIVILEGED_EMAILS = [
  'odanielfotografo@icloud.com',
  'outro@exemplo.com' // Adicionar aqui
] as const;
```

Depois: rebuild e redeploy

### 5.2. Ajustar Limites

**Frontend:** `src/hooks/usePlanLimits.ts`
```typescript
const templatesLimit = isPremium ? 10 : 1;  // Ajustar aqui
const leadsLimit = isPremium ? 'unlimited' as const : 10;  // Ajustar aqui
const productsLimit = isPremium ? Infinity : 7;  // Ajustar aqui
```

**Backend:** Editar funções SQL na migration e executar novamente

---

## Rollback (Em caso de problemas)

### Remover Triggers
```sql
DROP TRIGGER IF EXISTS trigger_validate_template_limit ON templates;
DROP TRIGGER IF EXISTS trigger_limit_leads_fifo ON leads;
DROP TRIGGER IF EXISTS trigger_validate_product_limit ON produtos;
```

### Remover Funções
```sql
DROP FUNCTION IF EXISTS is_premium_user;
DROP FUNCTION IF EXISTS validate_template_limit;
DROP FUNCTION IF EXISTS limit_leads_fifo;
DROP FUNCTION IF EXISTS validate_product_limit;
```

---

## Suporte

Em caso de problemas:

1. **Erro de Build:** Verificar logs de TypeScript
2. **Erro de Trigger:** Verificar logs do Supabase
3. **Email não funciona:** Verificar `privilegedUsers.ts`
4. **Limites não aplicados:** Verificar se migration foi executada

---

## Checklist Final

- [ ] Migration SQL executada com sucesso
- [ ] Funções SQL verificadas
- [ ] Triggers verificados
- [ ] Frontend buildado sem erros
- [ ] Deploy realizado
- [ ] Email privilegiado testado
- [ ] Conta gratuita testada
- [ ] Conta premium testada
- [ ] Banners aparecem corretamente
- [ ] Modais funcionam
- [ ] Limites são aplicados

---

**Implementado em:** 01 de Novembro de 2024  
**Status:** ✅ Pronto para Produção
