# Correção de Placeholders do Contrato

## ✅ Problema Resolvido

Os placeholders não estavam sendo substituídos porque faltavam mapeamentos diretos para alguns placeholders usados no template.

## Mudanças Aplicadas

### 1. Adicionados Placeholders de Lead (Importados do Orçamento)

Estes placeholders agora estão funcionando e são preenchidos automaticamente com os dados do lead/orçamento:

- `{{NOME_CLIENTE}}` - Nome do cliente do lead
- `{{EMAIL_CLIENTE}}` - Email do lead
- `{{TELEFONE_CLIENTE}}` - Telefone do lead
- `{{DATA_EVENTO}}` - Data do evento (formatada em PT-BR: dd/mm/aaaa)
- `{{CIDADE_EVENTO}}` - Cidade do evento

### 2. Melhorias na Formatação

- **Data do Evento**: Agora formatada automaticamente em português (ex: 25/12/2024)
- **Produtos e Serviços**: Formatados como lista com preços
- **Valores**: Todos formatados em Real brasileiro (R$)

### 3. Ordem de Prioridade dos Dados

O sistema busca dados na seguinte ordem:

**Para dados do cliente:**
1. Dados preenchidos na assinatura (`clientData`)
2. Dados do lead (`leadData`)

**Para dados do evento:**
1. Dados do lead (automático do orçamento)
2. Dados preenchidos na assinatura

## Como Usar no Template

### Seção de Informações do Evento

```
Casamento: {{DATA_EVENTO}}, em: {{CIDADE_EVENTO}}
Local: {{LOCAL_EVENTO}}
Endereço: {{ENDERECO_EVENTO}}
Horário de Início: {{HORARIO_INICIO}}
Observações: {{OBSERVACOES_CLIENTE}}
```

### Seção de Pacote/Produtos

```
Pacote escolhido:

Produtos:
{{PRODUTOS_LISTA}}

Serviços:
{{SERVICOS_LISTA}}

Subtotal: {{SUBTOTAL}}
Desconto: {{DESCONTO_CUPOM}}
Acréscimo: {{ACRESCIMO_PAGAMENTO}}
Ajuste Sazonal: {{AJUSTE_SAZONAL}}
Ajuste Geográfico: {{AJUSTE_GEOGRAFICO}}

Total: {{VALOR_TOTAL}}

Forma de Pagamento: {{FORMA_PAGAMENTO}}
```

## Debug: Se os Dados Ainda Não Aparecem

### 1. Verifique os Dados do Lead no Banco

Os dados vêm da tabela `contracts` no campo `lead_data_json`:

```javascript
{
  "nome_cliente": "João Silva",
  "email": "joao@email.com",
  "telefone": "(34) 99999-9999",
  "data_evento": "2024-12-25",
  "cidade": "São Paulo",
  "subtotal": 5000,
  "orcamento_total": 5500,
  "produtos": [...],
  "servicos": [...],
  "desconto_cupom": 200,
  "acrescimo_pagamento": 700,
  "ajuste_sazonal": 0,
  "ajuste_geografico": 0,
  "forma_pagamento": "Cartão de Crédito"
}
```

### 2. Verifique Console do Navegador

Abra o DevTools (F12) e verifique se há erros relacionados a dados faltantes.

### 3. Teste com um Novo Contrato

1. Vá em Leads/Orçamentos
2. Selecione um lead com dados completos
3. Clique em "Gerar Contrato"
4. O sistema deve buscar automaticamente:
   - Nome, email, telefone do cliente
   - Data e cidade do evento
   - Lista de produtos e serviços
   - Todos os valores calculados

### 4. Campos Preenchidos na Assinatura vs Automáticos

**Preenchidos automaticamente do lead:**
- Nome do Cliente
- Email do Cliente
- Telefone do Cliente
- Data do Evento
- Cidade do Evento
- Produtos e Serviços
- Valores financeiros

**Preenchidos pelo cliente na hora da assinatura:**
- Nome Completo (confirmação)
- CPF, RG
- Endereço Completo
- CEP
- Local do Evento (nome do lugar)
- Endereço do Evento
- Horário de Início
- Observações

## Arquivos Modificados

- `src/lib/contractVariables.ts` - Lógica de substituição
- `src/components/ContractTemplateEditor.tsx` - Lista de placeholders
- `src/components/ContractGenerator.tsx` - Carregamento de dados
- `src/pages/ContractSignPage.tsx` - Página de assinatura

## Status

✅ Todos os placeholders estão mapeados e funcionando
✅ Build do projeto bem-sucedido
✅ Formatação de datas e valores corrigida
✅ Dados do lead sendo importados corretamente

