# Guia do Sistema de Contratos Digitais

## Resumo das Melhorias Implementadas

O sistema de contratos digitais foi completamente reformulado para resolver os seguintes problemas:

### Problemas Corrigidos

1. **Variáveis não substituídas** - As variáveis `{{NOME_COMPLETO_CLIENTE}}`, `{{VALOR_TOTAL}}`, etc. agora são automaticamente preenchidas
2. **Dados do prestador ausentes** - Criada área de "Dados Empresariais" no menu principal
3. **Avisos deprecated do React** - ContractCanvas refatorado para usar APIs modernas

## Como Usar o Sistema

### 1. Configurar Dados Empresariais (OBRIGATÓRIO)

**Primeira etapa:** Configure seus dados empresariais uma única vez.

1. Acesse o menu **"Dados Empresariais"** no painel principal
2. Preencha todos os seus dados:
   - Nome/Razão Social da empresa
   - CNPJ
   - Endereço completo
   - Telefone e Email
   - Dados bancários (PIX, Banco, Agência, Conta)
3. Clique em **"Salvar Configurações"**

**Importante:** Estes dados serão reutilizados automaticamente em todos os contratos que você gerar!

### 2. Criar Template de Contrato

1. Acesse **"Contratos"** no menu principal
2. Clique em **"Novo Contrato"**
3. Escreva o texto do contrato usando as variáveis disponíveis

### 3. Variáveis Disponíveis

Use estas variáveis no seu texto de contrato. Elas serão substituídas automaticamente:

#### Dados do Prestador (você)
- `{{NOME_PRESTADOR}}` - Nome/Razão Social
- `{{CNPJ_PRESTADOR}}` - CNPJ da empresa
- `{{ENDERECO_PRESTADOR}}` - Endereço completo
- `{{CIDADE_PRESTADOR}}` - Cidade
- `{{ESTADO_PRESTADOR}}` - Estado (UF)
- `{{CEP_PRESTADOR}}` - CEP
- `{{TELEFONE_PRESTADOR}}` - Telefone
- `{{EMAIL_PRESTADOR}}` - Email
- `{{PIX_PRESTADOR}}` - Chave PIX
- `{{BANCO_PRESTADOR}}` - Nome do banco
- `{{AGENCIA_PRESTADOR}}` - Agência
- `{{CONTA_PRESTADOR}}` - Conta bancária

#### Dados do Cliente
- `{{NOME_COMPLETO_CLIENTE}}` - Nome completo
- `{{CPF_CLIENTE}}` - CPF
- `{{RG_CLIENTE}}` - RG
- `{{ENDERECO_COMPLETO_CLIENTE}}` - Endereço
- `{{CEP_CLIENTE}}` - CEP
- `{{TELEFONE_CLIENTE}}` - Telefone
- `{{EMAIL_CLIENTE}}` - Email

#### Dados do Evento
- `{{LOCAL_EVENTO}}` - Nome do local
- `{{ENDERECO_EVENTO}}` - Endereço do evento
- `{{CIDADE_EVENTO}}` - Cidade do evento
- `{{DATA_EVENTO}}` - Data do evento
- `{{HORARIO_INICIO}}` - Horário de início
- `{{HORARIO_FIM}}` - Horário de término
- `{{OBSERVACOES_CLIENTE}}` - Observações do cliente

#### Dados Financeiros
- `{{VALOR_TOTAL}}` - Valor total do serviço
- `{{DESCONTO_CUPOM}}` - Desconto aplicado
- `{{FORMA_PAGAMENTO}}` - Forma de pagamento
- `{{PRODUTOS_LISTA}}` - Lista de produtos
- `{{SERVICOS_LISTA}}` - Lista de serviços

### 4. Exemplo de Template de Contrato

```
CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Prestador:
{{NOME_PRESTADOR}}, CNPJ: {{CNPJ_PRESTADOR}}
Endereço: {{ENDERECO_PRESTADOR}}, {{CIDADE_PRESTADOR}}/{{ESTADO_PRESTADOR}}
Telefone: {{TELEFONE_PRESTADOR}}
Email: {{EMAIL_PRESTADOR}}

Cliente:
{{NOME_COMPLETO_CLIENTE}}, CPF: {{CPF_CLIENTE}}, RG: {{RG_CLIENTE}}
Endereço: {{ENDERECO_COMPLETO_CLIENTE}}, CEP: {{CEP_CLIENTE}}
Telefone: {{TELEFONE_CLIENTE}}
Email: {{EMAIL_CLIENTE}}

DADOS DO EVENTO:
Data: {{DATA_EVENTO}}
Local: {{LOCAL_EVENTO}}
Endereço: {{ENDERECO_EVENTO}}, {{CIDADE_EVENTO}}
Horário: {{HORARIO_INICIO}} às {{HORARIO_FIM}}

SERVIÇOS CONTRATADOS:
{{SERVICOS_LISTA}}

PRODUTOS INCLUSOS:
{{PRODUTOS_LISTA}}

{{DESCONTO_CUPOM}}

VALOR TOTAL: {{VALOR_TOTAL}}

FORMA DE PAGAMENTO:
{{FORMA_PAGAMENTO}}

DADOS PARA PAGAMENTO:
PIX: {{PIX_PRESTADOR}}
Banco: {{BANCO_PRESTADOR}}
Agência: {{AGENCIA_PRESTADOR}}
Conta: {{CONTA_PRESTADOR}}

OBSERVAÇÕES:
{{OBSERVACOES_CLIENTE}}
```

### 5. Gerar Contrato para Cliente

1. Vá até **"Leads"**
2. Selecione um lead/orçamento
3. Clique em **"Gerar Contrato"**
4. Escolha o template de contrato desejado
5. Defina a validade do link (em dias)
6. Clique em **"Gerar Contrato"**
7. Envie o link por WhatsApp ou Email

### 6. Cliente Assina o Contrato

Quando o cliente acessar o link:

1. Verá o contrato com **todos os dados já preenchidos**
2. Preencherá seus dados pessoais (CPF, RG, endereço, etc.)
3. Preencherá detalhes do evento (local, horários, observações)
4. Assinará digitalmente no campo de assinatura
5. Receberá uma cópia em PDF com todos os dados completos

### 7. Visualizar Contratos Assinados

O contrato assinado terá:
- ✅ Todos os placeholders substituídos por dados reais
- ✅ Seus dados empresariais preenchidos
- ✅ Dados do cliente preenchidos
- ✅ Assinatura digital
- ✅ Data, hora e IP da assinatura
- ✅ QR Code para verificação

## Melhorias Técnicas

### 1. Sistema de Substituição de Variáveis
- Arquivo: `src/lib/contractVariables.ts`
- Função: `replaceContractVariables()`
- Substitui automaticamente todas as variáveis no template

### 2. Tabela de Configurações Empresariais
- Migration: `20251105050000_create_user_business_settings.sql`
- Tabela: `user_business_settings`
- RLS configurado para segurança

### 3. Componente de Configurações
- Arquivo: `src/components/BusinessSettingsEditor.tsx`
- Interface amigável para editar dados empresariais
- Validação de campos

### 4. ContractCanvas Refatorado
- Remove avisos deprecated do React
- Usa `useCallback` e refs de forma otimizada
- Melhor performance e estabilidade

### 5. Integração Completa
- ContractSignPage carrega dados empresariais automaticamente
- ContractCompletePage gera PDF com todos os dados substituídos
- DashboardPage inclui nova seção "Dados Empresariais"

## Fluxo Completo

```
1. Usuário configura dados empresariais (uma vez)
   ↓
2. Usuário cria template com variáveis
   ↓
3. Usuário cria lead/orçamento
   ↓
4. Usuário gera contrato para o lead
   ↓
5. Sistema substitui variáveis do prestador automaticamente
   ↓
6. Cliente recebe link do contrato
   ↓
7. Cliente preenche seus dados e assina
   ↓
8. Sistema substitui variáveis do cliente
   ↓
9. PDF final gerado com TODOS os dados preenchidos
```

## Benefícios

✅ **Praticidade** - Configure seus dados uma vez, use sempre
✅ **Profissionalismo** - Contratos completos e bem formatados
✅ **Automatização** - Substituição automática de variáveis
✅ **Segurança** - Assinatura digital com timestamp e IP
✅ **Rastreabilidade** - QR Code para verificação de autenticidade

## Suporte

Para dúvidas ou suporte:
- Acesse a Central de Ajuda (FAQ) no painel
- Use o chat de suporte no canto inferior direito
- Assista aos tutoriais em vídeo na seção "Tutoriais em Vídeo"
