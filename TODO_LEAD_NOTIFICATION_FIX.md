# Plano de Correção - Sistema de Leads, Notificações e Analytics

## Problemas Identificados e Correções Aplicadas:

### ✅ 1. Schema de Notificações Inconsistente
- **Problema**: Tabela usa `read`, código espera `is_read`, faltam `link` e `related_id`
- **Solução**: Criada migração `20260310000001_fix_notifications_schema_complete.sql` para adicionar colunas que faltam

### ✅ 2. Notificações Duplicadas
- **Problema**: Edge Function E LeadsManager criavam notificações separadamente
- **Solução**: Removida criação de notificação da Edge Function (agora só o LeadsManager cria)

### ✅ 3. Botões "Marcar como lida" não funcionavam
- **Problema**: Hook usava `is_read` mas tabela tinha `read`
- **Solução**: Atualizado `useNotifications.ts` para tentar `is_read` primeiro, e usar `read` como fallback

### ✅ 4. Mensagem de notificação genérica
- **Problema**: Uma das notificações mostrava "você recebeu um novo lead de um cliente"
- **Solução**: Correção da mensagem no LeadsManager para incluir "!" e nome do cliente

### ✅ 5. Filtro no realtime causando problemas
- **Problema**: filtro nas dependências do useEffect causava recriação do canal
- **Solução**: Removido `filter` das dependências do useEffect

---

## Arquivos Modificados:

1. `supabase/migrations/20260310000001_fix_notifications_schema_complete.sql` - NOVO
2. `supabase/functions/create-lead/index.ts` - Removida criação de notificação duplicada
3. `src/hooks/useNotifications.ts` - Compatibilidade com `read`/`is_read`
4. `src/components/LeadsManager.tsx` - Correção de dependências e mensagem

---

## Próximos Passos (Executar no Supabase):

1. Executar a migração SQL no Supabase:
   - `supabase/migrations/20260310000001_fix_notifications_schema_complete.sql`

2. Fazer deploy da Edge Function atualizada:
   - `supabase/functions/create-lead/index.ts`

3. Redeploy do frontend no Netlify

