# 📱 SISTEMA DE MENSAGENS WHATSAPP - DOCUMENTAÇÃO COMPLETA

## 🎯 Visão Geral

Sistema robusto e completo para geração automática de mensagens WhatsApp com suporte total a:
- ✅ Campos sazonais (data do evento)
- ✅ Campos geográficos (cidade do evento com ajustes)
- ✅ Campos personalizados dinâmicos (campoInserido01, campoInserido02...)
- ✅ Templates customizáveis
- ✅ Dois contextos: cliente→fotógrafo e fotógrafo→cliente

---

## 🏗️ Arquitetura

### **Arquivo Principal**: `src/lib/whatsappMessageGenerator.ts`

Contém toda a lógica centralizada de geração de mensagens.

### **Pontos de Integração**:

1. **QuotePage.tsx** - Cliente envia orçamento para fotógrafo
2. **LeadsManager.tsx** - Fotógrafo envia follow-up para cliente

---

## 📋 Função Principal: `generateWhatsAppMessage()`

```typescript
interface WhatsAppMessageOptions {
  // Dados do cliente
  clientName: string;
  clientEmail: string;
  clientPhone: string;

  // Dados do fotógrafo
  profile: Profile;
  template: Template;

  // Produtos
  products: Product[];
  selectedProducts: Record<string, number>;

  // Pagamento
  paymentMethod?: PaymentMethod;
  lastInstallmentDate?: string;

  // Preços
  priceBreakdown: PriceBreakdown;

  // Cupom
  couponCode?: string;
  couponDiscount?: number;

  // 🔥 AUTOMÁTICO: Dados sazonais/geográficos
  eventDate?: string;        // YYYY-MM-DD
  eventCity?: string;

  // 🔥 AUTOMÁTICO: Campos personalizados
  customFields: CustomField[];
  customFieldsData: Record<string, string>;

  // Contexto
  context: 'client-to-photographer' | 'photographer-to-client';
}
```

---

## 🔄 Fluxo de Funcionamento

### **1. Cliente → Fotógrafo** (QuotePage)

```
Cliente preenche formulário
         ↓
Sistema coleta TODOS os dados:
  • Nome, email, WhatsApp
  • Data do evento (se sazonal ativo)
  • Cidade (se geográfico ativo)
  • Campos extras (se existirem)
         ↓
generateWhatsAppMessage() cria mensagem completa
         ↓
generateWaLinkToPhotographer() cria link wa.me
         ↓
Cliente clica no botão
         ↓
WhatsApp abre com mensagem pré-preenchida
```

### **2. Fotógrafo → Cliente** (LeadsManager)

```
Fotógrafo clica em "Enviar WhatsApp" no lead
         ↓
Sistema busca dados do lead no banco
         ↓
generateWhatsAppMessage() cria mensagem de follow-up
         ↓
generateWaLinkToClient() cria link wa.me
         ↓
WhatsApp abre para enviar ao cliente
```

---

## 📝 Exemplos de Mensagens Geradas

### **Exemplo 1: Mensagem Completa (Cliente → Fotógrafo)**

**Cenário:**
- Sistema sazonal ATIVO
- Sistema geográfico ATIVO
- 2 campos personalizados
- Cupom aplicado

**Mensagem Gerada:**

```
Olá João Silva, tudo bem?

Criei um orçamento na sua página *Pacotes Casamento 2024* e gostaria de conversar sobre os serviços.

📝 *MEUS DADOS:*
Nome: Maria Santos
WhatsApp: (34) 99904-8840
E-mail: maria@email.com

📦 *SERVIÇOS DE INTERESSE:*
• 1x Casamento Completo - R$ 5.000,00
• 2x Ensaio Pré-Wedding - R$ 800,00

💰 *VALOR TOTAL:* R$ 6.270,00
💳 *Forma de Pagamento:* PIX Parcelado
Entrada: 30% (R$ 1.881,00)
Saldo: 6x de R$ 731,50

📝 *INFORMAÇÕES ADICIONAIS:*
📌 Número de Convidados: 150
📌 Horário Preferido: Tarde (14h-18h)

🗓️ *DETALHES DO EVENTO:*
📅 *Data do Evento:* 15/12/2024
   └─ Ajuste Sazonal: +R$ 500,00
📍 *Cidade do Evento:* Patos de Minas
   └─ Ajuste Regional: +R$ 200,00
   └─ Taxa de Deslocamento: R$ 100,00

Aguardo seu retorno para agendar uma reunião!
```

---

### **Exemplo 2: Sem Sistemas Ativos (Básico)**

**Cenário:**
- Sistema sazonal DESATIVADO
- Sistema geográfico DESATIVADO
- Sem campos extras
- Sem cupom

**Mensagem Gerada:**

```
Olá João Silva, tudo bem?

Criei um orçamento na sua página *Pacotes Casamento 2024* e gostaria de conversar sobre os serviços.

📝 *MEUS DADOS:*
Nome: Maria Santos
WhatsApp: (34) 99904-8840
E-mail: maria@email.com

📦 *SERVIÇOS DE INTERESSE:*
• 1x Casamento Completo

💰 *VALOR TOTAL:* R$ 5.000,00
💳 *Forma de Pagamento:* À Vista no PIX

Aguardo seu retorno para agendar uma reunião!
```

---

### **Exemplo 3: Follow-up (Fotógrafo → Cliente)**

**Cenário:**
- Fotógrafo enviando mensagem de follow-up

**Mensagem Gerada:**

```
Olá Maria Santos, tudo bem?

Vi que você criou um orçamento em nosso site e gostaria de ajudá-lo(a) a finalizar!

📦 *SERVIÇOS SOLICITADOS:*
• 1x Casamento Completo
• 2x Ensaio Pré-Wedding

💰 *VALOR TOTAL:* R$ 6.800,00

🗓️ *DETALHES DO EVENTO:*
📅 *Data do Evento:* 15/12/2024
📍 *Cidade do Evento:* Patos de Minas

Estou à disposição para esclarecer dúvidas e fechar o orçamento.

Como posso ajudar?
```

---

## 🔧 Integração com Supabase

### **Dados Necessários do Banco**

#### **Tabela: `profiles`**
```sql
SELECT
  nome_profissional,    -- Nome do fotógrafo
  email_recebimento,    -- Email de contato
  whatsapp_principal    -- Telefone para receber orçamentos
FROM profiles
WHERE id = :userId;
```

#### **Tabela: `templates`**
```sql
SELECT
  nome,                              -- Nome do template
  texto_whatsapp,                    -- Template personalizado (opcional)
  sistema_sazonal_ativo,             -- Se mostra campo data
  sistema_geografico_ativo,          -- Se mostra campo cidade
  ocultar_valores_intermediarios     -- Oculta valores unitários
FROM templates
WHERE id = :templateId;
```

#### **Tabela: `produtos`**
```sql
SELECT
  id,
  nome,
  valor
FROM produtos
WHERE template_id = :templateId
AND ativo = true;
```

#### **Tabela: `formas_pagamento`**
```sql
SELECT
  id,
  nome,
  entrada_tipo,          -- 'percentual' ou 'fixo'
  entrada_valor,         -- Valor ou %
  max_parcelas,          -- Número de parcelas
  acrescimo              -- % de acréscimo
FROM formas_pagamento
WHERE template_id = :templateId
AND ativo = true;
```

#### **Tabela: `campos_extras`**
```sql
SELECT
  id,
  label,
  obrigatorio
FROM campos_extras
WHERE template_id = :templateId
AND ativo = true;
```

#### **Tabela: `leads`**
```sql
SELECT
  nome_cliente,
  email_cliente,
  telefone_cliente,
  data_evento,           -- Para sistema sazonal
  cidade_evento,         -- Para sistema geográfico
  valor_total,
  orcamento_detalhe      -- JSON com produtos e configurações
FROM leads
WHERE id = :leadId;
```

---

## 🎨 Variáveis Disponíveis nos Templates

Fotógrafos podem personalizar mensagens usando estas variáveis:

### **Dados do Cliente**
- `{{CLIENT_NAME}}` - Nome do cliente
- `{{CLIENT_EMAIL}}` - Email do cliente
- `{{CLIENT_PHONE}}` - Telefone/WhatsApp do cliente

### **Dados do Fotógrafo**
- `{{PHOTOGRAPHER_NAME}}` - Nome do fotógrafo
- `{{PHOTOGRAPHER_EMAIL}}` - Email do fotógrafo
- `{{PHOTOGRAPHER_PHONE}}` - WhatsApp do fotógrafo
- `{{TEMPLATE_NAME}}` - Nome do template

### **Produtos e Valores**
- `{{SERVICES_LIST}}` - Lista de produtos selecionados
- `{{SUBTOTAL_VALUE}}` - Subtotal dos produtos
- `{{TOTAL_VALUE}}` - Valor total final

### **Forma de Pagamento**
- `{{PAYMENT_METHOD}}` - Nome da forma de pagamento
- `{{DOWN_PAYMENT}}` - Valor/percentual da entrada
- `{{INSTALLMENTS}}` - Detalhes das parcelas
- `{{INSTALLMENTS_COUNT}}` - Número de parcelas
- `{{LAST_INSTALLMENT_DATE}}` - Data da última parcela

### **Ajustes de Preço**
- `{{SEASONAL_ADJUSTMENT}}` - Valor do ajuste sazonal
- `{{GEOGRAPHIC_ADJUSTMENT}}` - Valor do ajuste geográfico
- `{{TRAVEL_FEE}}` - Taxa de deslocamento
- `{{PAYMENT_ADJUSTMENT}}` - Acréscimo da forma de pagamento

### **Cupom**
- `{{COUPON_CODE}}` - Código do cupom
- `{{COUPON_DISCOUNT}}` - Valor do desconto

### **🔥 Evento (Automático)**
- `{{EVENT_DATE}}` - Data do evento (se sazonal ativo)
- `{{EVENT_CITY}}` - Cidade do evento (se geográfico ativo)

---

## 🎯 Campos Personalizados Dinâmicos

### **Como Funciona**

1. Fotógrafo cria campos extras no dashboard
2. Cliente preenche campos no formulário
3. Sistema AUTOMATICAMENTE adiciona seção na mensagem

### **Formato Gerado**

```
📝 *INFORMAÇÕES ADICIONAIS:*
📌 Número de Convidados: 150
📌 Horário Preferido: Tarde
📌 Tema do Evento: Rústico
```

**Sem necessidade de** `campoInserido01`, `campoInserido02` etc - o sistema gera dinamicamente!

---

## 🔗 Links wa.me Gerados

### **Para Cliente → Fotógrafo**
```
https://wa.me/5534999048840?text=Ol%C3%A1%20Jo%C3%A3o...
         ↑                        ↑
    Telefone do              Mensagem
    fotógrafo                encodada
```

### **Para Fotógrafo → Cliente**
```
https://wa.me/5534988776655?text=Ol%C3%A1%20Maria...
         ↑                        ↑
    Telefone do              Mensagem
    cliente                  encodada
```

### **Limpeza Automática de Telefone**

O sistema automaticamente:
- Remove caracteres especiais: `(34) 99904-8840` → `34999048840`
- Adiciona código do país se necessário: `34999048840` → `5534999048840`
- Valida formato antes de gerar link

---

## ✨ Melhorias Implementadas

### **1. Sistema Completamente Automático**

❌ **ANTES**: Fotógrafo tinha que adicionar manualmente campos sazonais/geográficos no template

✅ **AGORA**: Sistema detecta automaticamente se sistemas estão ativos e inclui dados

### **2. Campos Personalizados Dinâmicos**

❌ **ANTES**: Campos extras não apareciam na mensagem

✅ **AGORA**: Todos campos preenchidos aparecem automaticamente

### **3. Lógica Centralizada**

❌ **ANTES**: Lógica duplicada em QuotePage e LeadsManager

✅ **AGORA**: Uma função robusta reutilizável

### **4. Tratamento de Dados Vazios**

❌ **ANTES**: Linhas vazias tipo "Data: " apareciam

✅ **AGORA**: Limpeza automática de linhas incompletas

### **5. Contexto Inteligente**

❌ **ANTES**: Mesma mensagem para ambos contextos

✅ **AGORA**: Mensagem otimizada conforme quem envia/recebe

---

## 🧪 Testes Recomendados

### **Teste 1: Sistema Sazonal**
1. Ativar sistema sazonal no dashboard
2. Cadastrar temporadas (ex: Alta, Baixa)
3. Criar orçamento público escolhendo data
4. Verificar que data aparece na mensagem WhatsApp
5. Verificar que ajuste sazonal (se houver) é exibido

### **Teste 2: Sistema Geográfico**
1. Ativar sistema geográfico no dashboard
2. Cadastrar cidades com ajustes
3. Criar orçamento público escolhendo cidade
4. Verificar que cidade aparece na mensagem
5. Verificar que ajustes geográficos são exibidos

### **Teste 3: Campos Personalizados**
1. Criar 3 campos extras no dashboard
2. Tornar 2 obrigatórios
3. Preencher formulário público
4. Verificar que campos aparecem em seção separada
5. Verificar formatação com emoji 📌

### **Teste 4: Follow-up**
1. Acessar dashboard → Leads
2. Clicar em "Enviar WhatsApp" em um lead
3. Verificar que mensagem está completa
4. Verificar que vai para número do cliente
5. Verificar dados do evento se disponíveis

### **Teste 5: Template Personalizado**
1. Editar template WhatsApp no dashboard
2. Usar variáveis: `{{CLIENT_NAME}}`, `{{EVENT_DATE}}`, etc
3. Criar orçamento
4. Verificar que variáveis foram substituídas
5. Verificar que seções automáticas foram adicionadas

---

## 🚀 Performance e Otimização

### **Encoding Otimizado**
- Usa `encodeURIComponent()` nativo
- Preserva emojis UTF-8 corretamente
- Compatível com todos navegadores

### **Cache-busting**
- Timestamp único em cada link
- Evita problemas de cache

### **Validação Robusta**
- Valida telefones antes de gerar links
- Limpa campos vazios automaticamente
- Tratamento de erros em tempo real

---

## 📚 Stack Técnica

```
React/TypeScript (Frontend)
         ↓
generateWhatsAppMessage() (Lógica)
         ↓
Supabase PostgreSQL (Dados)
         ↓
WhatsApp API (wa.me)
```

---

## ✅ Status Final

✅ **Sistema Sazonal**: Automático e funcional
✅ **Sistema Geográfico**: Automático e funcional
✅ **Campos Personalizados**: Dinâmicos e automáticos
✅ **Templates**: Suporte completo a variáveis
✅ **Follow-up**: Integrado e otimizado
✅ **Links wa.me**: Geração robusta
✅ **Build**: Sucesso (505.37 kB)

---

## 🎓 Exemplo de Uso no Código

### **QuotePage (Cliente → Fotógrafo)**

```typescript
const whatsappMessage = generateWhatsAppMessage({
  clientName: formData.nome_cliente,
  clientEmail: formData.email_cliente,
  clientPhone: formData.telefone_cliente,
  profile: profile,
  template: template,
  products: produtos,
  selectedProducts: selectedProdutos,
  paymentMethod: formaPagamento,
  priceBreakdown: getPriceBreakdown(),
  eventDate: dataEvento,              // 🔥 Automático
  eventCity: cidadeNome,               // 🔥 Automático
  customFields: camposExtras,          // 🔥 Automático
  customFieldsData: camposExtrasData,  // 🔥 Automático
  context: 'client-to-photographer',
});

const waLink = generateWaLinkToPhotographer(
  profile.whatsapp_principal,
  whatsappMessage
);

window.open(waLink, '_blank');
```

---

**Documentação criada em:** 01/11/2024
**Versão do Sistema:** 2.0.0
**Autor:** Sistema de Orçamentos para Fotógrafos
