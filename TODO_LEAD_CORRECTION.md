# TODO - Correção do Sistema de Leads

## Problema
A Edge Function "create-lead" estava retornando erros 500 e 400, impedindo que os leads fossem salvos no banco de dados.

## Correções Implementadas

- [x] 1. Adicionar logs mais detalhados na Edge Function para debug
- [x] 2. Criar dois schemas Zod: um para auto-save (produtos opcionais) e outro para save final (produtos obrigatórios)
- [x] 3. Melhorar o tratamento de erros com logs detalhados
- [x] 4. Normalizar os dados do formulário (aceitar diferentes formatos de nomes de campos)
- [x] 5. Implementar lógica de upsert (atualizar se já existir) baseada em session_id
- [x] 6. Deploy da Edge Function atualizada
- [x] 7. Aplicar migração do banco de dados para campos extras

## Status: CONCLUÍDO ✅

