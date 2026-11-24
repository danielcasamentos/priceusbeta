# Correção das Variáveis de Contrato

## Problema Identificado

As variáveis `{{DATA_EVENTO}}`, `{{CIDADE_EVENTO}}` e `{{VALOR_TOTAL}}` não estavam sendo substituídas corretamente nos contratos gerados a partir de leads.

## Causa Raiz

O problema ocorria porque:

1. **Inconsistência nos nomes dos campos**: O `ContractGenerator.tsx` salvava o campo como `cidade` enquanto a função `replaceContractVariables` esperava também `cidade_evento`
2. **Falta de fallbacks robustos**: A função não tinha fallbacks suficientes para lidar com variações de nomes
3. **Conversão de tipos**: Alguns valores poderiam vir como string e precisavam ser convertidos para número

## Correções Implementadas

### 1. Atualização da Interface LeadData (`src/lib/contractVariables.ts`)

Adicionados campos alternativos para garantir compatibilidade:

```typescript
export interface LeadData {
  // ... outros campos
  cidade?: string;
  cidade_evento?: string;      // ✅ NOVO
  orcamento_total?: number;
  valor_total?: number;         // ✅ NOVO
  // ... outros campos
}
```

### 2. Melhorias na Função de Substituição (`src/lib/contractVariables.ts`)

#### DATA_EVENTO
- Agora usa formato ISO com timezone (`dataEvento + 'T00:00:00'`) para evitar problemas de fuso horário
- Adiciona try-catch para tratar erros de formatação
- Retorna string original como fallback em caso de erro

```typescript
'{{DATA_EVENTO}}': (() => {
  const dataEvento = leadData.data_evento;
  if (!dataEvento) return '';
  try {
    return new Date(dataEvento + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch (e) {
    console.error('Erro ao formatar data_evento:', dataEvento, e);
    return String(dataEvento);
  }
})()
```

#### CIDADE_EVENTO
- Verifica múltiplos campos na ordem de prioridade: `cidade_evento`, `cidade`, `clientData.cidade_evento`

```typescript
'{{CIDADE_EVENTO}}': leadData.cidade_evento || leadData.cidade || clientData.cidade_evento || ''
```

#### VALOR_TOTAL
- Verifica ambos `orcamento_total` e `valor_total`
- Faz conversão automática de string para número quando necessário
- Valida se o valor é um número válido antes de formatar

```typescript
'{{VALOR_TOTAL}}': (() => {
  const valorTotal = leadData.orcamento_total || leadData.valor_total;
  if (!valorTotal) return '';
  const valor = typeof valorTotal === 'string' ? parseFloat(valorTotal) : valorTotal;
  return isNaN(valor) ? '' : `R$ ${valor.toFixed(2).replace('.', ',')}`;
})()
```

### 3. Correção no Salvamento dos Dados (`src/components/ContractGenerator.tsx`)

O `leadData` agora é salvo com todos os campos necessários:

```typescript
const leadData = {
  nome_cliente: lead.nome_cliente,
  email: lead.email_cliente || lead.email,
  telefone: lead.telefone_cliente || lead.telefone,
  tipo_evento: lead.tipo_evento,
  data_evento: lead.data_evento,
  cidade: lead.cidade_evento || lead.cidade,
  cidade_evento: lead.cidade_evento || lead.cidade,    // ✅ NOVO
  subtotal: subtotal,
  orcamento_total: orcamentoTotal,
  valor_total: orcamentoTotal,                         // ✅ NOVO
  produtos: produtos,
  servicos: [],
  desconto_cupom: descontoCupom,
  acrescimo_pagamento: acrescimoPagamento,
  ajuste_sazonal: ajusteSazonal,
  ajuste_geografico: ajusteGeografico,
  forma_pagamento: formaPagamentoNome,
};
```

### 4. Logs de Debug Aprimorados

Adicionados logs detalhados em JSON para facilitar diagnóstico:

```typescript
console.log('=== REPLACE CONTRACT VARIABLES ===');
console.log('Lead Data Received:', JSON.stringify(leadData, null, 2));
console.log('Client Data Received:', JSON.stringify(clientData, null, 2));
console.log('Business Settings:', JSON.stringify(businessSettings, null, 2));

// ... depois da geração

console.log('=== VARIABLES GENERATED ===');
console.log('{{DATA_EVENTO}}:', variables['{{DATA_EVENTO}}']);
console.log('{{CIDADE_EVENTO}}:', variables['{{CIDADE_EVENTO}}']);
console.log('{{VALOR_TOTAL}}:', variables['{{VALOR_TOTAL}}']);
```

## Compatibilidade

✅ As correções são **retrocompatíveis**:
- Contratos antigos continuam funcionando (fallbacks mantidos)
- Contratos novos usam os campos corretos
- A função aceita dados em qualquer formato (string ou number para valores)

## Variáveis Afetadas (Corrigidas)

| Variável | Status | Descrição |
|----------|--------|-----------|
| `{{DATA_EVENTO}}` | ✅ Corrigido | Formatação melhorada + tratamento de erros |
| `{{CIDADE_EVENTO}}` | ✅ Corrigido | Múltiplos fallbacks adicionados |
| `{{VALOR_TOTAL}}` | ✅ Corrigido | Conversão automática + validação |
| `{{SUBTOTAL}}` | ✅ Melhorado | Conversão automática + validação |

## Como Testar

1. Acesse o sistema de Leads
2. Selecione um lead com:
   - Data do evento preenchida
   - Cidade do evento preenchida
   - Valor total calculado
3. Clique em "Gerar Contrato"
4. Verifique no console do navegador os logs detalhados
5. Confirme que as variáveis foram substituídas corretamente no contrato

## Próximos Passos

Se ainda houver problemas:

1. Abra o Console do Navegador (F12)
2. Vá em "Console"
3. Procure pelos logs que começam com `===`
4. Verifique se os dados do lead contêm os valores esperados
5. Compare com as variáveis geradas

Os logs detalhados mostrarão exatamente quais dados estão disponíveis e quais variáveis foram criadas.
