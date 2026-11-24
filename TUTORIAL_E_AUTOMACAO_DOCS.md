# Documentação: Tutorial Interativo e Automação de Variáveis Dinâmicas

## Sistemas Implementados

Este documento descreve dois sistemas integrados desenvolvidos para melhorar a experiência do usuário ao configurar orçamentos.

---

## 1. SISTEMA DE TUTORIAL INTERATIVO

### Visão Geral
Sistema de tutorial passo-a-passo que guia novos usuários através de todas as etapas de configuração de orçamentos.

### Localização
- **Componente:** `src/components/TutorialGuide.tsx`
- **Hook:** Integrado no `src/components/TemplateEditor.tsx`

### Características Principais

#### 1.1 Navegação Sequencial
- **9 etapas numeradas** cobrindo todas as abas do criador
- Botões "Anterior" e "Próximo" para navegação linear
- Navegação rápida com botões de salto direto para qualquer etapa
- Indicador de progresso visual (barra de progresso)

#### 1.2 Conteúdo das Etapas

**Etapa 0 - Introdução**
- Apresentação geral do sistema
- Visão geral das 6 etapas principais
- Expectativas e objetivos
- Placeholder para vídeo tutorial

**Etapa 1 - Produtos e Serviços**
- Como adicionar produtos/serviços
- Configuração de imagens
- Produtos obrigatórios vs opcionais
- Reordenação por drag & drop
- Placeholder para vídeo tutorial

**Etapa 2 - Formas de Pagamento**
- Configuração de entrada (percentual vs fixo)
- Parcelamento (1 a 24x)
- Descontos e acréscimos
- Entrada de 100% para pagamento à vista
- Placeholder para vídeo tutorial

**Etapa 3 - Cupons de Desconto**
- Criação de cupons promocionais
- Tipos: percentual vs valor fixo
- Validade e expiração
- Ativação/desativação

**Etapa 4 - Campos Personalizados**
- Tipos de campos disponíveis
- Campos obrigatórios
- **Geração automática de variáveis dinâmicas**
- Uso no WhatsApp

**Etapa 5 - Mensagem WhatsApp**
- Personalização do template
- Variáveis padrão e dinâmicas
- Preview em tempo real
- Placeholder para vídeo tutorial

**Etapa 6 - Preços Sazonais e Geográficos**
- Configuração de precificação avançada
- Ajustes por período
- Ajustes por localização

**Etapa 7 - Configurações Finais**
- Revisão completa
- Ativação do template
- Checklist final

**Etapa 8 - Conclusão**
- Parabéns e próximos passos
- Como compartilhar o orçamento
- Monitoramento de leads

#### 1.3 Elementos Visuais

**Barra de Progresso**
```
[████████████░░░░░░░] 60%
```
- Atualização em tempo real
- Transição suave

**Ícones por Aba**
- Produtos: 🛒 ShoppingCart
- Pagamentos: 💳 CreditCard
- Cupons: 🎟️ Ticket
- Campos: 📄 FileText
- WhatsApp: 💬 MessageSquare
- Preços: 📍 MapPin
- Config: ✅ CheckCircle

**Placeholders de Vídeo**
- Ícone Play
- Mensagem "Em breve: tutorial em vídeo desta etapa"
- Design responsivo para futura integração

#### 1.4 Sistema de Dicas e Avisos

**Dicas (azul):**
```
✓ Use nomes claros e descritivos
✓ Adicione imagens para atratividade
✓ Configure pelo menos 1 forma de pagamento
```

**Avisos (amarelo):**
```
⚠ Certifique-se de ter pelo menos 1 produto
⚠ Entrada de 100% representa pagamento à vista
⚠ Variáveis geradas: {{campoInserido01}}, {{campoInserido02}}
```

#### 1.5 Integração com o Sistema

**Botão de Acesso:**
- Localizado no header do TemplateEditor
- Ícone: BookOpen
- Texto: "Tutorial Interativo"
- Cor: Azul (destaque)

**Sincronização de Navegação:**
- Ao avançar no tutorial, a aba correspondente é ativada
- Navegação bidirecional entre tutorial e abas

### Código de Exemplo

```tsx
import { TutorialGuide } from './TutorialGuide';

// No componente
const [showTutorial, setShowTutorial] = useState(false);

// Botão para abrir
<button onClick={() => setShowTutorial(true)}>
  Tutorial Interativo
</button>

// Modal
{showTutorial && (
  <TutorialGuide
    onClose={() => setShowTutorial(false)}
    onNavigateToTab={(tab) => setActiveTab(tab)}
    currentTab={activeTab}
  />
)}
```

---

## 2. SISTEMA DE AUTOMAÇÃO DE VARIÁVEIS DINÂMICAS

### Visão Geral
Sistema que detecta automaticamente campos personalizados criados pelo usuário e gera variáveis dinâmicas para uso no template WhatsApp.

### Localização
- **Hook:** `src/hooks/useDynamicFields.ts`
- **Integração:** `src/components/WhatsAppTemplateEditor.tsx`

### Características Principais

#### 2.1 Detecção Automática
- Monitora campos adicionados na aba "Campos Personalizados"
- Atualização em tempo real sem intervenção manual
- Sincronização automática com o template WhatsApp

#### 2.2 Nomenclatura Padronizada

**Formato das Variáveis:**
```
{{campoInserido01}}
{{campoInserido02}}
{{campoInserido03}}
...
{{campoInserido99}}
```

**Regras:**
- Numeração sequencial com zero à esquerda (01, 02, ...)
- Ordenação baseada no campo `ordem` do banco de dados
- Variável única por campo personalizado

#### 2.3 Variáveis Padrão do Sistema

**Lista Completa:**
```typescript
{{nome}}      // Nome do Cliente
{{email}}     // E-mail
{{telefone}}  // Telefone
{{endereco}}  // Endereço
{{cidade}}    // Cidade
```

#### 2.4 Funcionalidades do Hook `useDynamicFields`

**Funções Disponíveis:**

```typescript
// 1. Gera lista de variáveis dinâmicas
const dynamicVariables = useDynamicFields(camposExtras);
// Retorna: [{ variable, label, description }, ...]

// 2. Gera texto formatado para WhatsApp
const generateWhatsAppFieldsText
// Retorna: "\n\nCPF: {{campoInserido01}}\nData: {{campoInserido02}}"

// 3. Valida variáveis no texto
const hasValidVariables(text: string): boolean

// 4. Extrai variáveis usadas
const extractUsedVariables(text: string): string[]

// 5. Sincroniza template com campos
const syncTemplateWithFields(currentTemplate: string): string

// 6. Cria mapa de substituição
const getVariableMap(formData: Record<string, any>): Record<string, string>

// 7. Substitui variáveis por valores reais
const replaceVariables(text: string, formData: Record<string, any>): string
```

#### 2.5 Interface Visual no WhatsApp Editor

**Seção: Variáveis Padrão**
- Lista todas as variáveis do sistema
- Botão de cópia para cada variável
- Descrição explicativa

**Seção: Variáveis dos Campos Personalizados** (verde)
- Geradas automaticamente
- Ícone de informação com tooltip explicativo
- Contador de campos: "X campos personalizados"
- Badge: "Automático: Essas variáveis foram geradas automaticamente"

**Estado Vazio:**
```
💡 Dica: Adicione campos personalizados na aba "Campos Personalizados"
para gerar variáveis dinâmicas automaticamente!
```

### Fluxo de Funcionamento

#### 2.6 Exemplo Completo

**Passo 1: Usuário adiciona campos na aba "Campos Personalizados"**
```
Campo 1: "CPF" (tipo: text)
Campo 2: "Data do Evento" (tipo: date)
Campo 3: "Número de Convidados" (tipo: number)
```

**Passo 2: Sistema gera automaticamente as variáveis**
```
{{campoInserido01}} -> CPF
{{campoInserido02}} -> Data do Evento
{{campoInserido03}} -> Número de Convidados
```

**Passo 3: Variáveis aparecem no WhatsApp Editor**
```tsx
<div className="bg-green-50 border border-green-200">
  <button onClick={() => copy('{{campoInserido01}}')}>
    {{campoInserido01}}
    <p>Valor do campo: CPF</p>
  </button>
  ...
</div>
```

**Passo 4: Usuário usa no template**
```
Olá {{nome}}!

Dados do Evento:
📅 Data: {{campoInserido02}}
👥 Convidados: {{campoInserido03}}

Documentação:
📄 CPF: {{campoInserido01}}

Aguardo retorno!
```

**Passo 5: Cliente preenche o formulário**
```
Nome: "João Silva"
CPF: "123.456.789-00"
Data do Evento: "15/12/2025"
Número de Convidados: "150"
```

**Passo 6: Sistema substitui as variáveis**
```
Olá João Silva!

Dados do Evento:
📅 Data: 15/12/2025
👥 Convidados: 150

Documentação:
📄 CPF: 123.456.789-00

Aguardo retorno!
```

### Código de Exemplo

#### Uso do Hook

```tsx
import { useDynamicFields } from '../hooks/useDynamicFields';

function WhatsAppTemplateEditor({ camposExtras }) {
  const {
    dynamicVariables,
    generateWhatsAppFieldsText,
    replaceVariables
  } = useDynamicFields(camposExtras);

  return (
    <div>
      {/* Lista de variáveis dinâmicas */}
      {dynamicVariables.map(v => (
        <div key={v.variable}>
          <code>{v.variable}</code>
          <p>{v.description}</p>
        </div>
      ))}

      {/* Preview com dados */}
      <div>{replaceVariables(template, formData)}</div>
    </div>
  );
}
```

---

## 3. ALTERAÇÃO DE INTERFACE

### Mudança Implementada

**Localização:** `src/components/WhatsAppTemplateEditor.tsx`

**Alteração:**
```diff
- Personalize a mensagem que será enviada para o cliente
+ Personalize a mensagem que será enviada para seu whatsapp
```

**Razão da Mudança:**
- Clarificar que a mensagem vai para o WhatsApp do fornecedor (você)
- Não é uma mensagem enviada AO cliente, mas uma solicitação enviada PELO cliente

---

## 4. BENEFÍCIOS DOS SISTEMAS

### Tutorial Interativo
✅ **Reduz curva de aprendizado** para novos usuários
✅ **Diminui erros de configuração** com dicas contextuais
✅ **Aumenta taxa de conclusão** com guia passo-a-passo
✅ **Preparado para vídeos** (placeholders implementados)
✅ **Navegação intuitiva** com sincronização de abas

### Automação de Variáveis
✅ **Zero configuração manual** - totalmente automático
✅ **Nomenclatura consistente** e previsível
✅ **Atualização em tempo real** ao adicionar campos
✅ **Reduz erros de digitação** - copiar e colar
✅ **Escalável** - suporta quantos campos forem necessários

---

## 5. TECNOLOGIAS UTILIZADAS

- **React** (Hooks: useState, useEffect, useMemo)
- **TypeScript** (tipagem forte e interfaces)
- **Lucide React** (ícones)
- **Tailwind CSS** (estilização)
- **Supabase** (persistência - já existente)

---

## 6. TESTES E VALIDAÇÃO

### Build Status
```bash
✓ Build completo em 5.25s
✓ Sem erros de TypeScript
✓ Sem erros de compilação
✓ Pronto para produção
```

### Checklist de Validação

**Tutorial Interativo:**
- [x] Todas as 9 etapas implementadas
- [x] Navegação anterior/próxima funcional
- [x] Barra de progresso atualiza corretamente
- [x] Ícones aparecem corretamente
- [x] Dicas e avisos bem formatados
- [x] Placeholders de vídeo implementados
- [x] Sincronização com abas funcional
- [x] Botão de acesso no header

**Automação de Variáveis:**
- [x] Detecção automática de campos
- [x] Numeração sequencial correta
- [x] Variáveis aparecem no editor
- [x] Cópia para clipboard funcional
- [x] Preview com substituição funciona
- [x] Estado vazio com dica
- [x] Tooltip informativo

**Interface WhatsApp:**
- [x] Texto alterado conforme solicitado
- [x] Variáveis padrão listadas
- [x] Variáveis dinâmicas listadas
- [x] Cores diferenciadas (azul padrão / verde dinâmico)

---

## 7. MANUTENÇÃO E EXTENSIBILIDADE

### Adicionar Nova Etapa ao Tutorial

```typescript
// Em TutorialGuide.tsx
const TUTORIAL_STEPS: TutorialStep[] = [
  // ... etapas existentes
  {
    id: 9,
    tab: 'nova_aba',
    title: 'Passo 9: Nova Funcionalidade',
    description: 'Descrição da nova funcionalidade...',
    tips: ['Dica 1', 'Dica 2'],
    warnings: ['Aviso importante'],
    videoPlaceholder: true
  }
];
```

### Adicionar Nova Variável Padrão

```typescript
// Em useDynamicFields.ts
export const STANDARD_VARIABLES = [
  // ... variáveis existentes
  {
    variable: '{{nova_variavel}}',
    label: 'Nova Variável',
    description: 'Descrição da nova variável'
  }
];
```

### Customizar Nomenclatura de Variáveis Dinâmicas

```typescript
// Em useDynamicFields.ts
const dynamicVariables = useMemo<DynamicFieldVariable[]>(() => {
  return camposExtras
    .sort((a, b) => a.ordem - b.ordem)
    .map((campo, index) => {
      const numero = String(index + 1).padStart(2, '0');
      return {
        // Alterar aqui para mudar o formato
        variable: `{{customField${numero}}}`, // ou qualquer outro formato
        label: campo.label,
        description: `Valor do campo: ${campo.label}`
      };
    });
}, [camposExtras]);
```

---

## 8. ESTRUTURA DE ARQUIVOS

```
src/
├── components/
│   ├── TutorialGuide.tsx              # Tutorial interativo
│   ├── TemplateEditor.tsx             # Integração do tutorial
│   └── WhatsAppTemplateEditor.tsx     # Editor com variáveis dinâmicas
├── hooks/
│   └── useDynamicFields.ts            # Lógica de automação
└── docs/
    └── TUTORIAL_E_AUTOMACAO_DOCS.md   # Esta documentação
```

---

## 9. ROADMAP FUTURO

### Tutorial
- [ ] Integração de vídeos nos placeholders
- [ ] Sistema de conquistas/badges
- [ ] Persistência do progresso no localStorage
- [ ] Modo "tour guiado" automático
- [ ] Diferentes idiomas

### Variáveis Dinâmicas
- [ ] Editor visual de variáveis (arrastar e soltar)
- [ ] Preview em tempo real no próprio editor
- [ ] Validação de variáveis não utilizadas
- [ ] Sugestões inteligentes de variáveis
- [ ] Formatação condicional de variáveis

---

## 10. SUPORTE E AJUDA

Para questões sobre implementação:
1. Consulte esta documentação
2. Verifique os comentários no código
3. Teste localmente com `npm run dev`
4. Execute build com `npm run build`

---

**Última atualização:** 31/10/2025
**Versão:** 1.0.0
**Status:** ✅ Produção Ready
